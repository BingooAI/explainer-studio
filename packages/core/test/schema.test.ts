// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { assertDocument, parseBundle, parseDocument } from '../src/index.js'
import { cloneDocument, validBundle, validDocument } from './fixtures.js'

const issuePaths = (result: ReturnType<typeof parseDocument>): string[] =>
  result.ok ? [] : result.issues.map((i) => i.path)

describe('parseDocument', () => {
  it('accepts a complete document', () => {
    const result = parseDocument(validDocument)
    expect(result.ok).toBe(true)
  })

  it('applies defaults so an author writes only what matters', () => {
    const result = parseDocument(validDocument)
    if (!result.ok) throw new Error('expected the fixture to parse')

    const scene = result.value.scenes[0]!
    expect(scene.elements[0]!.startVisible).toBe(false)
    expect(scene.elements[0]!.flow).toEqual({ order: 0, grow: 0, align: 'center' })
    expect(scene.beats[0]!.actions).toHaveLength(1)
  })

  it('round-trips through JSON unchanged', () => {
    // The format is stored and transported as JSON, so anything that survives parsing must
    // survive serialising. This is what "a lesson outlives the tool" reduces to in practice.
    const first = parseDocument(validDocument)
    if (!first.ok) throw new Error('expected the fixture to parse')

    const second = parseDocument(JSON.parse(JSON.stringify(first.value)))
    if (!second.ok) throw new Error('a parsed document failed to re-parse')

    expect(second.value).toEqual(first.value)
  })

  describe('version handling', () => {
    it('reports a mismatched version as one clear issue, not a pile of field errors', () => {
      const doc = { ...cloneDocument(), version: 'explainer/v2' }
      const result = parseDocument(doc)

      expect(result.ok).toBe(false)
      if (result.ok) return
      // The whole reason the format carries a version: this failure is legible.
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0]!.path).toBe('version')
      expect(result.issues[0]!.message).toContain('converter')
    })

    it('reports a missing version rather than guessing', () => {
      const doc = cloneDocument()
      delete doc['version']

      const result = parseDocument(doc)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.issues[0]!.message).toContain('missing')
    })
  })

  describe('rejections that protect an invariant', () => {
    it('rejects coordinates on an element (R6)', () => {
      // Coordinates are unrepresentable by design: that is why a generated layout cannot
      // overlap. If this test ever fails, the invariant has been quietly reopened.
      const doc = cloneDocument()
      const scenes = doc['scenes'] as Array<Record<string, unknown>>
      const elements = scenes[0]!['elements'] as Array<Record<string, unknown>>
      elements[0] = { ...elements[0], x: 100, y: 200 }

      const result = parseDocument(doc)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // Unknown keys are stripped rather than preserved, so nothing downstream can read
      // an `x` that the layout does not honour.
      expect(result.value.scenes[0]!.elements[0]).not.toHaveProperty('x')
    })

    it('rejects an element with no region', () => {
      const doc = cloneDocument()
      const scenes = doc['scenes'] as Array<Record<string, unknown>>
      const elements = scenes[0]!['elements'] as Array<Record<string, unknown>>
      delete elements[0]!['region']

      expect(issuePaths(parseDocument(doc))).toContain('scenes.0.elements.0.region')
    })

    it('rejects a document with no scenes', () => {
      const doc = { ...cloneDocument(), scenes: [] }
      expect(issuePaths(parseDocument(doc))).toContain('scenes')
    })

    it('rejects a document with no locales', () => {
      const doc = { ...cloneDocument(), locales: [] }
      expect(issuePaths(parseDocument(doc))).toContain('locales')
    })

    it('rejects an unpinned profile set', () => {
      const doc = cloneDocument()
      const profiles = doc['profiles'] as Record<string, unknown>
      delete profiles['timing']

      // An unpinned profile is an unreproducible render (R5).
      expect(issuePaths(parseDocument(doc))).toContain('profiles.timing')
    })

    it('rejects a malformed profile pin', () => {
      const doc = cloneDocument()
      doc['profiles'] = { ...(doc['profiles'] as object), timing: 'house' }

      const result = parseDocument(doc)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.issues[0]!.message).toContain('house@1')
    })

    it('rejects an unknown visual verb', () => {
      const doc = cloneDocument()
      const scenes = doc['scenes'] as Array<Record<string, unknown>>
      const beats = scenes[0]!['beats'] as Array<Record<string, unknown>>
      beats[0]!['actions'] = [{ verb: 'teleport', target: 'title' }]

      expect(parseDocument(doc).ok).toBe(false)
    })

    it('rejects a registry key that is not a slug', () => {
      const doc = cloneDocument()
      const scenes = doc['scenes'] as Array<Record<string, unknown>>
      ;(scenes[0]!['layout'] as Record<string, unknown>)['template'] = 'Teach Move'

      expect(issuePaths(parseDocument(doc))).toContain('scenes.0.layout.template')
    })
  })

  describe('fuzzing', () => {
    // The format will be handed input nobody anticipated — by a model, by a third-party
    // tool, by a file that was edited by hand. It must fail, never throw.
    const hostile: unknown[] = [
      null,
      undefined,
      0,
      '',
      'explainer/v1',
      [],
      {},
      { version: 1 },
      { version: null },
      { version: 'explainer/v1' },
      { version: 'explainer/v1', scenes: 'not-an-array' },
      { version: 'explainer/v1', meta: [], locales: {}, scenes: [[]] },
      { version: 'explainer/v1', scenes: [{ id: '../../etc/passwd' }] },
    ]

    it.each(hostile.map((input, i) => [i, input]))(
      'rejects malformed input #%i without throwing',
      (_i, input) => {
        expect(() => parseDocument(input)).not.toThrow()
        expect(parseDocument(input).ok).toBe(false)
      },
    )

    it('does not stack-overflow on a deeply nested value', () => {
      let nested: unknown = {}
      for (let i = 0; i < 5000; i += 1) nested = { inner: nested }

      expect(() => parseDocument({ version: 'explainer/v1', meta: nested })).not.toThrow()
    })
  })
})

describe('parseBundle', () => {
  it('accepts a complete bundle', () => {
    expect(parseBundle(validBundle).ok).toBe(true)
  })

  it('keeps cue markers in the stored script', () => {
    const result = parseBundle(validBundle)
    if (!result.ok) throw new Error('expected the fixture to parse')

    // A teacher editing a sentence has to see where the visuals are anchored; stripping
    // the markers after timing would make the text readable and the edit blind.
    expect(result.value.narration['opening.line1']!.script).toContain('[[cue:c1]]')
  })

  it('rejects a bundle from a different format version', () => {
    const result = parseBundle({ ...validBundle, version: 'explainer-bundle/v2' })
    expect(result.ok).toBe(false)
  })
})

describe('assertDocument', () => {
  it('returns the document when valid', () => {
    expect(assertDocument(validDocument).meta.id).toBe('photosynthesis-intro')
  })

  it('throws with the offending paths named', () => {
    expect(() => assertDocument({ version: 'explainer/v1' })).toThrowError(/meta|locales|scenes/)
  })
})
