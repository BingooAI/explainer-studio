// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { isKernelError } from '@bingoo.ai/explainer-kernel'
import { describe, expect, it } from 'vitest'
import {
  createProfileRegistry,
  defaultPins,
  defaultSpeech,
  formatProfileRef,
  houseTiming,
  parseProfileRef,
  listProfiles,
  registerProfile,
  resolveProfiles,
  type SpeechProfile,
  type TimingProfile,
} from '../src/index.js'

describe('profile references', () => {
  it('formats and parses symmetrically', () => {
    const ref = formatProfileRef(houseTiming)
    expect(ref).toBe('house@1')
    expect(parseProfileRef(ref)).toEqual({ id: 'house', version: 1 })
  })
})

describe('createProfileRegistry', () => {
  it('registers the built-ins by default', () => {
    const registry = createProfileRegistry()

    expect(registry.timing.ids()).toEqual(['house@1'])
    expect(registry.layout.ids()).toEqual(['default@1'])
    expect(registry.type.ids()).toEqual(['default@1'])
    expect(registry.speech.ids()).toEqual(['default@1'])
    expect(listProfiles(registry)).toHaveLength(4)
  })

  it('lets profiles of different kinds share a name', () => {
    // The built-in layout, type and speech profiles are all `default@1`. A single shared
    // registry would collide on that key and force an invented compound id; one registry
    // per kind keeps the id exactly what the document pins.
    const registry = createProfileRegistry()
    const shared = listProfiles(registry).filter((d) => d.id === 'default@1')

    expect(shared).toHaveLength(3)
    expect(shared.map((d) => d.kind).sort()).toEqual(['layout', 'speech', 'type'])
  })

  it('can start empty for a deployment that supplies its own', () => {
    expect(listProfiles(createProfileRegistry({ includeBuiltIns: false }))).toHaveLength(0)
  })

  it('keeps two registries independent (R16)', () => {
    const a = createProfileRegistry({ includeBuiltIns: false })
    const b = createProfileRegistry({ includeBuiltIns: false })
    registerProfile(a, houseTiming)

    expect(a.timing.size).toBe(1)
    expect(b.timing.size).toBe(0)
  })

  it('lets two versions of one profile coexist', () => {
    // The entire reason the version is inside the key: retuning the house style must not
    // change a lesson that pinned the older one.
    const registry = createProfileRegistry({ includeBuiltIns: false })
    const v2: TimingProfile = { ...houseTiming, version: 2, stagger: 0.12 }

    registerProfile(registry, houseTiming)
    registerProfile(registry, v2)

    expect(registry.timing.ids()).toEqual(['house@1', 'house@2'])
    expect(registry.timing.get('house@1').stagger).toBe(0.06)
    expect(registry.timing.get('house@2').stagger).toBe(0.12)
  })

  describe('failure modes', () => {
    it('rejects a type profile whose default rung is not defined', () => {
      const registry = createProfileRegistry({ includeBuiltIns: false })

      try {
        registerProfile(registry, {
          id: 'broken',
          version: 1,
          kind: 'type',
          rungs: { body: { size: 0.05, lineHeight: 1.3 } },
          defaultRung: 'headline',
        })
        expect.unreachable('registration should have thrown')
      } catch (error) {
        expect(isKernelError(error)).toBe(true)
        if (!isKernelError(error)) return
        // Structurally valid, functionally broken — caught here rather than as a missing
        // text size halfway through a render.
        expect(error.at).toBe('broken@1')
        expect(error.hint).toContain('body')
      }
    })

    it('rejects a speech profile whose default script has no metrics', () => {
      const registry = createProfileRegistry({ includeBuiltIns: false })
      const broken: SpeechProfile = { ...defaultSpeech, id: 'broken', defaultScript: 'Runr' }

      expect(() => registerProfile(registry, broken)).toThrowError(/default script/i)
    })

    it('rejects a layout profile with no canvas', () => {
      const registry = createProfileRegistry({ includeBuiltIns: false })

      expect(() =>
        registerProfile(registry, {
          id: 'empty',
          version: 1,
          kind: 'layout',
          canvas: {},
          fillRatio: 0.9,
          overlapRatio: 0.5,
          slotPadding: 0.04,
          horizon: { '16:9': 0.8 },
        }),
      ).toThrowError(/canvas/i)
    })

    it('rejects a profile with an out-of-range value', () => {
      const registry = createProfileRegistry({ includeBuiltIns: false })
      const bad = { ...houseTiming, id: 'bad', stagger: -1 }

      expect(() => registerProfile(registry, bad)).toThrow()
    })
  })
})

describe('resolveProfiles', () => {
  it('resolves the default pins to the built-ins', () => {
    const resolved = resolveProfiles(createProfileRegistry(), defaultPins)

    expect(resolved.timing.kind).toBe('timing')
    expect(resolved.layout.canvas['16:9']).toEqual({ width: 1600, height: 900 })
    expect(resolved.type.defaultRung).toBe('body')
    expect(resolved.speech.byScript['Latn']?.wordsPerSecond).toBe(2.6)
  })

  it('fails up front when a pinned profile is missing', () => {
    const registry = createProfileRegistry({ includeBuiltIns: false })
    registerProfile(registry, houseTiming)

    try {
      resolveProfiles(registry, defaultPins)
      expect.unreachable('resolution should have thrown')
    } catch (error) {
      expect(isKernelError(error)).toBe(true)
      if (!isKernelError(error)) return
      expect(error.code).toBe('REGISTRY_UNKNOWN_ID')
      // Resolution stops at the first missing profile, and names which kind is empty —
      // "layout", not a generic "profile not found".
      expect(error.message).toContain('layout profile')
      expect(error.hint).toContain('none are registered')
    }
  })

  it('rejects a pin that names a profile of the wrong kind', () => {
    // A layout profile in the timing slot would otherwise surface as bizarre animation
    // rather than as a clear failure. Splitting by kind makes this fall out for free: the
    // timing registry simply has no `default@1`, and says which timing profiles it has.
    const registry = createProfileRegistry()

    try {
      resolveProfiles(registry, { ...defaultPins, timing: 'default@1' })
      expect.unreachable('resolution should have thrown')
    } catch (error) {
      expect(isKernelError(error)).toBe(true)
      if (!isKernelError(error)) return
      expect(error.code).toBe('REGISTRY_UNKNOWN_ID')
      expect(error.hint).toContain('house@1')
    }
  })
})

describe('built-in profiles', () => {
  it('defines metrics for every script it claims to support', () => {
    for (const [script, metrics] of Object.entries(defaultSpeech.byScript)) {
      expect(metrics.wordsPerSecond, script).toBeGreaterThan(0)
      expect(metrics.glyphWidth, script).toBeGreaterThan(0)
    }
  })

  it('does not assume a Latin speech rate for every script', () => {
    // Bingoo hardcoded one rate tuned for Vietnamese; the failure mode was a lesson that
    // silently drifted out of sync in another language.
    const latin = defaultSpeech.byScript['Latn']!.wordsPerSecond
    const han = defaultSpeech.byScript['Hani']!.wordsPerSecond

    expect(han).not.toBe(latin)
  })
})
