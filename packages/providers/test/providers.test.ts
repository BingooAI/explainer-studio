// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { isKernelError } from '@bingoo.ai/explainer-kernel'
import { describe, expect, it, vi } from 'vitest'
import {
  charsToWords,
  createProviderRegistry,
  cueMarksFrom,
  describeAvailable,
  evenWords,
  route,
  runWithFallback,
  type Capability,
  type LlmProvider,
} from '../src/index.js'

const words = (...pairs: Array<[string, number, number]>) =>
  pairs.map(([word, start, end]) => ({ word, start, end }))

describe('cueMarksFrom', () => {
  it('times a cue to the word that follows it', () => {
    const marks = cueMarksFrom(
      'One [[cue:c1]]two three',
      words(['One', 0, 0.5], ['two', 0.5, 1], ['three', 1, 1.5]),
    )

    expect(marks).toEqual([{ cue: 'c1', at: 0.5 }])
  })

  it('times a leading cue to the first word', () => {
    const marks = cueMarksFrom('[[cue:start]]One two', words(['One', 0.3, 0.8], ['two', 0.8, 1.2]))

    expect(marks).toEqual([{ cue: 'start', at: 0.3 }])
  })

  it('handles several cues in one line', () => {
    const marks = cueMarksFrom(
      '[[cue:a]]One two [[cue:b]]three [[cue:c]]four',
      words(['One', 0, 1], ['two', 1, 2], ['three', 2, 3], ['four', 3, 4]),
    )

    expect(marks).toEqual([
      { cue: 'a', at: 0 },
      { cue: 'b', at: 2 },
      { cue: 'c', at: 3 },
    ])
  })

  it('survives the same script spoken at a different speed', () => {
    // The property that makes a lesson translatable: regenerate the narration in another
    // language at a different pace and the cue still points at the same place in the
    // sentence, so the visuals move with the meaning rather than with a stopwatch.
    const script = 'One [[cue:mid]]two three'
    const fast = cueMarksFrom(script, words(['One', 0, 0.4], ['two', 0.4, 0.8], ['three', 0.8, 1.2]))
    const slow = cueMarksFrom(script, words(['One', 0, 1.5], ['two', 1.5, 3], ['three', 3, 4.5]))

    expect(fast[0]!.at).toBe(0.4)
    expect(slow[0]!.at).toBe(1.5)
  })

  it('fires a trailing cue at the end of speech rather than dropping it', () => {
    // A dropped cue leaves its beat waiting forever and the element never appears.
    const marks = cueMarksFrom('One two [[cue:end]]', words(['One', 0, 1], ['two', 1, 2]))

    expect(marks).toEqual([{ cue: 'end', at: 2 }])
  })

  it('prefers a supplied total duration for a trailing cue', () => {
    const marks = cueMarksFrom('One [[cue:end]]', words(['One', 0, 1]), { totalDuration: 3 })

    expect(marks[0]!.at).toBe(3)
  })

  it('returns nothing for a script with no cues', () => {
    expect(cueMarksFrom('Just words', words(['Just', 0, 1], ['words', 1, 2]))).toEqual([])
  })

  it('degrades to zero rather than throwing when there are no words at all', () => {
    expect(cueMarksFrom('[[cue:c1]]hello', [])).toEqual([{ cue: 'c1', at: 0 }])
  })

  it('is not confused by extra whitespace around a marker', () => {
    const marks = cueMarksFrom('One   [[cue:c1]]   two', words(['One', 0, 1], ['two', 1, 2]))

    expect(marks).toEqual([{ cue: 'c1', at: 1 }])
  })
})

describe('evenWords', () => {
  it('spaces words at the given rate', () => {
    const timings = evenWords('one two three', 2)

    expect(timings).toEqual([
      { word: 'one', start: 0, end: 0.5 },
      { word: 'two', start: 0.5, end: 1 },
      { word: 'three', start: 1, end: 1.5 },
    ])
  })

  it('counts characters for a script without spaces', () => {
    // Whitespace counting would report one "word" for an entire Han sentence.
    expect(evenWords('植物制造', 4, true)).toHaveLength(4)
  })

  it('returns nothing for empty text', () => {
    expect(evenWords('   ', 2)).toEqual([])
  })

  it('returns nothing rather than dividing by zero', () => {
    expect(evenWords('one two', 0)).toEqual([])
  })

  it('produces timings a cue can be synced against', () => {
    // This is what lets the keyless path (R9) show a real lesson rather than a static page.
    const timings = evenWords('One two three', 2)
    const marks = cueMarksFrom('One [[cue:c1]]two three', timings)

    expect(marks).toEqual([{ cue: 'c1', at: 0.5 }])
  })
})

