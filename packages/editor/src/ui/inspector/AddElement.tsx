// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { EditOp } from '../../op.js'
import type { Element, Scene } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import { useEditor, useStore } from '../context.js'
import { generateId, stringKeyFor } from '../ids.js'
import { useRender } from '../render.js'

/**
 * The palette of things that can be added.
 *
 * Driven by the painter registry, not by a list written here. A kit that registers a
 * `fraction-bar` painter appears in this palette without a line changing, which is the test
 * of whether the extension points are real (R1). A hard-coded palette is how a plugin system
 * ends up half-working: the element renders, but nobody can create one.
 */

export function AddElement({ scene }: { readonly scene: Scene }): JSX.Element {
  const store = useStore()
  const { ui } = useEditor()
  const { painters, templates } = useRender()

  const firstRegion = templates.has(scene.layout.template)
    ? templates.descriptorOf(scene.layout.template).slots[ui.aspect]?.[0]?.name
    : Object.keys(scene.layout.regions)[0]

  const add = (type: string): void => {
    const id = generateId('el')
    const key = stringKeyFor(scene.id, id)
    const region = firstRegion ?? 'stage'

    const element: Element = {
      id,
      type,
      region,
      flow: { order: scene.elements.length, grow: 0, align: 'center' },
      content: { key },
      style: {},
      poses: {},
      // Hidden until a beat reveals it. Everything arriving at once is the thing that makes
      // a generated lesson feel like a slide rather than an explanation.
      startVisible: false,
      z: 0,
    }

    // One batch, so it is one undo. An author who adds an element and presses undo expects
    // the element gone — not the beat gone, then the words, then the element.
    const ops: EditOp[] = [
      { kind: 'element.add', sceneId: scene.id, element },
      { kind: 'text.set', locale: ui.locale, key, text: '' },
      {
        kind: 'scene.setBeats',
        id: scene.id,
        beats: [
          ...scene.beats,
          { id: generateId('beat'), cue: cueFor(scene), actions: [{ verb: 'reveal', target: id }] },
        ],
      },
    ]

    store.batch(ops)
    store.select({ sceneId: scene.id, elementId: id })
  }

  return (
    <>
      <p className="xse-hint">Add to this scene</p>
      <div className="xse-add-grid">
        {painters.list().map((painter) => (
          <button
            key={painter.id}
            type="button"
            className="xse-btn"
            onClick={() => {
              add(painter.id)
            }}
          >
            {painter.label}
          </button>
        ))}
      </div>
    </>
  )
}

/**
 * Which cue a new element hangs off.
 *
 * The last one already in the scene, so a new element arrives after what is there rather
 * than on top of it. A scene with no narration yet gets a named cue that does not exist —
 * which is deliberate: the beat is authored, the quality gate reports the missing marker,
 * and the author writes it into the script where they want the element to land. Inventing a
 * time here would be exactly the fixed timing the design refuses (R5).
 */
function cueFor(scene: Scene): string {
  const last = scene.beats[scene.beats.length - 1]
  return last?.cue ?? `c${String(scene.beats.length + 1)}`
}
