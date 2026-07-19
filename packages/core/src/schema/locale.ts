// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'
import { locale, narrationId, stringKey } from './primitives.js'

/**
 * A locale bundle is one language's words for one document (R4).
 *
 * The split is what makes a lesson translatable without re-authoring it, and it is also
 * what makes narration timing reusable: the document holds the structure and the cues, the
 * bundle holds the script and when each word was actually spoken.
 */

/**
 * When a word was spoken, from the text-to-speech provider.
 *
 * This is why a lesson stays in sync rather than drifting: cue markers are re-timed to the
 * word that follows them, so the visuals follow the voice instead of a fixed timeline. A
 * provider that cannot report word timings gets an even-spacing estimate from the locale's
 * speech profile — worse, but never broken.
 */
export const wordTiming = z.object({
  word: z.string().max(128),
  start: z.number().min(0),
  end: z.number().min(0),
})

/** A cue marker resolved to the moment it was reached. */
export const cueMark = z.object({
  cue: z.string().min(1).max(64),
  at: z.number().min(0),
})

export const narration = z.object({
  /**
   * The spoken script, including `[[cue:x]]` markers.
   *
   * Markers stay in the stored script rather than being stripped after timing, because a
   * teacher editing a sentence must be able to see where the visuals are anchored. Removing
   * them would make the text readable and the edit blind.
   */
  script: z.string().max(20_000),
  /** Registry key for the voice, resolved by the voice provider. */
  voice: z.string().max(128).optional(),
  /** Reference into media storage — never a bucket URL, so a lesson survives a move (R16). */
  audioRef: z.string().max(512).optional(),
  durationSeconds: z.number().min(0).max(3600).optional(),
  marks: z.array(cueMark).max(256).default([]),
  words: z.array(wordTiming).max(20_000).default([]),
})

export type Narration = z.infer<typeof narration>

export const localeBundle = z.object({
  version: z.literal('explainer-bundle/v1'),
  /** The document this bundle belongs to. Checked when the two are paired. */
  documentId: z.string().min(1).max(128),
  locale,
  /** BCP-47 script subtag, selecting speech and glyph metrics. Inferred when absent. */
  script: z.string().max(8).optional(),
  /** Every string key the document references, resolved to text in this language. */
  strings: z.record(stringKey, z.string().max(4000)).default({}),
  narration: z.record(narrationId, narration).default({}),
})

export type LocaleBundle = z.infer<typeof localeBundle>
