// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { interpolateDeep, interpolateString, isKernelError } from '../src/index.js'

describe('interpolateString', () => {
  it('substitutes a set variable', () => {
    expect(interpolateString('${KEY}', { KEY: 'secret' })).toBe('secret')
  })

  it('substitutes within surrounding text and handles several references', () => {
    expect(interpolateString('http://${HOST}:${PORT}/v1', { HOST: 'localhost', PORT: '11434' })).toBe(
      'http://localhost:11434/v1',
    )
  })

  it('uses the fallback when the variable is unset', () => {
    expect(interpolateString('${MODEL:-qwen2.5:14b}', {})).toBe('qwen2.5:14b')
  })

  it('prefers the variable over its fallback', () => {
    expect(interpolateString('${MODEL:-fallback}', { MODEL: 'chosen' })).toBe('chosen')
  })

  it('accepts an empty fallback', () => {
    expect(interpolateString('${OPTIONAL:-}', {})).toBe('')
  })

  it('leaves a string with no reference untouched', () => {
    expect(interpolateString('plain value', { A: '1' })).toBe('plain value')
  })

  it('treats an empty environment value as set', () => {
    // A deliberately blank variable is a choice; overriding it with the fallback would
    // silently ignore what the operator asked for.
    expect(interpolateString('${EMPTY:-fallback}', { EMPTY: '' })).toBe('')
  })

  describe('pathological input', () => {
    // Regression: the fallback class was [^}]*, which could consume a following `${`
    // sequence and forced quadratic backtracking. CodeQL flagged it as a polynomial ReDoS.
    // A config file is not fully trusted input — it can come from a deployment we do not
    // control — so a parser that can be stalled by one is a real denial of service.
    // The timeout is the assertion. Measuring elapsed time would need a platform clock the
    // package deliberately cannot see, and a wall-clock threshold is flaky on shared CI
    // runners anyway. Measured on the old pattern this input took ~3000ms and on the fixed
    // one ~1ms, so a 1500ms budget sits between the two by a wide margin in both directions.
    it('does not backtrack quadratically on repeated unterminated references', () => {
      const hostile = '${A:-' + '${A:-|'.repeat(20_000)

      // The references are unterminated, so nothing matches and the input passes through.
      expect(interpolateString(hostile, {}, { onMissing: 'keep' })).toBe(hostile)
    }, 1500)

    it('still resolves a long but well-formed value', () => {
      const long = 'x'.repeat(50_000)
      expect(interpolateString('${LONG}', { LONG: long })).toBe(long)
    })
  })

  describe('missing variables', () => {
    it('throws by default, naming the variable and how to fix it', () => {
      try {
        interpolateString('${ANTHROPIC_API_KEY}', {})
        expect.unreachable('interpolateString should have thrown')
      } catch (error) {
        expect(isKernelError(error)).toBe(true)
        if (!isKernelError(error)) return
        expect(error.code).toBe('CONFIG_UNRESOLVED_VARIABLE')
        expect(error.at).toBe('ANTHROPIC_API_KEY')
        expect(error.hint).toContain('ANTHROPIC_API_KEY:-')
      }
    })

    it('can keep the reference verbatim', () => {
      expect(interpolateString('${NOPE}', {}, { onMissing: 'keep' })).toBe('${NOPE}')
    })

    it('can substitute an empty string', () => {
      expect(interpolateString('${NOPE}', {}, { onMissing: 'empty' })).toBe('')
    })
  })
})

describe('interpolateDeep', () => {
  it('walks nested objects and arrays', () => {
    const input = {
      providers: { llm: [{ apiKey: '${KEY}', model: '${MODEL:-default-model}' }] },
      port: 3000,
      enabled: true,
    }

    expect(interpolateDeep(input, { KEY: 'sk-test' })).toEqual({
      providers: { llm: [{ apiKey: 'sk-test', model: 'default-model' }] },
      port: 3000,
      enabled: true,
    })
  })

  it('leaves non-string values alone', () => {
    expect(interpolateDeep({ n: 1, b: false, nil: null }, {})).toEqual({ n: 1, b: false, nil: null })
  })

  it('does not interpolate object keys', () => {
    // A variable deciding a key name makes a config file unreadable to whoever audits it.
    const out = interpolateDeep({ '${KEY}': 'value' }, { KEY: 'substituted' })
    expect(Object.keys(out)).toEqual(['${KEY}'])
  })

  it('does not mutate its input', () => {
    const input = { a: '${V}' }
    const out = interpolateDeep(input, { V: 'x' })

    expect(input.a).toBe('${V}')
    expect(out).not.toBe(input)
  })
})
