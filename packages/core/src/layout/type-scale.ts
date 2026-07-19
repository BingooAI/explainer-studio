// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { SpeechProfile, TypeProfile } from '../profiles/schema.js'
import type { Rect } from './resolve.js'

/**
 * The type scale, and the character budget it implies.
 *
 * This lives in the engine rather than the renderer for one specific reason: the renderer's
 * font size and the authoring contract's "keep it under N characters" must be the same
 * number. Split them and the model is handed a limit the renderer does not honour — text
 * overflows, and nothing catches it because both halves believe they are right.
 *
 * The estimate is deliberately crude. Measuring exactly needs a font, a shaper and a
 * platform, none of which a pure package can have; and an exact measurement of generated
 * text is worth less than it sounds, since the text changes on every regeneration anyway.
 * What matters is that the *same* estimate is used to instruct the model, to check the
 * result, and to size the render.
 */

export interface FontSize {
  /** Pixels. */
  readonly size: number
  readonly lineHeight: number
}

export function resolveFontSize(
  profile: TypeProfile,
  canvas: { width: number; height: number },
  rung?: string,
): FontSize {
  const name = rung && rung in profile.rungs ? rung : profile.defaultRung
  const definition = profile.rungs[name]!
  // Fractions are of the short side, so a rung is the same visual weight in both aspects.
  const shortSide = Math.min(canvas.width, canvas.height)
  return { size: definition.size * shortSide, lineHeight: definition.lineHeight }
}

/**
 * Glyph width is per script, not universal.
 *
 * Bingoo used one Latin constant, so a Han lesson budgeted roughly twice the characters
 * that actually fit. The failure was invisible in review — the text looked fine in the
 * language the reviewer read.
 */
export function glyphWidthFor(speech: SpeechProfile, script?: string): number {
  const key = script && script in speech.byScript ? script : speech.defaultScript
  return speech.byScript[key]!.glyphWidth
}

export interface CharBudgetOptions {
  readonly type: TypeProfile
  readonly speech: SpeechProfile
  readonly canvas: { width: number; height: number }
  readonly rung?: string | undefined
  readonly script?: string | undefined
  /** Cap on wrapped lines. One line is the honest default for a caption or a label. */
  readonly maxLines?: number
}

/**
 * How many characters fit in a rectangle at a given rung.
 *
 * Returns whole characters, floored — a budget that rounds up is a budget that overflows.
 */
export function charBudget(rect: Rect, options: CharBudgetOptions): number {
  const { size, lineHeight } = resolveFontSize(options.type, options.canvas, options.rung)
  if (size <= 0 || rect.width <= 0 || rect.height <= 0) return 0

  const perLine = Math.floor(rect.width / (size * glyphWidthFor(options.speech, options.script)))
  const linesThatFit = Math.floor(rect.height / (size * lineHeight))
  const lines = Math.max(0, Math.min(linesThatFit, options.maxLines ?? linesThatFit))

  return Math.max(0, perLine * lines)
}

/**
 * Seconds of speech a script takes, before text-to-speech has actually run.
 *
 * Used to lay scenes end to end so a lesson has a duration before anyone has paid for
 * audio. Once real timings exist they replace this entirely — the estimate is scaffolding,
 * not a source of truth.
 */
export function spokenSeconds(text: string, speech: SpeechProfile, script?: string): number {
  const key = script && script in speech.byScript ? script : speech.defaultScript
  const metrics = speech.byScript[key]!

  // Scripts without spaces cannot be counted by whitespace. Treating each character as a
  // "word" and rating them accordingly is what the per-script rate is calibrated for.
  const spaceless = metrics.glyphWidth >= 0.9
  const units = spaceless ? [...text.trim()].length : text.trim().split(/\s+/).filter(Boolean).length

  return units === 0 ? 0 : units / metrics.wordsPerSecond
}
