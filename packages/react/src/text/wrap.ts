// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { glyphWidthFor, type ResolvedProfiles } from '@bingoo.ai/explainer-core'

/**
 * Text wrapping and fitting, measured with **the engine's glyph width and no other**.
 *
 * The Bingoo implementation this is ported from had four different constants for the same
 * measurement — 0.55 in the renderer's wrap, 0.52 in the authoring budget, 0.62 in the stat
 * painter, 0.58 in the manipulative bounds — while a comment in the engine claimed the
 * first two agreed. They did not, by about 6%. The effect is text that passes the quality
 * gate and overflows on screen, which is precisely the failure the shared budget exists to
 * prevent, and it is invisible until someone looks at a rendered lesson closely.
 *
 * One source. Everything here goes through `glyphWidthFor`.
 */

export interface Metrics {
  readonly profiles: ResolvedProfiles
  readonly script?: string | undefined
}

/** Estimated width of `text` at `size`, in canvas units. */
export function widthOf(text: string, size: number, metrics: Metrics): number {
  return text.length * size * glyphWidthFor(metrics.profiles.speech, metrics.script)
}

/** Characters that fit on one line of `width` at `size`. Never less than one. */
export function charsPerLine(width: number, size: number, metrics: Metrics): number {
  const perChar = size * glyphWidthFor(metrics.profiles.speech, metrics.script)
  return Math.max(1, Math.floor(width / perChar))
}

/**
 * Greedy wrap on whitespace.
 *
 * A single word longer than the line is left to overflow rather than broken: hyphenating
 * without a dictionary produces worse results than a slightly wide line, and in a lesson
 * the over-long word is usually the technical term the scene is about.
 */
export function wrapText(text: string, width: number, size: number, metrics: Metrics): string[] {
  const limit = charsPerLine(width, size, metrics)
  const lines: string[] = []
  let current = ''

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current === '' ? word : `${current} ${word}`
    if (candidate.length <= limit) {
      current = candidate
      continue
    }
    if (current !== '') lines.push(current)
    current = word
  }

  if (current !== '') lines.push(current)
  return lines.length === 0 ? [text] : lines
}

export interface FitResult {
  readonly size: number
  readonly lines: readonly string[]
  readonly lineHeight: number
}

/**
 * The largest size at which `text` fits in the box, and the lines at that size.
 *
 * Size and lines are returned **together**. The implementation this replaces decremented
 * the size in a loop and then used the lines from the previous iteration, so every string
 * that never fit was laid out one step narrower than it was wrapped for. Returning a pair
 * makes that class of mistake unrepresentable rather than merely fixed.
 */
export function fitText(
  text: string,
  box: { width: number; height: number },
  options: {
    readonly ideal: number
    readonly lineHeightRatio?: number
    readonly minRatio?: number
    readonly step?: number
    readonly metrics: Metrics
  },
): FitResult {
  const ratio = options.lineHeightRatio ?? 1.3
  const floor = options.ideal * (options.minRatio ?? 0.6)
  const step = options.step ?? 2

  let size = options.ideal
  let lines = wrapText(text, box.width, size, options.metrics)

  while (size > floor && lines.length * size * ratio > box.height) {
    size -= step
    lines = wrapText(text, box.width, size, options.metrics)
  }

  return { size, lines, lineHeight: size * ratio }
}
