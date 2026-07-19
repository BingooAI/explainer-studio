// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { DOCUMENT_VERSION, defaultPins } from '../src/index.js'

/**
 * A minimal but complete document, used as the base for tests that mutate one thing.
 *
 * Deliberately hand-written rather than generated: it doubles as the worked example a
 * contributor reads to understand the format, so it should look like something a person
 * would actually author.
 */
export const validDocument = {
  version: DOCUMENT_VERSION,
  meta: { id: 'photosynthesis-intro', title: 'lesson.title', targetMinutes: 5 },
  locales: ['en'],
  profiles: defaultPins,
  theme: 'default',
  scenes: [
    {
      id: 'opening',
      kind: 'exposition',
      phase: 'orient',
      layout: { template: 'teach', regions: { headline: ['title'], stage: ['leaf'] } },
      elements: [
        { id: 'title', type: 'text', region: 'headline', content: { key: 'scene.title' } },
        { id: 'leaf', type: 'image', region: 'stage', content: { ref: 'media/leaf' } },
      ],
      beats: [
        { id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'title' }] },
        { id: 'b2', cue: 'c2', actions: [{ verb: 'reveal', target: 'leaf' }] },
      ],
      narrations: [{ ref: 'opening.line1', at: 0 }],
    },
  ],
} as const

export const validBundle = {
  version: 'explainer-bundle/v1',
  documentId: 'photosynthesis-intro',
  locale: 'en',
  script: 'Latn',
  strings: { 'lesson.title': 'How plants eat', 'scene.title': 'Sunlight into sugar' },
  narration: {
    'opening.line1': {
      script: '[[cue:c1]]Plants make their own food. [[cue:c2]]It starts with a leaf.',
      marks: [
        { cue: 'c1', at: 0 },
        { cue: 'c2', at: 2.1 },
      ],
      words: [],
    },
  },
} as const

/**
 * Deep clone so a test can mutate freely without leaking into the next one.
 *
 * JSON round-trip rather than `structuredClone`, because the package compiles with no
 * platform lib types — the same constraint that keeps the engine pure (R7). The fixture is
 * plain JSON anyway, which is the only kind of value the format ever holds.
 */
export function cloneDocument(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(validDocument)) as Record<string, unknown>
}
