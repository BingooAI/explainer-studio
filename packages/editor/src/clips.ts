// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Element, Program, Scene, SceneSlot, VisualAction } from '@bingoo.ai/explainer-core'
import { stripCues } from '@bingoo.ai/explainer-core'

/**
 * The clip model: a `Program` seen the way a video editor sees it.
 *
 * A document says *what happens* — "reveal the diagram when the narrator reaches this word".
 * A timeline has to show *when things exist*, as bars you can look along. This turns one
 * into the other: an element becomes a clip that starts at its entrance and ends at its
 * exit, and clips that overlap get stacked onto separate rows.
 *
 * Every time here is derived from the compiled timeline. Nothing is invented and nothing is
 * stored, so a clip cannot drift from what playback will actually do — which is the failure
 * mode of every editor that keeps its own copy of the timings.
 *
 * This module is pure and holds no React, so a server can build the same view for an API
 * response or a diff without pulling a renderer in with it.
 */

export interface ClipEffect {
  /** Seconds from the start of the program. */
  readonly at: number
  readonly verb: string
  readonly beatId: string
}

export interface Clip {
  readonly key: string
  readonly sceneId: string
  readonly elementId: string
  readonly label: string
  readonly type: string
  readonly start: number
  readonly end: number
  readonly sceneStart: number
  readonly sceneEnd: number
  readonly effects: readonly ClipEffect[]
}

/** A row of clips that do not overlap, so they can share a lane. */
export interface Track {
  readonly row: number
  readonly clips: readonly Clip[]
}

export interface NarrationClip {
  readonly sceneId: string
  readonly ref: string
  readonly start: number
  readonly end: number
  readonly text: string
  readonly voiced: boolean
}

export interface GateClip {
  readonly sceneId: string
  readonly start: number
  readonly end: number
  readonly kind: string
}

export interface SceneBound {
  readonly id: string
  readonly start: number
  readonly end: number
  readonly kind: string
}

export interface Project {
  readonly duration: number
  readonly scenes: readonly SceneBound[]
  readonly tracks: readonly Track[]
  readonly narration: readonly NarrationClip[]
  readonly gates: readonly GateClip[]
}

/**
 * Verbs that bring an element on screen.
 *
 * A set rather than a list of `if`s because a kit may register its own reveal-like verb, and
 * a timeline that did not know about it would draw the clip as starting at the scene's
 * beginning — visible, wrong, and hard to explain (R1).
 */
export const ENTRANCE_VERBS: ReadonlySet<string> = new Set(['reveal', 'drawOn', 'revealItem', 'revealAll'])
export const EXIT_VERBS: ReadonlySet<string> = new Set(['exit'])

export function buildProject(program: Program): Project {
  const clips: Clip[] = []
  const narration: NarrationClip[] = []
  const gates: GateClip[] = []

  for (const slot of program.slots) {
    if (slot.scene.gate) {
      gates.push({
        sceneId: slot.scene.id,
        start: slot.start + (slot.gateOpensAt ?? 0),
        end: slot.end,
        kind: slot.scene.gate.kind,
      })
    }

    for (const segment of slot.narrations) {
      narration.push({
        sceneId: slot.scene.id,
        ref: segment.ref,
        start: slot.start + segment.at,
        end: slot.start + segment.at + segment.duration,
        text: stripCues(segment.narration.script).replace(/\s+/g, ' ').trim(),
        voiced: segment.narration.words.length > 0,
      })
    }

    for (const element of slot.scene.elements) {
      clips.push(clipFor(slot, element, program))
    }
  }

  return {
    duration: program.duration,
    scenes: program.slots.map((slot) => ({
      id: slot.scene.id,
      start: slot.start,
      end: slot.end,
      kind: slot.scene.kind,
    })),
    tracks: pack(clips),
    narration,
    gates,
  }
}

