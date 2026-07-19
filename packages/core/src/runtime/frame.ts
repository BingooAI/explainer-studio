// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Rect } from '../layout/resolve.js'
import type { Gate } from '../schema/document.js'
import type { Pose, StyleTokens } from '../schema/primitives.js'
import { captionText } from './cues.js'
import { slotAt, type NarrationSegment, type Program } from './program.js'

/**
 * `frame(program, t) → RenderModel`
 *
 * The load-bearing function of the whole system (ARCHITECTURE §1). Pure: the same `t`
 * yields the same model, and therefore the same pixels on any renderer.
 *
 * That is what lets a React/SVG player, a React Native player and a headless MP4 renderer
 * exist without drifting apart. They cannot disagree about timing, layout or easing,
 * because none of them owns any of it — they are painters of this structure and nothing
 * more. Every temptation to "just handle this one case in the renderer" is the beginning
 * of two products that look different and are both correct according to themselves.
 */

export interface RenderItem {
  readonly id: string
  /** Registry key naming the element type; the painter is looked up by this. */
  readonly type: string
  /** Where layout allotted the space, in canvas pixels, before the pose offset. */
  readonly rect: Rect
  /** The offset pose already applied — a painter needs no interpolation of its own. */
  readonly pose: Pose
  readonly style: StyleTokens
  readonly content: unknown
  readonly align: 'start' | 'center' | 'end' | 'stretch'
  readonly z: number
  /** Which layout region holds it. Lets the renderer group items into panels. */
  readonly slot: string
  /**
   * How many parts of a multi-part element are showing. `Infinity` means all of them.
   * A painter that does not have parts ignores it.
   */
  readonly items: number
}

export interface RenderCaption {
  readonly ref: string
  /** The spoken text with cue markers removed — what a viewer should read. */
  readonly text: string
  /** Index of the word being spoken, or -1 before word timings exist. */
  readonly wordIndex: number
}

export interface RenderModel {
  readonly sceneId: string
  readonly sceneIndex: number
  /** Seconds into the current scene. */
  readonly tScene: number
  /** Where the current scene starts in the program. */
  readonly sceneStart: number
  /** Which aspect this was built for. A painter that draws a horizon needs to know. */
  readonly aspect: string
  readonly canvas: { readonly width: number; readonly height: number }
  /**
   * The layout's slot rectangles.
   *
   * Carried so a renderer can draw a panel behind a group of items — which is what makes
   * content read as *grouped* rather than as things floating on a background. Deriving it
   * from the items would guess at the region's real bounds.
   */
  readonly slots: Readonly<Record<string, Rect>>
  /**
   * Every placed element's rectangle, including ones currently invisible.
   *
   * A connector needs both endpoints even when one has not been revealed yet, and it must
   * not have to search the item list — which only holds what is on screen.
   */
  readonly rects: Readonly<Record<string, Rect>>
  /** Visible items only, sorted back to front. */
  readonly items: readonly RenderItem[]
  readonly caption?: RenderCaption
  /** Present once a gate is answerable; playback should stop advancing. */
  readonly gate?: Gate
  /** Registry key for the theme, carried through so a painter needs no other input. */
  readonly theme: string
  /**
   * The locale's strings, by reference rather than copied.
   *
   * Element content holds string *keys* (R4), so a painter needs the table to render text.
   * Passing the reference keeps `frame` allocation-light enough to call every frame.
   */
  readonly strings: Readonly<Record<string, string>>
}

export function frame(program: Program, t: number): RenderModel {
  const slot = slotAt(program, t)

  if (!slot) {
    return {
      sceneId: '',
      sceneIndex: -1,
      tScene: 0,
      sceneStart: 0,
      aspect: program.aspect,
      canvas: program.canvas,
      slots: {},
      rects: {},
      items: [],
      theme: program.document.theme,
      strings: program.bundle.strings,
    }
  }

  const tScene = clampToSlot(t, slot.start, slot.end)
  const items: RenderItem[] = []
  const rects: Record<string, Rect> = {}
  for (const placement of slot.layout.placements) rects[placement.id] = placement.rect

  for (const placement of slot.layout.placements) {
    const pose = slot.timeline.poseAt(placement.id, tScene)

    // Invisible and fully transparent items are dropped here rather than by the painter.
    // Doing it once keeps every renderer honest about what "visible" means, and keeps the
    // model small enough to diff cheaply in an editor.
    if (!pose.visible || pose.opacity <= 0) continue

    const element = slot.scene.elements.find((e) => e.id === placement.id)
    if (!element) continue

    items.push({
      id: placement.id,
      type: element.type,
      rect: placement.rect,
      pose,
      style: element.style,
      content: element.content,
      align: placement.align,
      z: placement.z,
      slot: placement.slot,
      items: slot.timeline.itemsAt(placement.id, tScene),
    })
  }

  // Sorted back to front so a painter can draw in order without consulting z itself.
  // Ties break on id, because a stable order is what makes golden tests meaningful.
  items.sort((a, b) => a.z - b.z || a.id.localeCompare(b.id))

  const caption = captionAt(slot.narrations, tScene)
  const gateOpen = slot.gateOpensAt !== undefined && tScene >= slot.gateOpensAt

  return {
    sceneId: slot.scene.id,
    sceneIndex: slot.index,
    tScene,
    sceneStart: slot.start,
    aspect: program.aspect,
    canvas: program.canvas,
    slots: slot.layout.slots,
    rects,
    items,
    theme: program.document.theme,
    strings: program.bundle.strings,
    ...(caption ? { caption } : {}),
    ...(gateOpen && slot.scene.gate ? { gate: slot.scene.gate } : {}),
  }
}

/**
 * Held at the boundaries rather than allowed to run past.
 *
 * A renderer asked for a time beyond the end should show the final frame, not an empty
 * one — the last thing a lesson said should stay on screen while a teacher talks over it.
 */
function clampToSlot(t: number, start: number, end: number): number {
  if (t <= start) return 0
  if (t >= end) return end - start
  return t - start
}

function captionAt(narrations: readonly NarrationSegment[], tScene: number): RenderCaption | undefined {
  for (const segment of narrations) {
    if (tScene < segment.at || tScene > segment.at + segment.duration) continue

    const local = tScene - segment.at
    const words = segment.narration.words

    // Linear rather than binary search: a narration line has tens of words, and the linear
    // scan is faster at that size than the branching a binary search costs.
    let wordIndex = -1
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i]!
      if (local >= word.start && local <= word.end) {
        wordIndex = i
        break
      }
      if (local < word.start) break
      wordIndex = i
    }

    return {
      ref: segment.ref,
      text: captionText(segment.narration.script),
      wordIndex,
    }
  }

  return undefined
}
