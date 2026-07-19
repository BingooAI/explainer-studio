// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { isKernelError } from '@bingoo.ai/explainer-kernel'
import { describe, expect, it } from 'vitest'
import {
  createTemplateRegistry,
  defaultLayout,
  defaultSpeech,
  defaultType,
  charBudget,
  registerTemplate,
  resolveFontSize,
  resolveLayout,
  spokenSeconds,
  type Scene,
} from '../src/index.js'

const templates = () => createTemplateRegistry()
const options = () => ({ templates: templates(), layout: defaultLayout })

const sceneWith = (overrides: Partial<Scene> = {}): Scene => ({
  id: 's1',
  kind: 'exposition',
  layout: { template: 'teach', regions: { headline: ['title'], stage: ['a', 'b'] }, overrides: {} },
  elements: [element('title', 'headline'), element('a', 'stage'), element('b', 'stage')],
  beats: [],
  narrations: [],
  ...overrides,
})

/** Looks up a placement and fails loudly if it is absent, so a missing one is not a
 *  confusing `undefined` three assertions later. */
const placementOf = (result: ReturnType<typeof resolveLayout>, id: string) => {
  const found = result.placements.find((p) => p.id === id)
  if (!found) throw new Error(`no placement for "${id}"`)
  return found
}

const element = (id: string, region: string, grow = 0, order = 0) =>
  ({
    id,
    type: 'text',
    region,
    flow: { order, grow, align: 'center' as const },
    content: {},
    style: {},
    poses: {},
    startVisible: false,
    z: 0,
  }) as Scene['elements'][number]

describe('resolveLayout', () => {
  it('places every element and reports nothing for a well-formed scene', () => {
    const result = resolveLayout(sceneWith(), '16:9', options())

    expect(result.issues).toEqual([])
    expect(result.placements.map((p) => p.id).sort()).toEqual(['a', 'b', 'title'])
    expect(result.canvas).toEqual({ width: 1600, height: 900 })
  })

  it('is deterministic — the same input gives a deeply equal result', () => {
    // The layout gate and the renderer must agree exactly; if this drifts, the gate starts
    // approving layouts the renderer then breaks.
    const scene = sceneWith()
    const first = resolveLayout(scene, '16:9', options())
    const second = resolveLayout(scene, '16:9', options())

    expect(second).toEqual(first)
  })

  it('keeps siblings inside their slot and clear of each other', () => {
    const result = resolveLayout(sceneWith(), '16:9', options())
    const slot = result.slots['stage']!
    const a = placementOf(result, 'a')
    const b = placementOf(result, 'b')

    for (const rect of [a.rect, b.rect]) {
      expect(rect.x).toBeGreaterThanOrEqual(slot.x)
      expect(rect.y).toBeGreaterThanOrEqual(slot.y)
      expect(rect.x + rect.width).toBeLessThanOrEqual(slot.x + slot.width + 1e-6)
    }
    // `stage` is a row in 16:9, so they sit side by side without overlapping.
    expect(a.rect.x + a.rect.width).toBeLessThanOrEqual(b.rect.x + 1e-6)
  })

  it('honours flow order rather than array order', () => {
    const scene = sceneWith({
      elements: [element('second', 'stage', 0, 2), element('first', 'stage', 0, 1)],
      layout: { template: 'teach', regions: { stage: ['second', 'first'] }, overrides: {} },
    })

    const result = resolveLayout(scene, '16:9', options())
    const first = placementOf(result, 'first')
    const second = placementOf(result, 'second')

    expect(first.rect.x).toBeLessThan(second.rect.x)
  })

  it('gives a grown element proportionally more space', () => {
    const scene = sceneWith({
      elements: [element('small', 'stage'), element('big', 'stage', 3)],
      layout: { template: 'teach', regions: { stage: ['small', 'big'] }, overrides: {} },
    })

    const result = resolveLayout(scene, '16:9', options())
    const small = placementOf(result, 'small')
    const big = placementOf(result, 'big')

    // Weights are 1 and 4, so the ratio is 4:1 give or take the gap.
    expect(big.rect.width / small.rect.width).toBeCloseTo(4, 1)
  })

  it('lays the same scene out differently in portrait', () => {
    const landscape = resolveLayout(sceneWith(), '16:9', options())
    const portrait = resolveLayout(sceneWith(), '9:16', options())

    expect(portrait.issues).toEqual([])
    expect(portrait.canvas).toEqual({ width: 900, height: 1600 })

    // `stage` is a row in landscape and a column in portrait, so siblings stack.
    const pa = placementOf(portrait, 'a')
    const pb = placementOf(portrait, 'b')
    expect(pa.rect.y + pa.rect.height).toBeLessThanOrEqual(pb.rect.y + 1e-6)
    expect(landscape.placements[0]!.rect).not.toEqual(portrait.placements[0]!.rect)
  })

  it('applies a per-aspect region override', () => {
    const scene = sceneWith({
      layout: {
        template: 'teach',
        regions: { headline: ['title'], stage: ['a', 'b'] },
        overrides: { '9:16': { headline: ['title'], stage: ['a'] } },
      },
    })

    const portrait = resolveLayout(scene, '9:16', options())
    // `b` is deliberately dropped in portrait, so it is reported as unplaced rather than
    // silently vanishing.
    expect(portrait.issues.map((i) => i.code)).toEqual(['UNPLACED_ELEMENT'])
    expect(portrait.issues[0]!.at).toBe('b')
  })

  describe('issues', () => {
    it('reports an unknown template and names the ones that exist', () => {
      const scene = sceneWith({ layout: { template: 'nonsense', regions: {}, overrides: {} } })
      const result = resolveLayout(scene, '16:9', options())

      expect(result.issues[0]!.code).toBe('UNKNOWN_TEMPLATE')
      expect(result.issues[0]!.fix).toContain('teach')
    })

    it('reports an unsupported aspect', () => {
      const result = resolveLayout(sceneWith(), '4:3', options())

      expect(result.issues[0]!.code).toBe('UNSUPPORTED_ASPECT')
      expect(result.issues[0]!.fix).toContain('16:9')
    })

    it('reports a region the template does not have', () => {
      const scene = sceneWith({
        layout: { template: 'teach', regions: { sidebar: ['title'] }, overrides: {} },
      })
      const result = resolveLayout(scene, '16:9', options())
      const codes = result.issues.map((i) => i.code)

      expect(codes).toContain('UNKNOWN_REGION')
      expect(result.issues.find((i) => i.code === 'UNKNOWN_REGION')!.fix).toContain('headline')
    })

    it('reports an element that is never placed', () => {
      // Silent invisibility is the expensive failure: the lesson still plays, so nobody
      // notices until a class does.
      const scene = sceneWith({
        layout: { template: 'teach', regions: { headline: ['title'] }, overrides: {} },
      })
      const result = resolveLayout(scene, '16:9', options())
      const unplaced = result.issues.filter((i) => i.code === 'UNPLACED_ELEMENT')

      expect(unplaced.map((i) => i.at).sort()).toEqual(['a', 'b'])
    })

    it('reports a region listing an element the scene does not define', () => {
      const scene = sceneWith({
        layout: { template: 'teach', regions: { headline: ['ghost'], stage: ['a', 'b'] }, overrides: {} },
      })
      const result = resolveLayout(scene, '16:9', options())

      expect(result.issues.some((i) => i.code === 'MISSING_ELEMENT' && i.at === 'ghost')).toBe(true)
    })

    it('reports a slot crowded past usefulness', () => {
      const many = Array.from({ length: 30 }, (_, i) => element(`e${i}`, 'stage'))
      const scene = sceneWith({
        elements: many,
        layout: { template: 'teach', regions: { stage: many.map((e) => e.id) }, overrides: {} },
      })

      const result = resolveLayout(scene, '16:9', options())
      const crowded = result.issues.find((i) => i.code === 'SLOT_TOO_SMALL')

      expect(crowded).toBeDefined()
      expect(crowded!.fix).toContain('another region')
    })

    it('carries a mechanical fix on every issue', () => {
      // Repair has to be deterministic, not a vague retry: each fix is fed back to the
      // model as an instruction.
      const scene = sceneWith({ layout: { template: 'ghost', regions: {}, overrides: {} } })
      const result = resolveLayout(scene, '16:9', options())

      for (const issue of result.issues) {
        expect(issue.fix.length, issue.code).toBeGreaterThan(10)
      }
    })
  })
})

