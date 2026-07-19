// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ExplainerDocument, Scene } from '@bingoo.ai/explainer-core'
import { KernelError } from '@bingoo.ai/explainer-kernel'
import {
  documentOp,
  optionalString,
  requireString,
  type EditOp,
  type OpRegistry,
  type OpResult,
} from '../op.js'

/**
 * Scene-level operations.
 *
 * Each returns the inverse it computed while it still held the old value. A `moveScene`
 * that returned "move it back to where it was" without capturing the index would be wrong
 * the moment two moves happened before an undo.
 */

export function registerSceneOps(registry: OpRegistry): void {
  registry.register(
    'scene.add',
    documentOp((document, op) => {
      const scene = op['scene'] as Scene
      const at = clampIndex(op['at'], document.scenes.length)

      const scenes = [...document.scenes]
      scenes.splice(at, 0, scene)

      return {
        document: { ...document, scenes },
        inverse: { kind: 'scene.remove', id: scene.id },
      }
    }),
  )

  registry.register(
    'scene.remove',
    documentOp((document, op) => {
      const id = requireString(op, 'id')
      const index = indexOf(document, id)
      const scene = document.scenes[index]!

      return {
        document: { ...document, scenes: document.scenes.filter((_, i) => i !== index) },
        // Carries the scene itself, not a reference to it. An inverse that pointed at the
        // removed scene would be an inverse that could not restore it.
        inverse: { kind: 'scene.add', scene, at: index },
      }
    }),
  )

  registry.register(
    'scene.move',
    documentOp((document, op) => {
      const id = requireString(op, 'id')
      const from = indexOf(document, id)
      const to = clampIndex(op['to'], document.scenes.length - 1)

      const scenes = [...document.scenes]
      const [scene] = scenes.splice(from, 1)
      scenes.splice(to, 0, scene!)

      return {
        document: { ...document, scenes },
        inverse: { kind: 'scene.move', id, to: from },
      }
    }),
  )

  registry.register(
    'scene.setPhase',
    documentOp((document, op) => {
      const id = requireString(op, 'id')
      const index = indexOf(document, id)
      const scene = document.scenes[index]!
      const phase = optionalString(op, 'phase')

      const next = { ...scene }
      if (phase === undefined) delete (next as { phase?: string }).phase
      else next.phase = phase

      return {
        document: { ...document, scenes: replaceAt(document.scenes, index, next) },
        inverse: { kind: 'scene.setPhase', id, ...(scene.phase === undefined ? {} : { phase: scene.phase }) },
      }
    }),
  )

  registry.register(
    'scene.setTemplate',
    documentOp((document, op) => {
      const id = requireString(op, 'id')
      const index = indexOf(document, id)
      const scene = document.scenes[index]!
      const template = requireString(op, 'template')

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            layout: { ...scene.layout, template },
          }),
        },
        inverse: { kind: 'scene.setTemplate', id, template: scene.layout.template },
      }
    }),
  )

  registry.register(
    'scene.setRegions',
    documentOp((document, op) => {
      const id = requireString(op, 'id')
      const index = indexOf(document, id)
      const scene = document.scenes[index]!
      const regions = op['regions'] as Scene['layout']['regions']

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, { ...scene, layout: { ...scene.layout, regions } }),
        },
        inverse: { kind: 'scene.setRegions', id, regions: scene.layout.regions },
      }
    }),
  )

  /**
   * The scene's beats — what happens, and at which cue.
   *
   * Set wholesale rather than one beat at a time. Beats are ordered and refer to each other's
   * cues, so an editor that added one in isolation would need a second operation to fix the
   * order, and a crash between the two would leave a scene whose visuals fire in the wrong
   * sequence. One operation, one valid state.
   */
  registry.register(
    'scene.setBeats',
    documentOp((document, op) => {
      const id = requireString(op, 'id')
      const index = indexOf(document, id)
      const scene = document.scenes[index]!
      const beats = op['beats'] as Scene['beats']

      return {
        document: { ...document, scenes: replaceAt(document.scenes, index, { ...scene, beats }) },
        inverse: { kind: 'scene.setBeats', id, beats: scene.beats },
      }
    }),
  )
}

export function indexOf(document: ExplainerDocument, id: string): number {
  const index = document.scenes.findIndex((scene) => scene.id === id)
  if (index === -1) {
    throw new KernelError('REGISTRY_UNKNOWN_ID', 'No scene has this id.', {
      at: id,
      hint: `Scenes: ${document.scenes.map((s) => s.id).join(', ') || 'none'}.`,
    })
  }
  return index
}

export function replaceAt<T>(items: readonly T[], index: number, next: T): T[] {
  const copy = [...items]
  copy[index] = next
  return copy
}

/** Out-of-range indices clamp rather than throw: a drag that overshoots the end of a list
 *  means "put it last", which is what the person doing the dragging intended. */
function clampIndex(value: unknown, max: number): number {
  const index = typeof value === 'number' ? Math.round(value) : max
  return Math.max(0, Math.min(max, index))
}

export type { EditOp, OpResult }
