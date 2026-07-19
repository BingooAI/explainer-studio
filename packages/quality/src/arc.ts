// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ExplainerDocument } from '@bingoo.ai/explainer-core'
import { createRegistry, type Registry } from '@bingoo.ai/explainer-kernel'
import { z } from 'zod'
import type { Finding } from './finding.js'
import { result, type GateResult } from './finding.js'

/**
 * The pedagogy gate: is this a lesson, or a slideshow?
 *
 * A model asked for a lesson will happily produce eight scenes that all explain, with
 * nothing that orients the learner first and nothing that checks whether they followed.
 * Structurally it is flawless. Pedagogically it is not a lesson. This gate is the only
 * thing that notices.
 *
 * The arc is a **registry** rather than a fixed sequence (ARCHITECTURE §5). Our default is
 * one defensible teaching structure among several, and a curriculum with a different
 * pedagogy should register its own rather than patch ours — an opinionated default we
 * refuse to let anyone replace is just a hardcoded assumption with a nicer name.
 *
 * What this gate cannot do is judge whether the teaching is any good. It checks shape, not
 * quality, and nothing here should ever be described as the latter.
 */

export const arcPhase = z.object({
  /** Registry key used as a scene's `phase`. */
  id: z.string().min(1),
  /** Human-readable, for the authoring contract and the editor. */
  label: z.string().min(1),
  /** What this phase is for, in a sentence the model is given verbatim. */
  purpose: z.string().min(1),
  /** Fewer than this and the phase is not really present. */
  min: z.number().int().min(0).default(0),
  max: z.number().int().positive().optional(),
})

export type ArcPhase = z.infer<typeof arcPhase>

export const arcDescriptor = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** In teaching order. A scene's phase must appear here. */
  phases: z.array(arcPhase).min(1),
  /** Below this a document is a fragment, not a lesson. */
  minScenes: z.number().int().positive().default(3),
})

export type ArcDescriptor = z.infer<typeof arcDescriptor>
export type ArcRegistry = Registry<ArcDescriptor, ArcDescriptor>

export function createArcRegistry(options: { includeBuiltIns?: boolean } = {}): ArcRegistry {
  const registry = createRegistry<ArcDescriptor, ArcDescriptor>({ kind: 'arc', schema: arcDescriptor })

  if (options.includeBuiltIns !== false) {
    registry.register({ descriptor: defaultArc, create: () => defaultArc })
  }

  return registry
}

/**
 * The default arc.
 *
 * `explore` and `checkout` have a minimum of one because they are the two that get dropped
 * first and matter most: a lesson that starts by explaining has not earned attention, and
 * one that ends without checking has not found out whether it worked.
 */
export const defaultArc: ArcDescriptor = {
  id: 'default',
  label: 'Explore to checkout',
  minScenes: 4,
  phases: [
    { id: 'explore', label: 'Explore', purpose: 'Raise the question before answering it.', min: 1 },
    { id: 'orient', label: 'Orient', purpose: 'Say what this lesson is about.', min: 0 },
    { id: 'teach', label: 'Teach', purpose: 'Explain the idea directly.', min: 1 },
    { id: 'formalize', label: 'Formalise', purpose: 'Name the rule or definition.', min: 0 },
    { id: 'guided', label: 'Guided practice', purpose: 'Work an example together.', min: 0 },
    { id: 'practice', label: 'Practice', purpose: 'Let the learner try it.', min: 0 },
    { id: 'recap', label: 'Recap', purpose: 'Restate what was learned.', min: 0 },
    { id: 'checkout', label: 'Check out', purpose: 'Check whether it landed.', min: 1 },
  ],
}

export interface CheckLessonOptions {
  readonly arcs: ArcRegistry
  /** Which arc this document is measured against. */
  readonly arc?: string
}

