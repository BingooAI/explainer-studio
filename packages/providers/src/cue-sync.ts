// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { splitCues } from '@bingoo.ai/explainer-core'
import type { WordTiming } from './ports.js'

/**
 * The synchronisation spine.
 *
 * A script says `[[cue:c2]]` between two words. Text-to-speech reports when each *word* was
 * spoken. This maps one onto the other: a cue happens when the word after it begins.
 *
 * That single rule is what makes a lesson survive translation. Regenerate the narration in
 * another language at a different speaking speed and the words land elsewhere on the clock,
 * but the cue still points at the same place in the sentence — so the visuals move with the
 * meaning rather than with a stopwatch.
 *
 * Everything here is pure. Vendors live in adapters; this is the logic they all feed.
 */

/** When a cue was reached, in seconds from the start of its narration line. */
export interface CueMark {
  readonly cue: string
  readonly at: number
}

export interface CueSyncOptions {
  /** Used only when a cue falls past the last word — the end of speech. */
  readonly totalDuration?: number
}

/**
 * Re-times every marker in `script` against the words a provider actually spoke.
 *
 * Words must be for the *cleaned* script, which is what the provider was given: markers are
 * instructions, never speech, so a provider that was handed them would read them aloud.
 */
export function cueMarksFrom(
  script: string,
  words: readonly WordTiming[],
  options: CueSyncOptions = {},
): CueMark[] {
  const segments = splitCues(script)
  const marks: CueMark[] = []
  let wordsSoFar = 0

  for (const segment of segments) {
    wordsSoFar += countWords(segment.text)
    if (segment.cue === undefined) continue

    const next = words[wordsSoFar]
    if (next) {
      marks.push({ cue: segment.cue, at: next.start })
      continue
    }

    // A cue after the final word fires at the end of speech rather than being dropped.
    // Dropping it would leave its beat waiting forever, and the element would never appear.
    const last = words[words.length - 1]
    marks.push({ cue: segment.cue, at: options.totalDuration ?? last?.end ?? 0 })
  }

  return marks
}

/**
 * Synthetic word timings, spaced evenly at the locale's rate.
 *
 * This is what lets a lesson play before anyone has paid for audio, and it is the reason
 * the keyless localhost path (R9) can show a real lesson rather than a static page. Worse
 * timing than the real thing, never broken.
 */
export function evenWords(text: string, wordsPerSecond: number, spaceless = false): WordTiming[] {
  const units = spaceless ? [...text.trim()] : text.trim().split(/\s+/).filter(Boolean)
  if (units.length === 0 || wordsPerSecond <= 0) return []

  const step = 1 / wordsPerSecond

  return units.map((word, index) => ({
    word,
    start: index * step,
    end: (index + 1) * step,
  }))
}

export interface CharTiming {
  readonly char: string
  readonly start: number
  readonly end: number
}

/**
 * Folds character-level alignment into words.
 *
 * Some providers report per character rather than per word. Converting here rather than in
 * each adapter means the shape reaching the engine is the same whatever spoke it — the
 * difference is a vendor detail, and vendor details are exactly what must not reach the
 * core (R8).
 */
export function charsToWords(chars: readonly CharTiming[]): WordTiming[] {
  const words: WordTiming[] = []
  let current: { word: string; start: number; end: number } | undefined

  for (const char of chars) {
    if (/\s/.test(char.char)) {
      if (current) {
        words.push(current)
        current = undefined
      }
      continue
    }

    if (current) {
      current = { word: current.word + char.char, start: current.start, end: char.end }
    } else {
      current = { word: char.char, start: char.start, end: char.end }
    }
  }

  if (current) words.push(current)
  return words
}

/**
 * Words are counted the same way `evenWords` splits them, and the same way the speech
 * estimate counts them. Three different notions of "word" would put the cue, the estimate
 * and the fallback timings quietly out of step with each other.
 */
function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).filter(Boolean).length
}
