// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Element, Scene } from '@bingoo.ai/explainer-core'
import { KernelError } from '@bingoo.ai/explainer-kernel'
import { documentOp, requireString, type OpRegistry } from '../op.js'
import { indexOf, replaceAt } from './scene.js'

/**
 * Element operations.
 *
 * Adding and removing an element also maintain the scene's region lists, because an element
 * the layout never places is invisible and the document is still valid — the exact silent
 * failure the layout gate reports. An editor that could produce it routinely would make
 * that gate a permanent source of noise.
 */

export function registerElementOps(registry: OpRegistry): void {
  registry.register(
    'element.add',
    documentOp((document, op) => {
      const sceneId = requireString(op, 'sceneId')
      const index = indexOf(document, sceneId)
      const scene = document.scenes[index]!
      const element = op['element'] as Element

      const region = element.region
      const existing = scene.layout.regions[region] ?? []
      const at =
        typeof op['at'] === 'number' ? Math.max(0, Math.min(existing.length, op['at'])) : existing.length
      const members = [...existing]
      members.splice(at, 0, element.id)

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            elements: [...scene.elements, element],
            layout: { ...scene.layout, regions: { ...scene.layout.regions, [region]: members } },
          }),
        },
        inverse: { kind: 'element.remove', sceneId, id: element.id },
      }
    }),
  )

  registry.register(
    'element.remove',
    documentOp((document, op) => {
      const sceneId = requireString(op, 'sceneId')
      const index = indexOf(document, sceneId)
      const scene = document.scenes[index]!
      const element = elementIn(scene, requireString(op, 'id'))

      const regions = Object.fromEntries(
        Object.entries(scene.layout.regions).map(([name, ids]) => [
          name,
          ids.filter((id) => id !== element.id),
        ]),
      )
      const at = (scene.layout.regions[element.region] ?? []).indexOf(element.id)

      // Beats that acted on it go too, and come back with it. Leaving them behind produces a
      // document the lint gate rejects, from an action the author thought was safe.
      const orphaned = scene.beats.map((beat) => ({
        ...beat,
        actions: beat.actions.filter((action) =>
          action.verb === 'sfx'
            ? true
            : action.verb === 'connect'
              ? action.from !== element.id && action.to !== element.id
              : action.target !== element.id,
        ),
      }))

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            elements: scene.elements.filter((e) => e.id !== element.id),
            beats: orphaned,
            layout: { ...scene.layout, regions },
          }),
        },
        inverse: {
          kind: 'element.restore',
          sceneId,
          element,
          at,
          beats: scene.beats,
        },
      }
    }),
  )

  // The inverse of a removal, which has to put the beats back as well — `element.add`
  // alone would restore the element and quietly drop everything that referred to it.
  registry.register(
    'element.restore',
    documentOp((document, op) => {
      const sceneId = requireString(op, 'sceneId')
      const index = indexOf(document, sceneId)
      const scene = document.scenes[index]!
      const element = op['element'] as Element
      const beats = op['beats'] as Scene['beats']

      const existing = scene.layout.regions[element.region] ?? []
      const at =
        typeof op['at'] === 'number' ? Math.max(0, Math.min(existing.length, op['at'])) : existing.length
      const members = [...existing]
      members.splice(at, 0, element.id)

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            elements: [...scene.elements, element],
            beats,
            layout: { ...scene.layout, regions: { ...scene.layout.regions, [element.region]: members } },
          }),
        },
        inverse: { kind: 'element.remove', sceneId, id: element.id },
      }
    }),
  )

  registry.register(
    'element.setContent',
    documentOp((document, op) => {
      const sceneId = requireString(op, 'sceneId')
      const index = indexOf(document, sceneId)
      const scene = document.scenes[index]!
      const element = elementIn(scene, requireString(op, 'id'))

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            elements: scene.elements.map((e) => (e.id === element.id ? { ...e, content: op['content'] } : e)),
          }),
        },
        inverse: { kind: 'element.setContent', sceneId, id: element.id, content: element.content },
      }
    }),
  )

  registry.register(
    'element.setStyle',
    documentOp((document, op) => {
      const sceneId = requireString(op, 'sceneId')
      const index = indexOf(document, sceneId)
      const scene = document.scenes[index]!
      const element = elementIn(scene, requireString(op, 'id'))
      const style = op['style'] as Element['style']

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            elements: scene.elements.map((e) => (e.id === element.id ? { ...e, style } : e)),
          }),
        },
        inverse: { kind: 'element.setStyle', sceneId, id: element.id, style: element.style },
      }
    }),
  )

  /**
   * How an element sits within its region: what order, how much room it takes, how it aligns.
   *
   * This is the whole of positioning (R6). There is no x or y to set — an author says "this
   * comes second and fills the space", and the layout decides where that lands at each
   * aspect. Coordinates would look more direct and would break the moment the lesson was
   * opened on a phone.
   */
  registry.register(
    'element.setFlow',
    documentOp((document, op) => {
      const sceneId = requireString(op, 'sceneId')
      const index = indexOf(document, sceneId)
      const scene = document.scenes[index]!
      const element = elementIn(scene, requireString(op, 'id'))
      const flow = op['flow'] as Element['flow']

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            elements: scene.elements.map((e) => (e.id === element.id ? { ...e, flow } : e)),
          }),
        },
        inverse: { kind: 'element.setFlow', sceneId, id: element.id, flow: element.flow },
      }
    }),
  )

  registry.register(
    'element.move',
    documentOp((document, op) => {
      const sceneId = requireString(op, 'sceneId')
      const index = indexOf(document, sceneId)
      const scene = document.scenes[index]!
      const element = elementIn(scene, requireString(op, 'id'))
      const region = requireString(op, 'region')

      // Where it *actually* sits, taken from the layout rather than from the element's own
      // `region` field.
      //
      // The two can disagree: `element.region` names a region and `layout.regions` lists the
      // members, so a document can say one thing in each place. The layout is what decides
      // where the element is drawn, so it is what a move has to reverse. Trusting the field
      // produces an inverse that returns the element somewhere it never was.
      //
      // The redundancy itself is a format smell worth revisiting — one of the two should go.
      // That is a breaking change to explainer/v1, so it needs an ADR rather than a quiet fix.
      const placed = Object.entries(scene.layout.regions).find(([, ids]) => ids.includes(element.id))
      const from = placed?.[0] ?? element.region
      const at = placed?.[1].indexOf(element.id) ?? 0

      const regions: Record<string, string[]> = Object.fromEntries(
        Object.entries(scene.layout.regions).map(([name, ids]) => [
          name,
          ids.filter((id) => id !== element.id),
        ]),
      )
      regions[region] = [...(regions[region] ?? []), element.id]

      return {
        document: {
          ...document,
          scenes: replaceAt(document.scenes, index, {
            ...scene,
            elements: scene.elements.map((e) => (e.id === element.id ? { ...e, region } : e)),
            layout: { ...scene.layout, regions },
          }),
        },
        inverse: { kind: 'element.move', sceneId, id: element.id, region: from, at },
      }
    }),
  )
}

function elementIn(scene: Scene, id: string): Element {
  const element = scene.elements.find((e) => e.id === id)
  if (!element) {
    throw new KernelError('REGISTRY_UNKNOWN_ID', 'No element in this scene has that id.', {
      at: id,
      hint: `Elements in "${scene.id}": ${scene.elements.map((e) => e.id).join(', ') || 'none'}.`,
    })
  }
  return element
}
