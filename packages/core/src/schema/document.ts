// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'
import { profilePins } from '../profiles/schema.js'
import {
  aspect,
  beatId,
  elementId,
  flow,
  locale,
  narrationId,
  pose,
  registryKey,
  sceneId,
  stringKey,
  styleTokens,
} from './primitives.js'

export const DOCUMENT_VERSION = 'explainer/v1'

/**
 * An element is a thing on screen. It knows *what* it is and *which region* it belongs to,
 * and nothing about where that region is — see primitives.ts for why that separation is
 * the load-bearing one.
 *
 * `content` is `unknown` deliberately. Its shape belongs to the registered element type,
 * which validates it; baking every content shape into this schema would mean a plugin
 * could not add one without a core release (R1).
 */
export const element = z.object({
  id: elementId,
  /** Registry key: `text`, `stroke`, `chart`, `fraction-bar`. */
  type: registryKey,
  /** Which layout region holds it. Must exist in the scene's template. */
  region: z.string().min(1).max(64),
  flow: flow.default({ order: 0, grow: 0, align: 'center' }),
  content: z.unknown(),
  style: styleTokens.default({}),
  /**
   * Named states this element can be posed into. `base` is implicit; anything else is
   * addressed by a `move` action from a beat.
   */
  poses: z.record(z.string(), pose).default({}),
  /** Whether it is on screen before any beat has run. */
  startVisible: z.boolean().default(false),
  /** Stacking within the region. Higher paints later. */
  z: z.number().int().min(-100).max(100).default(0),
})

export type Element = z.infer<typeof element>

/**
 * What a beat does. Discriminated on `verb` so adding one is additive and exhaustive
 * handling is checked by the compiler.
 *
 * Every verb states intent and no timing (R5). There is deliberately no `wait(300ms)` —
 * pacing comes from the timing profile, so retuning the house style retimes every lesson
 * that pinned it instead of none of them.
 */
export const visualAction = z.discriminatedUnion('verb', [
  z.object({ verb: z.literal('reveal'), target: elementId }),
  z.object({ verb: z.literal('exit'), target: elementId }),
  z.object({ verb: z.literal('drawOn'), target: elementId }),
  z.object({ verb: z.literal('emphasize'), target: elementId, style: registryKey.optional() }),
  /** Moves an element to one of its named poses. */
  z.object({ verb: z.literal('move'), target: elementId, to: z.string().min(1) }),
  /** Reveals one item of a multi-part element — a list bullet, a table row. */
  z.object({ verb: z.literal('revealItem'), target: elementId, index: z.number().int().min(0) }),
  z.object({ verb: z.literal('revealAll'), target: elementId }),
  /** Draws a connector between two elements. */
  z.object({ verb: z.literal('connect'), from: elementId, to: elementId }),
  z.object({ verb: z.literal('sfx'), sound: registryKey }),
])

export type VisualAction = z.infer<typeof visualAction>
export type VisualVerb = VisualAction['verb']

/**
 * A beat is what happens at one cue in the narration.
 *
 * The cue is the synchronisation point: it matches a `[[cue:x]]` marker in the narration
 * script, and text-to-speech reports when that marker was actually spoken. Visuals follow
 * the voice rather than a timeline, which is why a lesson stays in sync after the narration
 * is regenerated in another language.
 */
export const beat = z.object({
  id: beatId,
  /** Matches a `[[cue:...]]` marker in this scene's narration. */
  cue: z.string().min(1).max(64),
  actions: z.array(visualAction).max(24),
  /** Extra hold after the actions finish, in seconds. Rare; the profile sets the norm. */
  hold: z.number().min(0).max(30).optional(),
})

export type Beat = z.infer<typeof beat>

/**
 * A gate pauses the lesson until the learner does something.
 *
 * `kind` is a registry key and `question` is `unknown` for the same reason element content
 * is: the question kind owns its shape and its grader. Grading is always code, never a
 * model's opinion (R2) — a gate the model marks is a gate that can be argued with.
 */
export const gate = z.object({
  kind: registryKey,
  prompt: stringKey,
  question: z.unknown(),
  feedback: z.object({ correct: stringKey.optional(), incorrect: stringKey.optional() }).default({}),
  /** Seconds the lesson waits before offering to move on. */
  patience: z.number().min(0).max(600).default(30),
})

export type Gate = z.infer<typeof gate>

/**
 * The narration lines a scene plays, and when each starts relative to the scene.
 *
 * A scene has several rather than one because a teacher edits a sentence, not a monologue:
 * regenerating one line should not re-pay for the rest (ARCHITECTURE §11).
 */
export const narrationSlot = z.object({
  ref: narrationId,
  /** Seconds after the scene begins. */
  at: z.number().min(0).max(3600).default(0),
})

export const layoutSpec = z.object({
  /** Registry key naming a teaching move: `teach`, `compare`, `worked-example`. */
  template: registryKey,
  /** Region name → element ids, in the order the layout should flow them. */
  regions: z.record(z.string(), z.array(elementId)).default({}),
  /** Per-aspect region overrides, for the rare scene that needs a different portrait shape. */
  overrides: z.record(aspect, z.record(z.string(), z.array(elementId))).default({}),
})

export type LayoutSpec = z.infer<typeof layoutSpec>

/**
 * `phase` places the scene in the teaching arc. It is a registry key rather than an enum
 * because a curriculum with a different pedagogy should register its own arc instead of
 * patching ours (ARCHITECTURE §5).
 */
export const scene = z.object({
  id: sceneId,
  kind: z.enum(['exposition', 'gate']).default('exposition'),
  phase: registryKey.optional(),
  layout: layoutSpec,
  elements: z.array(element).max(64),
  beats: z.array(beat).max(64).default([]),
  narrations: z.array(narrationSlot).max(32).default([]),
  gate: gate.optional(),
  /** Registry key for the transition into this scene. */
  transition: registryKey.optional(),
  /** Seconds held after the last beat, before moving on. */
  hold: z.number().min(0).max(60).optional(),
})

export type Scene = z.infer<typeof scene>

export const documentMeta = z.object({
  id: z.string().min(1).max(128),
  /** A key, like everything else a human reads. */
  title: stringKey,
  /** Free-form and language-neutral: a subject slug, not a sentence. */
  subject: z.string().max(64).optional(),
  audience: z.string().max(64).optional(),
  tags: z.array(z.string().max(32)).max(24).default([]),
  targetMinutes: z.number().positive().max(180).optional(),
})

/**
 * Provenance (R11). Present on anything a model produced, so a run can be audited and
 * re-run. Absent on a hand-authored document, which is itself information.
 */
export const provenance = z.object({
  model: z.string().max(128).optional(),
  promptVersion: z.string().max(64).optional(),
  contractVersion: z.string().max(64).optional(),
  /** ISO-8601. A string rather than a Date: the engine has no clock (R7). */
  generatedAt: z.string().max(40).optional(),
})

export const explainerDocument = z.object({
  version: z.literal(DOCUMENT_VERSION),
  meta: documentMeta,
  /** Every locale this document has a bundle for. The first is the authoring language. */
  locales: z.array(locale).min(1).max(64),
  /** Pinned profile versions, so this document renders the same next year (R5). */
  profiles: profilePins,
  /** Registry key for the theme. */
  theme: registryKey.default('default'),
  scenes: z.array(scene).min(1).max(200),
  provenance: provenance.optional(),
})

export type ExplainerDocument = z.infer<typeof explainerDocument>