export function checkLesson(document: ExplainerDocument, options: CheckLessonOptions): GateResult {
  const findings: Finding[] = []
  const arcId = options.arc ?? 'default'

  if (!options.arcs.has(arcId)) {
    return result([
      {
        code: 'UNKNOWN_ARC',
        severity: 'error',
        at: arcId,
        message: `No arc is registered as "${arcId}".`,
        fix: `Register it, or use one of: ${options.arcs.ids().join(', ') || 'none are registered'}.`,
      },
    ])
  }

  const arc = options.arcs.get(arcId)
  const known = new Map(arc.phases.map((p) => [p.id, p]))
  const counts = new Map<string, number>()

  for (const [index, scene] of document.scenes.entries()) {
    if (scene.phase === undefined) {
      findings.push({
        code: 'SCENE_WITHOUT_PHASE',
        severity: 'warn',
        at: `scenes.${index}`,
        message: `Scene "${scene.id}" is not placed in the teaching arc.`,
        fix: `Set "phase" on scene "${scene.id}" to one of: ${arc.phases.map((p) => p.id).join(', ')}.`,
      })
      continue
    }

    if (!known.has(scene.phase)) {
      findings.push({
        code: 'UNKNOWN_PHASE',
        severity: 'error',
        at: `scenes.${index}`,
        message: `Scene "${scene.id}" claims the phase "${scene.phase}", which the "${arc.id}" arc does not define.`,
        fix: `Change it to one of: ${arc.phases.map((p) => p.id).join(', ')}.`,
      })
      continue
    }

    counts.set(scene.phase, (counts.get(scene.phase) ?? 0) + 1)
  }

  if (document.scenes.length < arc.minScenes) {
    findings.push({
      code: 'TOO_FEW_SCENES',
      severity: 'error',
      at: 'scenes',
      message: `This lesson has ${document.scenes.length} scenes; the "${arc.id}" arc needs at least ${arc.minScenes}.`,
      fix: `Add ${arc.minScenes - document.scenes.length} more scene(s).`,
    })
  }

  for (const phase of arc.phases) {
    const count = counts.get(phase.id) ?? 0

    if (count < phase.min) {
      findings.push({
        code: 'PHASE_MISSING',
        severity: 'error',
        at: `phase.${phase.id}`,
        message: `The "${phase.label}" phase has ${count} scenes but needs ${phase.min}.`,
        fix: `Add ${phase.min - count} scene(s) with phase "${phase.id}". Purpose: ${phase.purpose}`,
      })
    }

    if (phase.max !== undefined && count > phase.max) {
      findings.push({
        code: 'PHASE_OVERLOADED',
        severity: 'warn',
        at: `phase.${phase.id}`,
        message: `The "${phase.label}" phase has ${count} scenes; ${phase.max} is the intended maximum.`,
        fix: `Merge or remove ${count - phase.max} scene(s) with phase "${phase.id}".`,
      })
    }
  }

  checkOrdering(document, arc, findings)
  checkRichness(document, findings)

  return result(findings)
}

/**
 * Phases should appear in teaching order.
 *
 * A warning rather than an error: interleaving teach and practice is a legitimate choice,
 * and a gate that forbids it would be enforcing a preference while claiming to enforce a
 * structure. What it catches is the real mistake — a checkout in the middle, or an explore
 * at the end.
 */
function checkOrdering(document: ExplainerDocument, arc: ArcDescriptor, findings: Finding[]): void {
  const order = new Map(arc.phases.map((p, i) => [p.id, i]))
  let furthest = -1
  let furthestPhase = ''

  for (const [index, scene] of document.scenes.entries()) {
    const position = scene.phase === undefined ? undefined : order.get(scene.phase)
    if (position === undefined) continue

    if (position < furthest) {
      findings.push({
        code: 'PHASE_OUT_OF_ORDER',
        severity: 'warn',
        at: `scenes.${index}`,
        message: `Scene "${scene.id}" is in phase "${scene.phase}", which comes before "${furthestPhase}" already used earlier.`,
        fix: `Move scene "${scene.id}" earlier, or change its phase to "${furthestPhase}" or later.`,
      })
    } else {
      furthest = position
      furthestPhase = scene.phase ?? furthestPhase
    }
  }
}

/**
 * A scene with one element and no beats is a slide, not a scene.
 *
 * This is the check that catches a model going through the motions: the arc is satisfied,
 * every phase is present, and each scene is a sentence on a blank background. Structurally
 * flawless, and nothing anyone would show a class.
 */
function checkRichness(document: ExplainerDocument, findings: Finding[]): void {
  for (const [index, scene] of document.scenes.entries()) {
    const isGate = scene.kind === 'gate'
    if (isGate) continue

    if (scene.elements.length < 2) {
      findings.push({
        code: 'SCENE_TOO_SPARSE',
        severity: 'warn',
        at: `scenes.${index}`,
        message: `Scene "${scene.id}" has ${scene.elements.length} element(s) — it is a slide rather than a scene.`,
        fix: `Add a supporting visual to "${scene.id}": a diagram, an image, or a labelled example alongside the text.`,
      })
    }

    if (scene.beats.length === 0 && scene.narrations.length > 0) {
      // Narration with no beats means the voice talks while nothing moves — the most
      // common way a generated lesson turns out lifeless.
      findings.push({
        code: 'SCENE_WITHOUT_BEATS',
        severity: 'warn',
        at: `scenes.${index}`,
        message: `Scene "${scene.id}" is narrated but nothing happens on screen while it speaks.`,
        fix: `Add at least one beat to "${scene.id}" with a cue matching its narration, revealing or emphasising an element.`,
      })
    }
  }
}
