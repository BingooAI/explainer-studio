// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { LayoutProfile } from '../profiles/schema.js'
import type { Element, Scene } from '../schema/document.js'
import type { TemplateRegistry } from './template.js'
import type { SlotDefinition } from './template.js'

/**
 * `resolveLayout(scene, aspect)` turns a scene into rectangles.
 *
 * It is pure and runs headless, which is what lets it serve two jobs at once: the renderer
 * asks it where to paint, and the quality gate asks it the same question to find out
 * whether the content fits. Those must be the same computation, or the gate approves
 * layouts the renderer then breaks.
 *
 * It reports problems rather than throwing. A model producing a scene that references a
 * missing region is ordinary during generation, and every issue becomes a repair
 * instruction — so losing all but the first would make repair guesswork.
 */

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PlacedElement {
  readonly id: string
  /** The space this element was allotted, in canvas pixels. */
  readonly rect: Rect
  readonly slot: string
  /** Carried through for the painter: layout allots space, it cannot know intrinsic size. */
  readonly align: Element['flow']['align']
  readonly z: number
}

export type LayoutIssueCode =
  | 'UNKNOWN_TEMPLATE'
  | 'UNSUPPORTED_ASPECT'
  | 'UNKNOWN_REGION'
  | 'UNPLACED_ELEMENT'
  | 'MISSING_ELEMENT'
  | 'SLOT_TOO_SMALL'

export interface LayoutIssue {
  readonly code: LayoutIssueCode
  /** Scene-relative location: an element id, a region name, a template id. */
  readonly at: string
  readonly message: string
  /** A mechanical instruction, so repair is deterministic rather than a vague retry. */
  readonly fix: string
}

export interface ResolvedLayout {
  readonly aspect: string
  readonly canvas: { readonly width: number; readonly height: number }
  readonly slots: Readonly<Record<string, Rect>>
  readonly placements: readonly PlacedElement[]
  readonly issues: readonly LayoutIssue[]
}

export interface ResolveLayoutOptions {
  readonly templates: TemplateRegistry
  readonly layout: LayoutProfile
}

export function resolveLayout(scene: Scene, aspect: string, options: ResolveLayoutOptions): ResolvedLayout {
  const { templates, layout } = options
  const canvas = layout.canvas[aspect]

  if (!canvas) {
    return failed(aspect, {
      code: 'UNSUPPORTED_ASPECT',
      at: aspect,
      message: `The layout profile defines no canvas for "${aspect}".`,
      fix: `Add "${aspect}" to the layout profile's canvas, or render a defined aspect: ${Object.keys(layout.canvas).join(', ') || 'none are defined'}.`,
    })
  }

  if (!templates.has(scene.layout.template)) {
    return failed(aspect, {
      code: 'UNKNOWN_TEMPLATE',
      at: scene.layout.template,
      message: `No layout template is registered as "${scene.layout.template}".`,
      fix: `Use one of: ${templates.ids().join(', ') || 'none are registered'}.`,
    })
  }

  const template = templates.get(scene.layout.template)
  const definitions = template.slots[aspect]

  if (!definitions) {
    return failed(aspect, {
      code: 'UNSUPPORTED_ASPECT',
      at: `${template.id}/${aspect}`,
      message: `The template "${template.id}" defines no slots for "${aspect}".`,
      fix: `Add a "${aspect}" entry to the template, or use a template that has one: ${Object.keys(template.slots).join(', ')}.`,
    })
  }

  const issues: LayoutIssue[] = []
  const slots: Record<string, Rect> = {}
  for (const definition of definitions) {
    slots[definition.name] = toPixels(definition, canvas)
  }

  const byId = new Map(scene.elements.map((element) => [element.id, element]))
  // Per-aspect overrides exist for the rare scene that needs a different portrait shape;
  // absent one, the same region map serves both.
  const regions = scene.layout.overrides[aspect] ?? scene.layout.regions

  const placements: PlacedElement[] = []
  const placed = new Set<string>()

  for (const [regionName, ids] of Object.entries(regions)) {
    const definition = definitions.find((d) => d.name === regionName)
    if (!definition) {
      issues.push({
        code: 'UNKNOWN_REGION',
        at: regionName,
        message: `The template "${template.id}" has no region called "${regionName}" in ${aspect}.`,
        fix: `Move these elements to one of: ${definitions.map((d) => d.name).join(', ')}.`,
      })
      continue
    }

    const members: Element[] = []
    for (const id of ids) {
      const element = byId.get(id)
      if (!element) {
        issues.push({
          code: 'MISSING_ELEMENT',
          at: id,
          message: `Region "${regionName}" lists "${id}", which the scene does not define.`,
          fix: `Add an element with id "${id}", or remove it from the region.`,
        })
        continue
      }
      members.push(element)
      placed.add(id)
    }

    const slotRect = slots[regionName]!
    placements.push(...flow(members, definition, slotRect, layout))

    const smallest = smallestSide(slotRect, members.length, definition)
    if (members.length > 0 && smallest < MIN_USABLE_PX) {
      issues.push({
        code: 'SLOT_TOO_SMALL',
        at: regionName,
        message: `Region "${regionName}" gives each of its ${members.length} elements under ${MIN_USABLE_PX}px.`,
        fix: `Move ${members.length - 1} element(s) to another region, or split this across two scenes.`,
      })
    }
  }

  // An element the layout never places is invisible, and silently so — the most expensive
  // kind of mistake to notice, because the lesson still plays.
  for (const element of scene.elements) {
    if (!placed.has(element.id)) {
      issues.push({
        code: 'UNPLACED_ELEMENT',
        at: element.id,
        message: `"${element.id}" belongs to region "${element.region}", which does not list it.`,
        fix: `Add "${element.id}" to the "${element.region}" region, or remove the element.`,
      })
    }
  }

  return { aspect, canvas, slots, placements, issues }
}

