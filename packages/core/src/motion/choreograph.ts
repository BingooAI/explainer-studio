// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Easing, TimingProfile } from '../profiles/schema.js'
import type { Scene, VisualAction } from '../schema/document.js'
import type { Pose } from '../schema/primitives.js'
import { BASE_POSE } from '../schema/primitives.js'
import { ease } from './easing.js'
import { emphasisAt, type EmphasisRegistry } from './emphasis.js'
import { composePose, hiddenPose, lerpPose, restingPose } from './pose.js'

/**
 * `compileScene` turns beats into a timeline that can be sampled at any instant.
 *
 * This is where "authors declare intent, never milliseconds" (R5) is cashed in. A scene
 * says `reveal` at cue `c2`; this decides that the reveal starts when `c2` was actually
 * spoken, lasts what the timing profile says, and follows the profile's curve. Nothing in
 * the document mentions a duration, so retuning the profile retimes every lesson pinned to
 * it — and changes none of the ones pinned elsewhere.
 *
 * Sampling is a pure function of `t`, which is what `frame(program, t)` is built on (R3).
 */

export interface CompileSceneOptions {
  readonly timing: TimingProfile
  readonly emphasis: EmphasisRegistry
  /**
   * When each cue was actually spoken, from text-to-speech.
   *
   * Absent, beats are spaced evenly across the estimated duration. That fallback is what
   * lets a lesson play before anyone has paid for audio — worse timing, never broken.
   */
  readonly cueMarks?: Readonly<Record<string, number>>
  /** Used only when cue marks are missing. */
  readonly estimatedDuration?: number
}

interface Transition {
  readonly start: number
  readonly duration: number
  readonly to: Pose
  /**
   * Each transition carries its own curve. The profile gives `reveal`, `exit`, `move` and
   * `draw` different easings deliberately — an exit that decelerates like an entrance
   * reads as hesitation — so applying one curve to all of them would quietly discard half
   * the profile.
   */
  readonly easing: Easing
}

interface EmphasisRun {
  readonly start: number
  readonly duration: number
  readonly effect: string
}

interface Track {
  readonly initial: Pose
  readonly transitions: Transition[]
  readonly emphasis: EmphasisRun[]
  /** Time → how many items are revealed. `Infinity` means all of them. */
  readonly itemReveals: Array<{ at: number; count: number }>
}

export interface SoundCue {
  readonly at: number
  readonly sound: string
}

export interface SceneTimeline {
  /** Seconds, including any trailing hold. */
  readonly duration: number
  /** The pose of an element at `t`. Pure: same `t`, same answer. */
  poseAt(elementId: string, t: number): Pose
  /** How many items of a multi-part element are showing. `Infinity` means all. */
  itemsAt(elementId: string, t: number): number
  /** When each beat fires, in order. Used by the editor's clip view. */
  readonly beatTimes: readonly { readonly id: string; readonly at: number }[]
  readonly sounds: readonly SoundCue[]
}

export function compileScene(scene: Scene, options: CompileSceneOptions): SceneTimeline {
  const { timing, emphasis } = options
  const beatTimes = resolveBeatTimes(scene, options)
  const tracks = new Map<string, Track>()

  // An element that gets drawn on must start undrawn. Without this the transition runs
  // from drawProgress 1 to 1 and the verb silently does nothing — the kind of bug that
  // looks like a rendering problem for a week.
  const drawnOn = new Set<string>()
  for (const beat of scene.beats) {
    for (const action of beat.actions) {
      if (action.verb === 'drawOn') drawnOn.add(action.target)
    }
  }

  for (const element of scene.elements) {
    const base = element.startVisible ? restingPose : hiddenPose
    tracks.set(element.id, {
      initial: drawnOn.has(element.id) ? { ...base, drawProgress: 0 } : base,
      transitions: [],
      emphasis: [],
      itemReveals: [],
    })
  }

  const sounds: SoundCue[] = []
  let lastEnd = 0

  scene.beats.forEach((beat, beatIndex) => {
    const at = beatTimes[beatIndex]?.at ?? 0

    // Actions of the same kind within one beat are staggered, so a list arrives as a list
    // rather than as a single flash. The index is per beat, not global.
    let staggerIndex = 0

    for (const action of beat.actions) {
      const start = at + staggerIndex * timing.stagger
      const end = applyAction(action, start, scene, tracks, timing, emphasis, sounds)
      lastEnd = Math.max(lastEnd, end)
      if (staggers(action)) staggerIndex += 1
    }

    lastEnd = Math.max(lastEnd, at + (beat.hold ?? 0))
  })

  const duration = Math.max(lastEnd + timing.beatHold + (scene.hold ?? 0), 0)

  return {
    duration,
    beatTimes,
    sounds,

    poseAt(elementId, t) {
      const track = tracks.get(elementId)
      if (!track) return hiddenPose

      let pose = track.initial
      for (const transition of track.transitions) {
        if (t < transition.start) break
        const progress =
          transition.duration <= 0 ? 1 : ease(transition.easing, (t - transition.start) / transition.duration)
        pose = lerpPose(pose, transition.to, progress)
      }

      // Emphasis is an overlay applied after the base pose is settled, so it can be layered
      // on anything without the choreographer tracking what it disturbed.
      for (const run of track.emphasis) {
        if (t < run.start || t > run.start + run.duration) continue
        if (!emphasis.has(run.effect)) continue
        const effect = emphasis.get(run.effect)
        pose = composePose(pose, emphasisAt(effect, (t - run.start) / run.duration))
      }

      return pose
    },

    itemsAt(elementId, t) {
      const track = tracks.get(elementId)
      if (!track) return 0

      // Progressive reveal is opt-in. An element nobody choreographed shows everything —
      // an author who writes a chart and no beats expects to see the chart, not an empty
      // panel. Returning 0 here made every un-choreographed list, table and chart render
      // blank, and the renderers' own `?? 1` guards could not see the difference between
      // "no build authored" and "build authored, nothing revealed yet".
      if (track.itemReveals.length === 0) return Number.POSITIVE_INFINITY

      let count = 0
      for (const reveal of track.itemReveals) {
        if (reveal.at > t) break
        count = Math.max(count, reveal.count)
      }
      return count
    },
  }
}