describe('registerTemplate', () => {
  it('rejects overlapping slots', () => {
    // Collision detection lives here, once, which is why the layout algorithm needs none.
    const registry = createTemplateRegistry({ includeBuiltIns: false })

    try {
      registerTemplate(registry, {
        id: 'broken',
        slots: {
          '16:9': [
            { name: 'a', x: 0, y: 0, width: 0.6, height: 1, direction: 'column', gap: 0.02 },
            { name: 'b', x: 0.4, y: 0, width: 0.6, height: 1, direction: 'column', gap: 0.02 },
          ],
        },
      })
      expect.unreachable('registration should have thrown')
    } catch (error) {
      expect(isKernelError(error)).toBe(true)
      if (!isKernelError(error)) return
      expect(error.message).toContain('overlap')
      expect(error.message).toContain('"a"')
    }
  })

  it('accepts slots that merely touch', () => {
    const registry = createTemplateRegistry({ includeBuiltIns: false })

    expect(() =>
      registerTemplate(registry, {
        id: 'adjacent',
        slots: {
          '16:9': [
            { name: 'a', x: 0, y: 0, width: 0.5, height: 1, direction: 'column', gap: 0.02 },
            { name: 'b', x: 0.5, y: 0, width: 0.5, height: 1, direction: 'column', gap: 0.02 },
          ],
        },
      }),
    ).not.toThrow()
  })

  it('rejects a slot that runs off the canvas', () => {
    const registry = createTemplateRegistry({ includeBuiltIns: false })

    expect(() =>
      registerTemplate(registry, {
        id: 'overhang',
        slots: {
          '16:9': [{ name: 'a', x: 0.8, y: 0, width: 0.5, height: 1, direction: 'column', gap: 0.02 }],
        },
      }),
    ).toThrowError(/past the canvas/i)
  })

  it('rejects duplicate slot names', () => {
    const registry = createTemplateRegistry({ includeBuiltIns: false })

    expect(() =>
      registerTemplate(registry, {
        id: 'dup',
        slots: {
          '16:9': [
            { name: 'a', x: 0, y: 0, width: 0.4, height: 1, direction: 'column', gap: 0.02 },
            { name: 'a', x: 0.5, y: 0, width: 0.4, height: 1, direction: 'column', gap: 0.02 },
          ],
        },
      }),
    ).toThrowError(/share a name/i)
  })
})

