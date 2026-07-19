// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createRegistry, isKernelError, type RegistryEntry } from '../src/index.js'

const providerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
})

type ProviderDescriptor = z.infer<typeof providerSchema>
interface FakeProvider {
  readonly name: string
}

const entry = (
  id: string,
  overrides: Partial<RegistryEntry<ProviderDescriptor, FakeProvider>> = {},
): RegistryEntry<ProviderDescriptor, FakeProvider> => ({
  descriptor: { id, label: `Label for ${id}`, capabilities: [] },
  create: () => ({ name: id }),
  ...overrides,
})

const newRegistry = () =>
  createRegistry<ProviderDescriptor, FakeProvider>({ kind: 'provider', schema: providerSchema })

describe('createRegistry', () => {
  it('registers and retrieves an entry', () => {
    const registry = newRegistry()
    registry.register(entry('ollama'))

    expect(registry.has('ollama')).toBe(true)
    expect(registry.get('ollama')).toEqual({ name: 'ollama' })
    expect(registry.size).toBe(1)
  })

  it('exposes descriptors in registration order without running factories', () => {
    const registry = newRegistry()
    const create = vi.fn(() => ({ name: 'never' }))
    registry.registerAll([entry('first'), entry('second', { create }), entry('third')])

    expect(registry.ids()).toEqual(['first', 'second', 'third'])
    expect(registry.list().map((d) => d.label)).toEqual([
      'Label for first',
      'Label for second',
      'Label for third',
    ])
    // Listing is what a settings UI does on every render; it must stay cheap.
    expect(create).not.toHaveBeenCalled()
  })

  it('creates a value lazily and reuses it', () => {
    const registry = newRegistry()
    const create = vi.fn(() => ({ name: 'lazy' }))
    registry.register(entry('lazy', { create }))

    expect(create).not.toHaveBeenCalled()
    const first = registry.get('lazy')
    const second = registry.get('lazy')

    expect(create).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
  })

  describe('failure modes', () => {
    it('rejects a duplicate id', () => {
      const registry = newRegistry()
      registry.register(entry('dup'))

      expect(() => registry.register(entry('dup'))).toThrowError(/already registered/i)
      try {
        registry.register(entry('dup'))
      } catch (error) {
        expect(isKernelError(error) && error.code).toBe('REGISTRY_DUPLICATE_ID')
      }
    })

    it('rejects an invalid descriptor at registration, not at use', () => {
      const registry = newRegistry()
      const bad = { descriptor: { id: 'broken' }, create: () => ({ name: 'broken' }) }

      expect(() =>
        registry.register(bad as unknown as RegistryEntry<ProviderDescriptor, FakeProvider>),
      ).toThrow()
      // Loud and early: nothing was half-registered.
      expect(registry.has('broken')).toBe(false)
      expect(registry.size).toBe(0)
    })

    it('names the offending entry even when its descriptor failed validation', () => {
      const registry = newRegistry()
      const bad = { descriptor: { id: 'no-label' }, create: () => ({ name: 'x' }) }

      try {
        registry.register(bad as unknown as RegistryEntry<ProviderDescriptor, FakeProvider>)
        expect.unreachable('registration should have thrown')
      } catch (error) {
        expect(isKernelError(error)).toBe(true)
        if (!isKernelError(error)) return
        expect(error.code).toBe('REGISTRY_INVALID_DESCRIPTOR')
        expect(error.at).toBe('no-label')
        expect(error.hint).toContain('label')
      }
    })

    it('lists the available ids when one is unknown', () => {
      const registry = newRegistry()
      registry.registerAll([entry('anthropic'), entry('ollama')])

      try {
        registry.get('openai')
        expect.unreachable('get should have thrown')
      } catch (error) {
        expect(isKernelError(error)).toBe(true)
        if (!isKernelError(error)) return
        expect(error.code).toBe('REGISTRY_UNKNOWN_ID')
        // R15: an error a person can act on names what does exist.
        expect(error.hint).toContain('anthropic')
        expect(error.hint).toContain('ollama')
      }
    })

    it('says so plainly when nothing is registered at all', () => {
      const registry = newRegistry()
      try {
        registry.get('anything')
        expect.unreachable('get should have thrown')
      } catch (error) {
        expect(isKernelError(error) && error.hint).toContain('none are registered')
      }
    })

    it('wraps a throwing factory and keeps the cause', () => {
      const registry = newRegistry()
      const boom = new Error('missing base URL')
      registry.register(
        entry('broken', {
          create: () => {
            throw boom
          },
        }),
      )

      try {
        registry.get('broken')
        expect.unreachable('get should have thrown')
      } catch (error) {
        expect(isKernelError(error)).toBe(true)
        if (!isKernelError(error)) return
        expect(error.code).toBe('REGISTRY_FACTORY_FAILED')
        expect(error.at).toBe('broken')
        expect(error.hint).toContain('missing base URL')
        expect(error.cause).toBe(boom)
      }
    })

    it('retries a failed factory rather than caching the failure', () => {
      const registry = newRegistry()
      let attempts = 0
      registry.register(
        entry('flaky', {
          create: () => {
            attempts += 1
            if (attempts === 1) throw new Error('first attempt fails')
            return { name: 'recovered' }
          },
        }),
      )

      expect(() => registry.get('flaky')).toThrow()
      expect(registry.get('flaky')).toEqual({ name: 'recovered' })
    })
  })

  describe('embeddability (R16)', () => {
    it('keeps two registries fully independent', () => {
      const tenantA = newRegistry()
      const tenantB = newRegistry()

      tenantA.register(entry('shared', { create: () => ({ name: 'from-A' }) }))
      tenantB.register(entry('shared', { create: () => ({ name: 'from-B' }) }))
      tenantA.register(entry('only-in-a'))

      // The whole point of instance-based registries: no leakage between tenants.
      expect(tenantA.get('shared')).toEqual({ name: 'from-A' })
      expect(tenantB.get('shared')).toEqual({ name: 'from-B' })
      expect(tenantB.has('only-in-a')).toBe(false)
      expect(tenantA.size).toBe(2)
      expect(tenantB.size).toBe(1)
    })

    it('does not share created values between instances', () => {
      const one = newRegistry()
      const two = newRegistry()
      one.register(entry('p'))
      two.register(entry('p'))

      expect(one.get('p')).not.toBe(two.get('p'))
    })
  })
})

describe('KernelError', () => {
  it('folds the location and hint into the message', () => {
    // `.message` is what a stack trace and most loggers show. A hint kept only as a
    // property is a hint most readers never see, which defeats the point of writing one.
    const registry = newRegistry()
    registry.register(entry('anthropic'))

    try {
      registry.get('openai')
      expect.unreachable('get should have thrown')
    } catch (error) {
      expect(isKernelError(error)).toBe(true)
      if (!isKernelError(error)) return
      expect(error.message).toContain('openai')
      expect(error.message).toContain('anthropic')
      // The structured parts stay available for callers that want to branch on them.
      expect(isKernelError(error) && error.code).toBe('REGISTRY_UNKNOWN_ID')
    }
  })
})