describe('charsToWords', () => {
  const chars = (text: string, step = 0.1) =>
    [...text].map((char, i) => ({ char, start: i * step, end: (i + 1) * step }))

  it('folds characters into words at whitespace', () => {
    const result = charsToWords(chars('hi ok'))

    expect(result.map((w) => w.word)).toEqual(['hi', 'ok'])
  })

  it('spans each word from its first character to its last', () => {
    const [first] = charsToWords(chars('hi ok'))

    expect(first!.start).toBeCloseTo(0, 5)
    expect(first!.end).toBeCloseTo(0.2, 5)
  })

  it('handles trailing text with no final space', () => {
    expect(charsToWords(chars('abc'))).toHaveLength(1)
  })

  it('collapses runs of whitespace', () => {
    expect(charsToWords(chars('a   b'))).toHaveLength(2)
  })

  it('returns nothing for empty input', () => {
    expect(charsToWords([])).toEqual([])
  })
})

// A stand-in provider. Deliberately not named after any vendor — this package must not know
// one exists (R8).
const fakeLlm = (
  id: string,
  over: { available?: boolean; capabilities?: Capability[]; fail?: boolean } = {},
): LlmProvider => ({
  descriptor: () => ({
    id,
    kind: 'llm',
    label: `Provider ${id}`,
    capabilities: over.capabilities ?? [],
    local: false,
  }),
  available: () => over.available ?? true,
  complete: async () => {
    if (over.fail) throw new Error(`${id} refused`)
    return Promise.resolve({ text: `from ${id}`, model: id })
  },
})

const registryOf = (...providers: LlmProvider[]) => {
  const registry = createProviderRegistry<LlmProvider>('llm')
  for (const provider of providers) {
    registry.register({ descriptor: provider.descriptor(), create: () => provider })
  }
  return registry
}

describe('route', () => {
  it('returns providers in the configured order', () => {
    const registry = registryOf(fakeLlm('a'), fakeLlm('b'))
    const chain = route(registry, { order: ['b', 'a'] })

    expect(chain.map((p) => p.descriptor().id)).toEqual(['b', 'a'])
  })

  it('skips a provider that is not available', () => {
    const registry = registryOf(fakeLlm('a', { available: false }), fakeLlm('b'))

    expect(route(registry, { order: ['a', 'b'] }).map((p) => p.descriptor().id)).toEqual(['b'])
  })

  it('skips a provider that lacks a required capability', () => {
    // Asked of the descriptor, never inferred from the id — the moment one feature branches
    // on a provider name, adding the next provider means editing that branch.
    const registry = registryOf(fakeLlm('plain'), fakeLlm('thinker', { capabilities: ['thinking'] }))
    const chain = route(registry, { order: ['plain', 'thinker'], requires: ['thinking'] })

    expect(chain.map((p) => p.descriptor().id)).toEqual(['thinker'])
  })

  it('ignores an id that is not registered', () => {
    const registry = registryOf(fakeLlm('a'))

    expect(route(registry, { order: ['ghost', 'a'] })).toHaveLength(1)
  })

  it('returns nothing when the order is empty', () => {
    expect(route(registryOf(fakeLlm('a')), { order: [] })).toEqual([])
  })
})

describe('runWithFallback', () => {
  it('uses the first provider that works', async () => {
    const chain = route(registryOf(fakeLlm('a'), fakeLlm('b')), { order: ['a', 'b'] })
    const result = await runWithFallback(chain, (p) => p.complete({ messages: [] }))

    expect(result.providerId).toBe('a')
    expect(result.failures).toEqual([])
  })

  it('falls through to the next when one fails, and says which', async () => {
    // A lesson that quietly used the browser voice because a key expired is a support
    // ticket nobody can diagnose; one that says so is a setting fixed in a minute.
    const chain = route(registryOf(fakeLlm('paid', { fail: true }), fakeLlm('local')), {
      order: ['paid', 'local'],
    })
    const result = await runWithFallback(chain, (p) => p.complete({ messages: [] }))

    expect(result.providerId).toBe('local')
    expect(result.failures.map((f) => f.providerId)).toEqual(['paid'])
  })

  it('does not call a later provider when an earlier one succeeds', async () => {
    const second = fakeLlm('b')
    const spy = vi.spyOn(second, 'complete')
    const chain = route(registryOf(fakeLlm('a'), second), { order: ['a', 'b'] })

    await runWithFallback(chain, (p) => p.complete({ messages: [] }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('reports every attempt when the whole chain fails', async () => {
    const chain = route(registryOf(fakeLlm('a', { fail: true }), fakeLlm('b', { fail: true })), {
      order: ['a', 'b'],
    })

    await expect(runWithFallback(chain, (p) => p.complete({ messages: [] }))).rejects.toThrowError(
      /a refused.*b refused/s,
    )
  })

  it('explains an empty chain differently from a failed one', async () => {
    // "Nothing was configured" and "everything failed" need different fixes, so they must
    // not produce the same message.
    try {
      await runWithFallback([], async () => Promise.resolve('never'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isKernelError(error)).toBe(true)
      if (!isKernelError(error)) return
      expect(error.hint).toContain('None were configured')
    }
  })
})

describe('describeAvailable', () => {
  it('reports what a deployment actually has, not a hardcoded list', () => {
    const registry = registryOf(fakeLlm('ready'), fakeLlm('missing-key', { available: false }))
    const described = describeAvailable(registry)

    expect(described).toEqual([
      expect.objectContaining({ id: 'ready', available: true }),
      expect.objectContaining({ id: 'missing-key', available: false }),
    ])
  })
})
