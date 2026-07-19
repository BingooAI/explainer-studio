// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { LayoutProfile, SpeechProfile, TimingProfile, TypeProfile } from './schema.js'

/**
 * The built-in profiles. These are defaults, not constants: a deployment registers its own
 * and pins them per document (ARCHITECTURE §2.3).
 *
 * Changing a number here is a **breaking change to every document pinned at this version**,
 * so it requires a new version rather than an edit. That rule is the whole point — it is
 * what lets us improve the house style without redefining lessons that already exist.
 */

/**
 * Values carried over from the Bingoo implementation, where they were tuned against real
 * lessons watched by real classes. They are inherited rather than derived, and that is the
 * honest description: they look arbitrary because taste is arbitrary, but they are taste
 * that has been tested.
 */
export const houseTiming: TimingProfile = {
  id: 'house',
  version: 1,
  kind: 'timing',
  reveal: { duration: 0.28, easing: [0.22, 0.61, 0.36, 1] },
  stagger: 0.06,
  draw: { duration: 0.8, easing: [0.65, 0, 0.35, 1] },
  move: { duration: 0.45, easing: [0.22, 0.61, 0.36, 1] },
  exit: { duration: 0.22, easing: [0.55, 0, 1, 0.45] },
  transition: { duration: 0.35, easing: [0.22, 0.61, 0.36, 1] },
  beatHold: 0.15,
}

/**
 * 1600×900 and 900×1600 are the same pixel count rotated, so a lesson costs the same to
 * render either way and the two aspects stay directly comparable when the gate measures
 * overflow in both.
 */
export const defaultLayout: LayoutProfile = {
  id: 'default',
  version: 1,
  kind: 'layout',
  canvas: {
    '16:9': { width: 1600, height: 900 },
    '9:16': { width: 900, height: 1600 },
  },
  fillRatio: 0.94,
  overlapRatio: 0.5,
  slotPadding: 0.04,
  horizon: { '16:9': 0.8, '9:16': 0.74 },
}

/** Sizes are fractions of the canvas short side, so the scale holds in both aspects. */
export const defaultType: TypeProfile = {
  id: 'default',
  version: 1,
  kind: 'type',
  rungs: {
    huge: { size: 0.14, lineHeight: 1.1 },
    title: { size: 0.085, lineHeight: 1.15 },
    body: { size: 0.05, lineHeight: 1.35 },
    caption: { size: 0.038, lineHeight: 1.3 },
    label: { size: 0.03, lineHeight: 1.2 },
  },
  defaultRung: 'body',
}

/**
 * Speech rate varies by script far more than by speaker. These are starting points, and
 * every one of them should be corrected by somebody who actually speaks the language —
 * which is exactly why they are data a contributor can change rather than a constant they
 * would have to argue about in a pull request against the engine.
 */
export const defaultSpeech: SpeechProfile = {
  id: 'default',
  version: 1,
  kind: 'speech',
  byScript: {
    // Latin scripts: English, Vietnamese, Spanish, and most of Europe.
    Latn: { wordsPerSecond: 2.6, glyphWidth: 0.52 },
    // Han: far fewer, far denser characters per second of speech.
    Hani: { wordsPerSecond: 4.2, glyphWidth: 1.0 },
    Hang: { wordsPerSecond: 3.4, glyphWidth: 1.0 },
    Jpan: { wordsPerSecond: 4.0, glyphWidth: 1.0 },
    // Arabic and Devanagari are wider per glyph than Latin at the same size.
    Arab: { wordsPerSecond: 2.4, glyphWidth: 0.58 },
    Deva: { wordsPerSecond: 2.5, glyphWidth: 0.6 },
    Cyrl: { wordsPerSecond: 2.5, glyphWidth: 0.55 },
    Thai: { wordsPerSecond: 2.8, glyphWidth: 0.56 },
  },
  defaultScript: 'Latn',
}

export const builtInProfiles = [houseTiming, defaultLayout, defaultType, defaultSpeech] as const

/** What a new document pins unless it says otherwise. */
export const defaultPins = {
  timing: 'house@1',
  layout: 'default@1',
  type: 'default@1',
  speech: 'default@1',
} as const