/** The shortest a clip may be drawn. Below this it is a sliver nobody can grab. */
const MIN_CLIP_SECONDS = 0.3

function clipFor(slot: SceneSlot, element: Element, program: Program): Clip {
  const beatAt = new Map(slot.timeline.beatTimes.map((beat) => [beat.id, beat.at] as const))
  const effects: ClipEffect[] = []

  for (const beat of slot.scene.beats) {
    const at = beatAt.get(beat.id)
    if (at === undefined) continue

    for (const action of beat.actions) {
      if (!targets(action, element.id)) continue
      effects.push({ at: slot.start + at, verb: action.verb, beatId: beat.id })
    }
  }

  const entrances = effects.filter((effect) => ENTRANCE_VERBS.has(effect.verb))
  const exits = effects.filter((effect) => EXIT_VERBS.has(effect.verb))

  // An element with no entrance is on screen from the start — which is what `startVisible`
  // means, and also what an unauthored element does. Both read the same on a timeline.
  const start = entrances.length > 0 ? Math.min(...entrances.map((e) => e.at)) : slot.start
  const end = exits.length > 0 ? Math.max(...exits.map((e) => e.at)) : slot.end

  return {
    key: `${slot.scene.id}:${element.id}`,
    sceneId: slot.scene.id,
    elementId: element.id,
    label: clipLabel(element, program),
    type: element.type,
    start,
    end: Math.max(end, start + MIN_CLIP_SECONDS),
    sceneStart: slot.start,
    sceneEnd: slot.end,
    effects: effects.sort((a, b) => a.at - b.at),
  }
}

/** Whether an action acts on this element. `connect` names two, and both ends of an arrow
 *  are things the arrow happens *to*. */
function targets(action: VisualAction, elementId: string): boolean {
  if ('target' in action) return action.target === elementId
  if (action.verb === 'connect') return action.from === elementId || action.to === elementId
  return false
}

/**
 * What to call a clip.
 *
 * The element's own words where it has any, because that is how an author recognises it —
 * a strip of clips labelled `text`, `text`, `text` is a strip you have to click through.
 */
function clipLabel(element: Element, program: Program): string {
  const key = (element.content as { key?: string }).key
  const phrase = key === undefined ? undefined : program.bundle.strings[key]
  if (phrase !== undefined && phrase !== '') return truncate(stripCues(phrase))
  return element.type
}

const LABEL_LIMIT = 24

function truncate(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > LABEL_LIMIT ? `${clean.slice(0, LABEL_LIMIT - 1)}…` : clean
}

/**
 * Greedy row packing, so clips that overlap in time end up on separate rows.
 *
 * Sorted by start, then each clip goes on the first row whose last clip has already
 * finished. This is the standard interval-partitioning result: it uses the fewest rows
 * possible, which matters because every extra row is timeline height taken away from the
 * preview above it.
 */
function pack(clips: readonly Clip[]): Track[] {
  const sorted = [...clips].sort((a, b) => a.start - b.start || a.key.localeCompare(b.key))
  const rows: Clip[][] = []

  for (const clip of sorted) {
    const row = rows.find((candidate) => candidate[candidate.length - 1]!.end <= clip.start + 0.001)
    if (row) row.push(clip)
    else rows.push([clip])
  }

  return rows.map((clips, row) => ({ row, clips }))
}

/** The clip a given element belongs to, if it is on the timeline at all. */
export function clipOf(project: Project, sceneId: string, elementId: string): Clip | undefined {
  for (const track of project.tracks) {
    const found = track.clips.find((clip) => clip.sceneId === sceneId && clip.elementId === elementId)
    if (found) return found
  }
  return undefined
}

/** The scene covering a program time, for turning a click on the timeline into a selection. */
export function sceneAt(project: Project, t: number): SceneBound | undefined {
  return project.scenes.find((scene) => t >= scene.start && t < scene.end) ?? project.scenes.at(-1)
}

export type { Scene }
