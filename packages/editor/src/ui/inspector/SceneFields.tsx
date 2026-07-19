// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Scene } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import { useEditor, useStore } from '../context.js'
import { SelectField, TextField } from '../fields.js'
import { useRender } from '../render.js'
import { AddElement } from './AddElement.js'

/**
 * Properties of the scene, and the way new things get onto it.
 *
 * The narration lives here rather than in a panel of its own because it is what drives the
 * scene: cue markers written into the script are what visuals hang off, so writing the words
 * and choosing what appears are one job (ARCHITECTURE §1).
 */

export function SceneFields({ scene }: { readonly scene: Scene }): JSX.Element {
  const store = useStore()
  const { templates, program } = useRender()

  const issues = program.issues.find((entry) => entry.sceneId === scene.id)?.issues ?? []

  return (
    <>
      <SelectField
        label="Template"
        value={scene.layout.template}
        choices={templates.ids().map((id) => ({ value: id, label: id }))}
        onChange={(template) => {
          store.dispatch({ kind: 'scene.setTemplate', id: scene.id, template })
        }}
        hint="How the scene divides its space. Elements keep their regions where the new template has them."
      />

      <TextField
        label="Phase"
        value={scene.phase ?? ''}
        placeholder="teach, practice, recap…"
        onChange={(phase) => {
          store.dispatch({ kind: 'scene.setPhase', id: scene.id, phase }, `phase:${scene.id}`)
        }}
        onCommit={() => {
          store.endCoalesce()
        }}
        hint="What this scene is for. The arc check reads it to see whether a lesson explains before it asks."
      />

      {scene.narrations.map((slot) => (
        <NarrationField key={slot.ref} sceneId={scene.id} narrationRef={slot.ref} />
      ))}

      {issues.length > 0 ? (
        <>
          <p className="xse-hint">Layout</p>
          {issues.map((issue, index) => (
            <p key={`${issue.code}-${String(index)}`} className="xse-issue">
              <span aria-hidden>⚠</span>
              <span>
                {issue.message} {issue.fix}
              </span>
            </p>
          ))}
        </>
      ) : null}

      <AddElement scene={scene} />
    </>
  )
}

function NarrationField({
  sceneId,
  narrationRef,
}: {
  readonly sceneId: string
  readonly narrationRef: string
}): JSX.Element {
  const store = useStore()
  const { ui, bundles } = useEditor()
  const narration = bundles[ui.locale]?.narration[narrationRef]

  return (
    <TextField
      label="Narration"
      value={narration?.script ?? ''}
      multiline
      placeholder="What the narrator says. Write [[cue:name]] where a visual should land."
      hint={
        narration?.words.length
          ? 'Voiced. Rewriting the script clears the recording, because its word timings no longer match.'
          : 'Not voiced yet. Timing is estimated from the words until it is.'
      }
      onChange={(script) => {
        store.dispatch(
          { kind: 'narration.setScript', locale: ui.locale, ref: narrationRef, script },
          `narration:${sceneId}:${narrationRef}`,
        )
      }}
      onCommit={() => {
        store.endCoalesce()
      }}
    />
  )
}