/**
 * Below this, an element has no usable space no matter what it contains. It is a floor, not
 * a fit check — whether specific text fits is a question for the type profile and the
 * quality gate, which know the rung and the character count.
 */
const MIN_USABLE_PX = 48

function flow(
  members: readonly Element[],
  definition: SlotDefinition,
  slot: Rect,
  profile: LayoutProfile,
): PlacedElement[] {
  if (members.length === 0) return []

  const inner = pad(slot, profile.slotPadding)
  const ordered = [...members].sort((a, b) => a.flow.order - b.flow.order || a.id.localeCompare(b.id))

  const horizontal = definition.direction === 'row'
  const mainLength = horizontal ? inner.width : inner.height
  const gap = definition.gap * mainLength
  const available = Math.max(0, mainLength - gap * (ordered.length - 1))

  // Weight rather than a fixed share, so `grow` means "take more of the slack" without
  // needing a second sizing concept. A row of equal elements is the default.
  const weights = ordered.map((element) => 1 + element.flow.grow)
  const total = weights.reduce((sum, w) => sum + w, 0)

  const placements: PlacedElement[] = []
  let cursor = 0

  ordered.forEach((element, index) => {
    const share = (weights[index]! / total) * available
    const rect: Rect = horizontal
      ? { x: inner.x + cursor, y: inner.y, width: share, height: inner.height }
      : { x: inner.x, y: inner.y + cursor, width: inner.width, height: share }

    placements.push({
      id: element.id,
      rect,
      slot: definition.name,
      align: element.flow.align,
      z: element.z,
    })

    cursor += share + gap
  })

  return placements
}

function toPixels(definition: SlotDefinition, canvas: { width: number; height: number }): Rect {
  return {
    x: definition.x * canvas.width,
    y: definition.y * canvas.height,
    width: definition.width * canvas.width,
    height: definition.height * canvas.height,
  }
}

/** Padding is a fraction of the short side, so it stays visually even in a wide slot. */
function pad(rect: Rect, fraction: number): Rect {
  const inset = Math.min(rect.width, rect.height) * fraction
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(0, rect.width - inset * 2),
    height: Math.max(0, rect.height - inset * 2),
  }
}

function smallestSide(slot: Rect, count: number, definition: SlotDefinition): number {
  if (count === 0) return Infinity
  const horizontal = definition.direction === 'row'
  const main = (horizontal ? slot.width : slot.height) / count
  const cross = horizontal ? slot.height : slot.width
  return Math.min(main, cross)
}

function failed(aspect: string, issue: LayoutIssue): ResolvedLayout {
  return {
    aspect,
    canvas: { width: 0, height: 0 },
    slots: {},
    placements: [],
    issues: [issue],
  }
}
