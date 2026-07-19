// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { buildProgram, frame, type Scene } from '@bingoo.ai/explainer-core'
import { Stage } from '@bingoo.ai/explainer-react'
import { memo, useMemo, useRef, useState, type JSX } from 'react'
import { useEditor, useStore } from './context.js'
import { generateId } from './ids.js'
import { useRender } from './render.js'

/**
 * The scene filmstrip.
 *
 * A lesson is built the way slides are: see them all, click one to work on it, drag to
 * reorder. Every thumbnail is a real render of the scene at its final moment — where
 * everything that will appear has appeared — rather than a stored image, so a thumbnail
 * cannot be stale (ARCHITECTURE §1).
 */

export function SceneStrip(): JSX.Element {
  const store = useStore()
  const { document, ui } = useEditor()
  const { templates } = useRender()
  const dragging = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const activeIndex = document.scenes.findIndex((scene) => scene.id === ui.activeSceneId)

  const drop = (to: number): void => {
    const from = dragging.current
    dragging.current = null
    setOver(null)
    if (from === null || from === to) return

    const scene = document.scenes[from]
    if (scene) store.dispatch({ kind: 'scene.move', id: scene.id, to })
  }

  const addScene = (): void => {
    const id = generateId('scene')
    // A blank scene, not a templated one: the author says what it is. It is valid the moment
    // it exists, so the document never passes through a state the gate would reject.
    const scene: Scene = {
      id,
      kind: 'exposition',
      // The scene being worked on, or whatever the deployment registered first — never a
      // template named here. A hard-coded default renders nothing the moment a deployment
      // ships its own set (R1), and the failure looks like a broken editor.
      layout: {
        template: document.scenes[activeIndex]?.layout.template ?? templates.ids()[0] ?? '',
        regions: {},
        overrides: {},
      },
      elements: [],
      beats: [],
      narrations: [],
    }

    store.dispatch({
      kind: 'scene.add',
      scene,
      at: activeIndex < 0 ? document.scenes.length : activeIndex + 1,
    })
    store.select({ sceneId: id })
  }

  const duplicate = (index: number): void => {
    const source = document.scenes[index]
    if (!source) return

    // Fresh ids throughout: elements are referenced by beats and by the layout, so a copy
    // that kept them would have two scenes whose beats fire on each other's elements.
    const clone = withFreshIds(source)
    store.dispatch({ kind: 'scene.add', scene: clone, at: index + 1 })
    store.select({ sceneId: clone.id })
  }

  return (
    <div className="xse-strip" role="list" aria-label="Scenes">
      {document.scenes.map((scene, index) => (
        <div
          key={scene.id}
          role="listitem"
          className={`xse-scene${over === index && dragging.current !== index ? ' is-over' : ''}`}
          aria-current={scene.id === ui.activeSceneId}
          draggable
          onDragStart={(event) => {
            dragging.current = index
            event.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            if (over !== index) setOver(index)
          }}
          onDragLeave={() => {
            setOver((current) => (current === index ? null : current))
          }}
          onDrop={(event) => {
            event.preventDefault()
            drop(index)
          }}
          onDragEnd={() => {
            dragging.current = null
            setOver(null)
          }}
        >
          <button
            type="button"
            className="xse-scene-thumb"
            onClick={() => {
              store.select({ sceneId: scene.id })
            }}
            title={`Scene ${index + 1}`}
          >
            <SceneThumb scene={scene} />
          </button>

          <div className="xse-scene-ops">
            <button
              type="button"
              title="Move left"
              disabled={index === 0}
              onClick={() => {
                store.dispatch({ kind: 'scene.move', id: scene.id, to: index - 1 })
              }}
            >
              ‹
            </button>
            <button
              type="button"
              title="Duplicate"
              onClick={() => {
                duplicate(index)
              }}
            >
              ⧉
            </button>
            <button
              type="button"
              title="Delete"
              disabled={document.scenes.length <= 1}
              onClick={() => {
                store.dispatch({ kind: 'scene.remove', id: scene.id })
              }}
            >
              ✕
            </button>
            <button
              type="button"
              title="Move right"
              disabled={index === document.scenes.length - 1}
              onClick={() => {
                store.dispatch({ kind: 'scene.move', id: scene.id, to: index + 1 })
              }}
            >
              ›
            </button>
          </div>

          <div className="xse-scene-foot">
            <span className="xse-scene-no">{index + 1}</span>
            <span className="xse-scene-name">{scene.phase ?? scene.layout.template}</span>
            {scene.gate ? <span className="xse-scene-badge is-gate">ask</span> : null}
          </div>
        </div>
      ))}

      <button type="button" className="xse-scene-add" onClick={addScene} title="Add a scene">
        <span aria-hidden>＋</span>
        <span>Scene</span>
      </button>
    </div>
  )
}

/**
 * One scene, rendered alone.
 *
 * Built as a one-scene program so the thumbnail shows scene-local time — a scene late in a
 * lesson is at `t=0` of its own program, not at minute four of the whole one.
 *
 * Memoised on the scene: a strip of twenty scenes re-rendering on every playhead tick is
 * the difference between an editor that feels immediate and one that stutters while typing.
 */
const SceneThumb = memo(function SceneThumb({ scene }: { readonly scene: Scene }): JSX.Element {
  const { profiles, painters, theme, templates, emphasis, bundle } = useRender()
  const { document } = useEditor()

  const model = useMemo(() => {
    const program = buildProgram({ ...document, scenes: [scene] }, bundle, {
      profiles,
      templates,
      emphasis,
      aspect: '16:9',
    })
    // A hair before the end: everything has arrived, nothing has been cut off by the
    // boundary. At exactly `duration` a scene with an exit has already played it.
    return frame(program, Math.max(0, program.duration - 0.05))
  }, [document, scene, bundle, profiles, templates, emphasis])

  return (
    <Stage
      model={model}
      painters={painters}
      profiles={profiles}
      theme={theme}
      captions={false}
      backdrop="paper"
    />
  )
})

function withFreshIds(scene: Scene): Scene {
  const id = generateId('scene')
  const remap = new Map(scene.elements.map((element) => [element.id, generateId('el')] as const))
  const to = (old: string): string => remap.get(old) ?? old

  return {
    ...scene,
    id,
    elements: scene.elements.map((element) => ({ ...element, id: to(element.id) })),
    layout: {
      ...scene.layout,
      regions: Object.fromEntries(
        Object.entries(scene.layout.regions).map(([region, ids]) => [region, ids.map(to)]),
      ),
    },
    beats: scene.beats.map((beat) => ({
      ...beat,
      id: generateId('beat'),
      actions: beat.actions.map((action) =>
        'target' in action
          ? { ...action, target: to(action.target) }
          : action.verb === 'connect'
            ? { ...action, from: to(action.from), to: to(action.to) }
            : action,
      ),
    })),
  }
}
