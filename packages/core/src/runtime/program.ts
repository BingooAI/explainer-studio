// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedLayout } from '../layout/resolve.js'
import { resolveLayout } from '../layout/resolve.js'
import type { TemplateRegistry } from '../layout/template.js'
import { spokenSeconds } from '../layout/type-scale.js'
import { compileScene, type SceneTimeline } from '../motion/choreograph.js'
import type { EmphasisRegistry } from '../motion/emphasis.js'
import type { ResolvedProfiles } from '../profiles/registry.js'
import type { ExplainerDocument, Scene } from '../schema/document.js'
import type { LocaleBundle, Narration } from '../schema/locale.js'

/**
 * A `Program` is a document prepared for playback at one aspect: scenes laid end to end,
 * each with its timeline and its layout already resolved.
 *
 * Building it up front rather than lazily is deliberate. `frame(program, t)` is called
 * sixty times a second and must stay a cheap lookup (R3); resolving layout inside it would
 * make every frame do work that only changes when the document does.
 */

export interface NarrationSegment {
  readonly ref: string
  /** Seconds from the start of the scene. */
  readonly at: number
  readonly duration: number
  readonly narration: Narration
}

export interface SceneSlot {
  readonly index: number
  readonly scene: Scene
  /** Seconds from the start of the program. */
  readonly start: number
  readonly end: number
  readonly timeline: SceneTimeline
  readonly layout: ResolvedLayout
  readonly narrations: readonly NarrationSegment[]
  /**
   * When the gate becomes answerable, relative to the scene. Absent for exposition scenes.
   * A gate that appeared before its own setup had played would be unanswerable.
   */
  readonly gateOpensAt?: number
}

export interface Program {
  readonly document: ExplainerDocument
  readonly bundle: LocaleBundle
  readonly aspect: string
  readonly canvas: { readonly width: number; readonly height: number }
  readonly slots: readonly SceneSlot[]
  /** Total seconds, excluding time a learner spends paused at a gate. */
  readonly duration: number
  /** Program times at which playback waits for the learner. */
  readonly gateStarts: readonly number[]
  /** Layout problems found while building, gathered across every scene. */
  readonly issues: readonly { readonly sceneId: string; readonly issues: ResolvedLayout['issues'] }[]
}

export interface BuildProgramOptions {
  readonly profiles: ResolvedProfiles
  readonly templates: TemplateRegistry
  readonly emphasis: EmphasisRegistry
  readonly aspect: string
}

export function buildProgram(
  document: ExplainerDocument,
  bundle: LocaleBundle,
  options: BuildProgramOptions,
): Program {
  const { profiles, templates, emphasis, aspect } = options
  const canvas = profiles.layout.canvas[aspect] ?? { width: 0, height: 0 }

  const slots: SceneSlot[] = []
  const gateStarts: number[] = []
  const issues: Array<{ sceneId: string; issues: ResolvedLayout['issues'] }> = []
  let cursor = 0

  document.scenes.forEach((scene, index) => {
    const narrations = collectNarrations(scene, bundle, profiles)
    const cueMarks = collectCueMarks(narrations)
    const spoken = narrations.reduce((end, n) => Math.max(end, n.at + n.duration), 0)

    const timeline = compileScene(scene, {
      timing: profiles.timing,
      emphasis,
      // Real marks win; the estimate only fills in for a scene nobody has voiced yet.
      ...(Object.keys(cueMarks).length > 0 ? { cueMarks } : {}),
      estimatedDuration: spoken,
    })

    const layout = resolveLayout(scene, aspect, { templates, layout: profiles.layout })
    if (layout.issues.length > 0) {
      issues.push({ sceneId: scene.id, issues: layout.issues })
    }

    // A scene lasts as long as the longer of its visuals and its voice. Cutting either
    // short is the more visible failure: narration clipped mid-sentence, or a diagram that
    // vanishes while it is still being talked about.
    const duration = Math.max(timeline.duration, spoken, MIN_SCENE_SECONDS)

    const slot: SceneSlot = {
      index,
      scene,
      start: cursor,
      end: cursor + duration,
      timeline,
      layout,
      narrations,
      ...(scene.gate ? { gateOpensAt: timeline.duration } : {}),
    }

    slots.push(slot)
    if (scene.gate) gateStarts.push(cursor + (slot.gateOpensAt ?? 0))
    cursor += duration
  })

  return { document, bundle, aspect, canvas, slots, duration: cursor, gateStarts, issues }
}

/** A scene shorter than this is a flash rather than a beat, whatever the content says. */
const MIN_SCENE_SECONDS = 0.5

function collectNarrations(
  scene: Scene,
  bundle: LocaleBundle,
  profiles: ResolvedProfiles,
): NarrationSegment[] {
  const segments: NarrationSegment[] = []

  for (const slot of scene.narrations) {
    const narration = bundle.narration[slot.ref]
    // A missing narration is a bundle problem the quality gate reports. Playback carries
    // on silently rather than refusing — a lesson missing one line is still a lesson.
    if (!narration) continue

    segments.push({
      ref: slot.ref,
      at: slot.at,
      duration: narrationDuration(narration, bundle, profiles),
      narration,
    })
  }

  return segments
}

/**
 * A real measured duration when text-to-speech has run, an estimate before that.
 *
 * The estimate uses the bundle's script rather than a single global rate, so a Han lesson
 * is not timed as though it were English.
 */
function narrationDuration(narration: Narration, bundle: LocaleBundle, profiles: ResolvedProfiles): number {
  if (narration.durationSeconds !== undefined) return narration.durationSeconds

  const lastWord = narration.words[narration.words.length - 1]
  if (lastWord) return lastWord.end

  return spokenSeconds(stripCues(narration.script), profiles.speech, bundle.script)
}

/**
 * Cue markers are timing instructions, not speech. Counting them would inflate the estimate
 * by roughly a word per beat, which compounds across a lesson.
 */
export function stripCues(script: string): string {
  return script.replace(/\[\[cue:[^\]]*\]\]/g, '')
}

/**
 * Cue marks are relative to their own narration line, and beats are relative to the scene,
 * so each mark is shifted by where its line starts.
 */
function collectCueMarks(narrations: readonly NarrationSegment[]): Record<string, number> {
  const marks: Record<string, number> = {}

  for (const segment of narrations) {
    for (const mark of segment.narration.marks) {
      marks[mark.cue] = segment.at + mark.at
    }
  }

  return marks
}

/** The slot playing at `t`. Returns the last slot past the end, so a finished program holds
 *  on its final frame rather than going blank. */
export function slotAt(program: Program, t: number): SceneSlot | undefined {
  if (program.slots.length === 0) return undefined
  if (t < 0) return program.slots[0]

  for (const slot of program.slots) {
    if (t < slot.end) return slot
  }

  return program.slots[program.slots.length - 1]
}