describe('built-in templates', () => {
  it('defines both aspects for every template', () => {
    for (const template of createTemplateRegistry().list()) {
      expect(Object.keys(template.slots).sort(), template.id).toEqual(['16:9', '9:16'])
    }
  })
})

describe('charBudget', () => {
  const canvas = { width: 1600, height: 900 }

  it('gives more characters to a wider rectangle', () => {
    const narrow = charBudget(
      { x: 0, y: 0, width: 200, height: 200 },
      { type: defaultType, speech: defaultSpeech, canvas },
    )
    const wide = charBudget(
      { x: 0, y: 0, width: 800, height: 200 },
      { type: defaultType, speech: defaultSpeech, canvas },
    )

    expect(wide).toBeGreaterThan(narrow)
  })

  it('gives fewer characters at a larger rung', () => {
    const rect = { x: 0, y: 0, width: 800, height: 300 }
    const body = charBudget(rect, { type: defaultType, speech: defaultSpeech, canvas, rung: 'body' })
    const huge = charBudget(rect, { type: defaultType, speech: defaultSpeech, canvas, rung: 'huge' })

    expect(huge).toBeLessThan(body)
  })

  it('budgets fewer characters for a wide script', () => {
    // Bingoo used one Latin constant, so a Han lesson budgeted roughly twice what fits —
    // and the mistake was invisible to a reviewer who read the other language.
    const rect = { x: 0, y: 0, width: 800, height: 300 }
    const latin = charBudget(rect, { type: defaultType, speech: defaultSpeech, canvas, script: 'Latn' })
    const han = charBudget(rect, { type: defaultType, speech: defaultSpeech, canvas, script: 'Hani' })

    expect(han).toBeLessThan(latin)
  })

  it('returns whole characters and never a fractional budget', () => {
    const budget = charBudget(
      { x: 0, y: 0, width: 333, height: 177 },
      { type: defaultType, speech: defaultSpeech, canvas },
    )
    expect(Number.isInteger(budget)).toBe(true)
  })

  it('returns zero for a rectangle with no room', () => {
    expect(
      charBudget({ x: 0, y: 0, width: 0, height: 0 }, { type: defaultType, speech: defaultSpeech, canvas }),
    ).toBe(0)
  })

  it('honours a line cap', () => {
    const rect = { x: 0, y: 0, width: 800, height: 600 }
    const capped = charBudget(rect, { type: defaultType, speech: defaultSpeech, canvas, maxLines: 1 })
    const uncapped = charBudget(rect, { type: defaultType, speech: defaultSpeech, canvas })

    expect(capped).toBeLessThan(uncapped)
  })
})

describe('resolveFontSize', () => {
  it('falls back to the default rung for an unknown name', () => {
    const canvas = { width: 1600, height: 900 }
    const unknown = resolveFontSize(defaultType, canvas, 'does-not-exist')
    const fallback = resolveFontSize(defaultType, canvas)

    expect(unknown).toEqual(fallback)
  })

  it('scales with the short side, so a rung looks the same in both aspects', () => {
    const landscape = resolveFontSize(defaultType, { width: 1600, height: 900 }, 'body')
    const portrait = resolveFontSize(defaultType, { width: 900, height: 1600 }, 'body')

    expect(landscape.size).toBe(portrait.size)
  })
})

describe('spokenSeconds', () => {
  it('estimates from word count for a spaced script', () => {
    const seconds = spokenSeconds('one two three four five', defaultSpeech, 'Latn')
    expect(seconds).toBeCloseTo(5 / 2.6, 5)
  })

  it('counts characters for a script without spaces', () => {
    // Counting whitespace in Han would report one "word" for an entire sentence.
    const seconds = spokenSeconds('植物自己制造食物', defaultSpeech, 'Hani')
    expect(seconds).toBeCloseTo(8 / 4.2, 5)
  })

  it('returns zero for empty or whitespace-only text', () => {
    expect(spokenSeconds('', defaultSpeech)).toBe(0)
    expect(spokenSeconds('   \n  ', defaultSpeech)).toBe(0)
  })

  it('falls back to the default script for an unknown one', () => {
    expect(spokenSeconds('one two', defaultSpeech, 'Xxxx')).toBe(
      spokenSeconds('one two', defaultSpeech, 'Latn'),
    )
  })
})
