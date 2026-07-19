// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { isKernelError, resolveConfig } from '../src/index.js'

const schema = z.object({
  storage: z.object({
    kind: z.enum(['filesystem', 's3']),
    bucket: z.string().optional(),
  }),
  routing: z.object({
    llm: z.array(z.string()),
  }),
  telemetry: z.boolean().default(false),
})

const defaults = {
  name: 'built-in defaults',
  values: { storage: { kind: 'filesystem' }, routing: { llm: ['local'] } },
}

describe('resolveConfig', () => {
  it('validates and returns the defaults when nothing overrides them', () => {
    const { value, sources } = resolveConfig({ schema, layers: [defaults] })

    expect(value.storage.kind).toBe('filesystem')
    expect(value.telemetry).toBe(false)
    expect(sources).toEqual(['built-in defaults'])
  })

  it('applies later layers over earlier ones', () => {
    const { value } = resolveConfig({
      schema,
      layers: [
        defaults,
        { name: 'config file', values: { storage: { kind: 's3', bucket: 'from-file' } } },
        { name: 'settings UI', values: { storage: { bucket: 'from-ui' } } },
      ],
    })

    // The UI wins for the person sitting in front of it (R14), while keeping what it
    // did not mention.
    expect(value.storage).toEqual({ kind: 's3', bucket: 'from-ui' })
  })

  it('merges objects deeply rather than replacing them', () => {
    const { value } = resolveConfig({
      schema,
      layers: [defaults, { name: 'file', values: { storage: { bucket: 'b' } } }],
    })

    expect(value.storage).toEqual({ kind: 'filesystem', bucket: 'b' })
  })

  it('replaces arrays instead of concatenating them', () => {
    const { value } = resolveConfig({
      schema,
      layers: [defaults, { name: 'file', values: { routing: { llm: ['cloud'] } } }],
    })

    // Concatenation would make it impossible to drop a default from a routing chain.
    expect(value.routing.llm).toEqual(['cloud'])
  })

  it('treats undefined as "say nothing", not "unset"', () => {
    const { value } = resolveConfig({
      schema,
      layers: [defaults, { name: 'partial UI state', values: { storage: { kind: undefined } } }],
    })

    expect(value.storage.kind).toBe('filesystem')
  })

  it('skips layers that are absent entirely', () => {
    const { sources, value } = resolveConfig({
      schema,
      layers: [defaults, { name: 'missing file', values: undefined }, { name: 'env', values: null }],
    })

    expect(sources).toEqual(['built-in defaults'])
    expect(value.storage.kind).toBe('filesystem')
  })

  it('interpolates environment references before validating', () => {
    const { value } = resolveConfig({
      schema,
      layers: [defaults, { name: 'file', values: { storage: { kind: 's3', bucket: '${BUCKET}' } } }],
      env: { BUCKET: 'lessons-prod' },
    })

    expect(value.storage.bucket).toBe('lessons-prod')
  })

  describe('failure modes', () => {
    it('reports the offending path and the layers that were applied', () => {
      try {
        resolveConfig({
          schema,
          layers: [defaults, { name: 'config file', values: { storage: { kind: 'ftp' } } }],
        })
        expect.unreachable('resolveConfig should have thrown')
      } catch (error) {
        expect(isKernelError(error)).toBe(true)
        if (!isKernelError(error)) return
        expect(error.code).toBe('CONFIG_INVALID')
        expect(error.hint).toContain('storage.kind')
        // Knowing which layers contributed is what turns a support ticket into a fix.
        expect(error.hint).toContain('built-in defaults → config file')
      }
    })

    it('fails when a required value is missing from every layer', () => {
      try {
        resolveConfig({ schema, layers: [{ name: 'empty', values: {} }] })
        expect.unreachable('resolveConfig should have thrown')
      } catch (error) {
        expect(isKernelError(error) && error.code).toBe('CONFIG_INVALID')
      }
    })
  })
})