/** `sfx` and `connect` do not occupy a stagger slot — they are not things arriving on screen. */
function staggers(action: VisualAction): boolean {
  return action.verb !== 'sfx' && action.verb !== 'connect'
}

function applyAction(
  action: VisualAction,
  start: number,
  scene: Scene,
  tracks: Map<string, Track>,
  timing: TimingProfile,
  emphasis: EmphasisRegistry,
  sounds: SoundCue[],
): number {
  if (action.verb === 'sfx') {
    sounds.push({ at: start, sound: action.sound })
    return start
  }

  if (action.verb === 'connect') {
    // Connectors are drawn between two elements; the pair is resolved at render time from
    // their rects, so there is nothing to pose here.
    return start + timing.draw.duration
  }

  const track = tracks.get(action.target)
  // An action naming an element the scene does not define is a document problem, reported
  // by the quality gate. Timing simply has nothing to do, and must not throw — the caller
  // may be a renderer mid-frame.
  if (!track) return start

  switch (action.verb) {
    case 'reveal': {
      track.transitions.push({
        start,
        duration: timing.reveal.duration,
        to: restingPose,
        easing: timing.reveal.easing,
      })
      return start + timing.reveal.duration
    }
    case 'exit': {
      track.transitions.push({
        start,
        duration: timing.exit.duration,
        to: hiddenPose,
        easing: timing.exit.easing,
      })
      return start + timing.exit.duration
    }
    case 'drawOn': {
      track.transitions.push({
        start,
        duration: timing.draw.duration,
        to: { ...restingPose, drawProgress: 1 },
        easing: timing.draw.easing,
      })
      return start + timing.draw.duration
    }
    case 'move': {
      const element = scene.elements.find((e) => e.id === action.target)
      const target = action.to === BASE_POSE ? restingPose : (element?.poses[action.to] ?? restingPose)
      track.transitions.push({
        start,
        duration: timing.move.duration,
        to: target,
        easing: timing.move.easing,
      })
      return start + timing.move.duration
    }
    case 'emphasize': {
      const id = action.style ?? 'pulse'
      const duration = emphasis.has(id) ? emphasis.get(id).duration : timing.reveal.duration
      track.emphasis.push({ start, duration, effect: id })
      return start + duration
    }
    case 'revealItem': {
      revealHost(track, start, timing)
      track.itemReveals.push({ at: start, count: action.index + 1 })
      return start + timing.reveal.duration
    }
    case 'revealAll': {
      revealHost(track, start, timing)
      track.itemReveals.push({ at: start, count: Number.POSITIVE_INFINITY })
      return start + timing.reveal.duration
    }
  }
}

/**
 * Revealing an item implies revealing the thing it belongs to.
 *
 * Without this an author who writes `revealItem` and no `reveal` gets nothing at all: the
 * element stays hidden, `frame` drops it, and the items they carefully sequenced are
 * invisible. Nobody means "show the second bullet of a list that is not on screen".
 *
 * Applied once, on the first item reveal only, so a list does not re-fade on every point.
 */
function revealHost(track: Track, start: number, timing: TimingProfile): void {
  if (track.initial.visible || track.itemReveals.length > 0) return
  track.transitions.push({
    start,
    duration: timing.reveal.duration,
    to: restingPose,
    easing: timing.reveal.easing,
  })
}

/**
 * When each beat fires.
 *
 * Real cue marks are the whole point of the design: visuals follow the voice, so a lesson
 * stays in sync after narration is regenerated in another language at a different speed.
 * Even spacing is the fallback for a scene that has not been voiced yet.
 */
function resolveBeatTimes(scene: Scene, options: CompileSceneOptions): readonly { id: string; at: number }[] {
  const marks = options.cueMarks
  const count = scene.beats.length
  if (count === 0) return []

  const spacing = (options.estimatedDuration ?? count * 2) / count

  let previous = -Infinity
  return scene.beats.map((beat, index) => {
    const marked = marks?.[beat.cue]
    const at = marked ?? index * spacing
    // Marks come from a speech provider and are not guaranteed monotonic. A beat that
    // moved backwards would replay visuals the learner has already seen, so clamp rather
    // than trust — and clamp rather than reject, because a slightly odd mark should
    // degrade the timing, not refuse to play the lesson.
    const clamped = Math.max(at, previous)
    previous = clamped
    return { id: beat.id, at: clamped }
  })
}
