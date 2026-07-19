// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

/**
 * Profiles are ARCHITECTURE §2.3: the numbers the engine needs, held as versioned data
 * rather than as literals in `choreographer.ts` or `layout.ts`.
 *
 * The reason is not tidiness. A document pins the profile versions it was authored
 * against, so retuning the house style never silently re-renders a lesson a teacher made
 * last term. Without that, "improving the defaults" and "changing existing lessons" are
 * the same action, and we would be unable to do the first without doing the second.
 */

/** `id@version`, e.g. `house@1`. Major only — see ENGINEERING.md §7. */
export const profileRef = z
  .string()
  .regex(/^[a-z][a-z0-9-]*@\d+$/, 'must look like "house@1": a lowercase id, then @, then a major version')

export type ProfileRef = z.infer<typeof profileRef>

const identity = {
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  version: z.number().int().positive(),
}

const seconds = z.number().positive().max(60)
const ratio = z.number().min(0).max(1)

/**
 * Cubic-bezier control points, the same shape CSS uses. Named curves would need a registry
 * of their own for no gain — an easing is four numbers, and writing them out means a
 * profile is fully self-describing to anyone reading it.
 */
export const easing = z.tuple([z.number(), z.number(), z.number(), z.number()])
export type Easing = z.infer<typeof easing>

/**
 * How long the house takes to do things. Authors declare intent — `reveal`, `drawOn`,
 * `emphasize` — and never a duration (R5); this is where intent acquires milliseconds.
 */
export const timingProfile = z.object({
  ...identity,
  kind: z.literal('timing'),
  /** An element appearing. */
  reveal: z.object({ duration: seconds, easing }),
  /** Delay between consecutive items of a group, so a list arrives as a list. */
  stagger: seconds,
  /** A stroke drawing itself on. */
  draw: z.object({ duration: seconds, easing }),
  /** An element moving between two places. */
  move: z.object({ duration: seconds, easing }),
  /** An element leaving. */
  exit: z.object({ duration: seconds, easing }),
  /** Scene-to-scene transition. */
  transition: z.object({ duration: seconds, easing }),
  /** How long a beat holds after its actions finish, before the next one starts. */
  beatHold: seconds,
})

export type TimingProfile = z.infer<typeof timingProfile>

/**
 * Canvas geometry and the budgets the layout gate measures against. Both aspects are
 * first-class: a lesson is authored once and must hold together in landscape and portrait,
 * which is only checkable if both canvases are defined in the same place.
 */
export const layoutProfile = z.object({
  ...identity,
  kind: z.literal('layout'),
  canvas: z.record(
    z.string(),
    z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  ),
  /** Fraction of a slot its content may occupy before the gate calls it crowded. */
  fillRatio: ratio,
  /** Overlap between two content rects, as a fraction of the smaller, that counts as a collision. */
  overlapRatio: ratio,
  /** Space between a slot's edge and its content, as a fraction of the slot's short side. */
  slotPadding: ratio,
  /**
   * Where the ground sits, as a fraction of canvas height, per aspect.
   *
   * One number, shared by the backdrop that paints the horizon and anything that stands on
   * it. Bingoo kept two — the meadow was painted at 0.78 while props were seated at 0.80 —
   * so a figure stood below the grass in landscape and hovered above it in portrait.
   */
  horizon: z.record(z.string(), ratio),
})

export type LayoutProfile = z.infer<typeof layoutProfile>

/**
 * The type scale, and with it the character budgets.
 *
 * This lives in the engine rather than the renderer for one specific reason: the renderer's
 * font size and the authoring contract's "keep it under N characters" must be the same
 * number. Split them and the model is told a limit the renderer does not honour.
 */
export const typeProfile = z.object({
  ...identity,
  kind: z.literal('type'),
  /** Rung name → size as a fraction of the canvas short side. */
  rungs: z.record(z.string(), z.object({ size: ratio, lineHeight: z.number().positive() })),
  /** Fallback when a rung is not named. Must exist in `rungs`; checked on registration. */
  defaultRung: z.string(),
})

export type TypeProfile = z.infer<typeof typeProfile>

/**
 * Per-script speech and glyph metrics.
 *
 * Bingoo hardcoded 14 characters per second, tuned for spoken Vietnamese, and a Latin glyph
 * width. Both are wrong for the next language somebody adds, and wrong invisibly: a lesson
 * simply drifts out of sync. Keying them by script makes the assumption explicit and
 * correctable by whoever actually speaks the language (R4).
 */
export const speechMetrics = z.object({
  /** Used to estimate scene duration before text-to-speech has run. */
  wordsPerSecond: z.number().positive().max(20),
  /** Mean glyph advance as a fraction of font size — turns a rect into a character budget. */
  glyphWidth: ratio,
})

export const speechProfile = z.object({
  ...identity,
  kind: z.literal('speech'),
  /** BCP-47 script subtag → metrics: `Latn`, `Hani`, `Arab`. */
  byScript: z.record(z.string(), speechMetrics),
  /** Used when a locale's script has no entry. Must exist in `byScript`. */
  defaultScript: z.string(),
})

export type SpeechProfile = z.infer<typeof speechProfile>
export type SpeechMetrics = z.infer<typeof speechMetrics>

export const anyProfile = z.discriminatedUnion('kind', [
  timingProfile,
  layoutProfile,
  typeProfile,
  speechProfile,
])

export type AnyProfile = z.infer<typeof anyProfile>
export type ProfileKind = AnyProfile['kind']

/** What a document pins. Every kind is required: an unpinned profile is an unreproducible render. */
export const profilePins = z.object({
  timing: profileRef,
  layout: profileRef,
  type: profileRef,
  speech: profileRef,
})

export type ProfilePins = z.infer<typeof profilePins>

export function formatProfileRef(profile: { id: string; version: number }): ProfileRef {
  return `${profile.id}@${profile.version}`
}

export function parseProfileRef(ref: ProfileRef): { id: string; version: number } {
  const at = ref.lastIndexOf('@')
  return { id: ref.slice(0, at), version: Number(ref.slice(at + 1)) }
}
