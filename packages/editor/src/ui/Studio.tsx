// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ExplainerDocument, LocaleBundle } from '@bingoo.ai/explainer-core'
import { useEffect, useMemo, type JSX } from 'react'
import { createEditor } from '../ops.js'
import type { OpRegistry } from '../op.js'
import { EditableStage } from './EditableStage.js'
import { Inspector } from './Inspector.js'
import { SceneStrip } from './SceneStrip.js'
import { TopBar, type SaveState } from './TopBar.js'
import { TrackTimeline } from './TrackTimeline.js'
import { EditorProvider, useEditor } from './context.js'
import { RenderProvider, type StudioRegistries } from './render.js'
import { createEditorStore } from './store.js'
import { ensureEditorStyles } from './styles.js'
import { useScenePlayback } from './useScenePlayback.js'

/**
 * The studio: a filmstrip of scenes, the stage, an inspector, and a timeline of what happens
 * when.
 *
 * The arrangement is the one every editing tool has converged on, and it is worth being
 * unoriginal about: a teacher who has used slides or a video editor should not have to learn
 * where anything is.
 *
 * Persistence belongs to the host. `onChange` fires on every edit with the whole workspace;
 * where that goes — localStorage, a database, a file — is not this component's business
 * (R8). It runs with no network at all (R9).
 */

export interface ExplainerStudioProps {
  readonly document: ExplainerDocument
  readonly bundles: Readonly<Record<string, LocaleBundle>>
  /** Fires on every edit. Debounce on the host side before writing anywhere. */
  readonly onChange?: (document: ExplainerDocument, bundles: Readonly<Record<string, LocaleBundle>>) => void
  readonly onSave?: () => void
  readonly saveState?: SaveState
  /** Registries to extend the editor: painters, templates, themes (R1). */
  readonly registries?: StudioRegistries
  /** Operations to extend it with. Defaults to the built-in set. */
  readonly registry?: OpRegistry
  readonly locale?: string
  readonly aspect?: string
  /** Host actions in the top bar — preview, export, publish. */
  readonly actions?: JSX.Element
}

export function ExplainerStudio({
  document,
  bundles,
  onChange,
  onSave,
  saveState,
  registries = {},
  registry,
  locale,
  aspect,
  actions,
}: ExplainerStudioProps): JSX.Element {
  ensureEditorStyles()

  const store = useMemo(
    () =>
      createEditorStore({
        registry: registry ?? createEditor(),
        document,
        bundles,
        ...(locale === undefined ? {} : { locale }),
        ...(aspect === undefined ? {} : { aspect }),
      }),
    // Keyed on the operation registry alone. The document is the store's *initial* state,
    // not a prop it tracks: rebuilding on every edit would throw the history away on the
    // first keystroke. A host swapping lessons should remount with a `key`.
    [registry],
  )

  useEffect(() => {
    if (!onChange) return

    return store.subscribe(() => {
      const snapshot = store.getSnapshot()
      onChange(snapshot.document, snapshot.bundles)
    })
  }, [store, onChange])

  return (
    <EditorProvider store={store}>
      <RenderProvider registries={registries}>
        <StudioShell
          {...(saveState === undefined ? {} : { saveState })}
          {...(onSave === undefined ? {} : { onSave })}
          {...(actions === undefined ? {} : { actions })}
        />
      </RenderProvider>
    </EditorProvider>
  )
}

function StudioShell({
  saveState,
  onSave,
  actions,
}: {
  readonly saveState?: SaveState
  readonly onSave?: () => void
  readonly actions?: JSX.Element
}): JSX.Element {
  const playback = useScenePlayback()

  return (
    <div className="xse-root">
      <TopBar
        {...(saveState === undefined ? {} : { saveState })}
        {...(onSave === undefined ? {} : { onSave })}
        {...(actions === undefined ? {} : { actions })}
      />

      <div className="xse-main">
        <SceneList />

        <div className="xse-stagecol">
          <div className="xse-stagewrap">
            <EditableStage t={playback.t} />
          </div>

          <div className="xse-transport">
            <button
              type="button"
              className="xse-btn is-primary is-icon"
              onClick={playback.toggle}
              aria-label={playback.playing ? 'Pause' : 'Play'}
            >
              {playback.playing ? '❚❚' : '▶'}
            </button>
            <button
              type="button"
              className="xse-btn is-ghost is-icon"
              onClick={playback.stop}
              aria-label="Back to start"
            >
              ↺
            </button>
            <span className="xse-time">
              {timecode(playback.t)} / {timecode(playback.duration)}
            </span>
          </div>
        </div>

        <Inspector />
      </div>

      <SceneStrip />
      <TrackTimeline t={playback.t} onSeek={playback.seek} />
    </div>
  )
}

/**
 * The left rail: the lesson's scenes as a list, alongside the filmstrip below.
 *
 * A list as well as a strip because they answer different questions — the strip shows what
 * each scene *looks* like, the list shows how the lesson is *structured*, and a teacher
 * checking that they explain before they ask is reading the second one.
 */
function SceneList(): JSX.Element {
  const { document, ui } = useEditor()

  return (
    <nav className="xse-panel" aria-label="Lesson outline">
      <div className="xse-panel-head">Outline</div>
      <div className="xse-panel-body">
        {document.scenes.map((scene, index) => (
          <p key={scene.id} className="xse-hint" style={{ opacity: scene.id === ui.activeSceneId ? 1 : 0.6 }}>
            {index + 1}. {scene.phase ?? scene.kind}
            {scene.gate ? ' · asks' : ''}
          </p>
        ))}
      </div>
    </nav>
  )
}

function timecode(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  const hundredths = Math.floor((seconds % 1) * 100)

  return `${String(minutes)}:${String(rest).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
}
