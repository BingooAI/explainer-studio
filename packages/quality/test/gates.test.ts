// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import {
  createProfileRegistry,
  createTemplateRegistry,
  defaultPins,
  resolveProfiles,
  type ExplainerDocument,
  type LocaleBundle,
  type Scene,
} from '@bingoo.ai/explainer-core'
import { describe, expect, it } from 'vitest'
import {
  checkLesson,
  checkScene,
  createArcRegistry,
  errorsOf,
  lintDocument,
  repairInstructions,
} from '../src/index.js'

const el = (id: string, over: Record<string, unknown> = {}) =>
  ({
    id,
    type: 'text',
    region: 'stage',
    flow: { order: 0, grow: 0, align: 'center' as const },
    content: { key: 'k.body' },
    style: {},
    poses: {},
    startVisible: false,
    z: 0,
    ...over,
  }) as Scene['elements'][number]

const scene = (id: string, over: Partial<Scene> = {}): Scene => ({
  id,
  kind: 'exposition',
  phase: 'teach',
  layout: { template: 'teach', regions: { stage: ['a', 'b'] }, overrides: {} },
  elements: [el('a'), el('b')],
  beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] }],
  narrations: [{ ref: 'n1', at: 0 }],
  ...over,
})

const doc = (scenes: Scene[], over: Partial<ExplainerDocument> = {}): ExplainerDocument => ({
  version: 'explainer/v1',
  meta: { id: 'demo', title: 'k.title', tags: [] },
  locales: ['en'],
  profiles: defaultPins,
  theme: 'default',
  scenes,
  ...over,
})

const bundle = (over: Partial<LocaleBundle> = {}): LocaleBundle => ({
  version: 'explainer-bundle/v1',
  documentId: 'demo',
  locale: 'en',
  script: 'Latn',
  strings: { 'k.title': 'Title', 'k.body': 'Short' },
  narration: { n1: { script: '[[cue:c1]]Words here.', marks: [], words: [] } },
  ...over,
})

const sceneOptions = (strings: Record<string, string> = { 'k.body': 'Short' }) => ({
  profiles: resolveProfiles(createProfileRegistry(), defaultPins),
  templates: createTemplateRegistry(),
  strings,
})

describe('lintDocument', () => {
  it('passes a well-formed document', () => {
    const outcome = lintDocument(doc([scene('one')]), { bundles: [bundle()] })
    expect(errorsOf(outcome.findings)).toEqual([])
    expect(outcome.ok).toBe(true)
  })

  describe('cue integrity', () => {
    it('catches a beat waiting for a cue the narration never says', () => {
      // The beat never fires, the element stays hidden, and the lesson plays on without
      // it. Nothing errors at runtime — this gate is what notices.
      const s = scene('silent', { beats: [{ id: 'b1', cue: 'missing', actions: [] }] })
      const outcome = lintDocument(doc([s]), { bundles: [bundle()] })
      const finding = outcome.findings.find((f) => f.code === 'CUE_NEVER_SPOKEN')

      expect(finding?.severity).toBe('error')
      expect(finding?.fix).toContain('[[cue:missing]]')
    })

    it('warns about a spoken cue no beat responds to', () => {
      const outcome = lintDocument(doc([scene('one')]), {
        bundles: [
          bundle({
            narration: { n1: { script: '[[cue:c1]]One [[cue:orphan]]two', marks: [], words: [] } },
          }),
        ],
      })
      const finding = outcome.findings.find((f) => f.code === 'CUE_WITHOUT_BEAT')

      expect(finding?.severity).toBe('warn')
      expect(finding?.fix).toContain('orphan')
    })

    it('does not complain about a scene with no narration', () => {
      // A silent scene has nothing to sync against; its beats fall back to even spacing.
      const s = scene('silent', { narrations: [] })
      const outcome = lintDocument(doc([s]), { bundles: [bundle()] })

      expect(outcome.findings.some((f) => f.code === 'CUE_NEVER_SPOKEN')).toBe(false)
    })
  })

  describe('references', () => {
    it('catches a beat targeting an element that does not exist', () => {
      const s = scene('ghosts', {
        beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'ghost' }] }],
      })
      const finding = lintDocument(doc([s]), { bundles: [bundle()] }).findings.find(
        (f) => f.code === 'UNKNOWN_TARGET',
      )

      expect(finding?.severity).toBe('error')
      expect(finding?.fix).toContain('a, b')
    })

    it('catches a move to a pose the element does not define', () => {
      // At runtime this falls back to rest, so the move silently does nothing.
      const s = scene('poses', {
        beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'move', target: 'a', to: 'raised' }] }],
      })
      const finding = lintDocument(doc([s]), { bundles: [bundle()] }).findings.find(
        (f) => f.code === 'UNKNOWN_POSE',
      )

      expect(finding?.severity).toBe('error')
      expect(finding?.fix).toContain('raised')
    })

    it('accepts a move to base without a declared pose', () => {
      const s = scene('base', {
        beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'move', target: 'a', to: 'base' }] }],
      })

      expect(
        lintDocument(doc([s]), { bundles: [bundle()] }).findings.some((f) => f.code === 'UNKNOWN_POSE'),
      ).toBe(false)
    })

    it('checks both ends of a connector', () => {
      const s = scene('connect', {
        beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'connect', from: 'a', to: 'nowhere' }] }],
      })
      const findings = lintDocument(doc([s]), { bundles: [bundle()] }).findings

      expect(findings.filter((f) => f.code === 'UNKNOWN_TARGET')).toHaveLength(1)
    })
  })

  describe('duplicate ids', () => {
    it('catches two scenes sharing an id', () => {
      const findings = lintDocument(doc([scene('same'), scene('same')]), {
        bundles: [bundle()],
      }).findings

      expect(findings.some((f) => f.code === 'DUPLICATE_SCENE_ID')).toBe(true)
    })

    it('catches two elements sharing an id', () => {
      // Every beat targeting them becomes ambiguous, and layout and timing resolve the
      // ambiguity differently.
      const s = scene('dup', { elements: [el('a'), el('a')] })

      expect(
        lintDocument(doc([s]), { bundles: [bundle()] }).findings.some(
          (f) => f.code === 'DUPLICATE_ELEMENT_ID',
        ),
      ).toBe(true)
    })
  })

  describe('bundle coverage', () => {
    it('catches a missing string in a declared locale', () => {
      // A missing key renders blank rather than crashing, and usually in the locale nobody
      // on the team reads.
      const outcome = lintDocument(doc([scene('one')]), {
        bundles: [bundle({ strings: { 'k.title': 'Title' } })],
      })
      const finding = outcome.findings.find((f) => f.code === 'MISSING_STRING')

      expect(finding?.at).toBe('strings.k.body')
      expect(finding?.fix).toContain('k.body')
    })

    it('catches a locale with no bundle at all', () => {
      const outcome = lintDocument(doc([scene('one')], { locales: ['en', 'vi'] }), {
        bundles: [bundle()],
      })

      expect(outcome.findings.some((f) => f.code === 'MISSING_BUNDLE')).toBe(true)
    })

    it('catches a missing narration', () => {
      const outcome = lintDocument(doc([scene('one')]), { bundles: [bundle({ narration: {} })] })

      expect(outcome.findings.some((f) => f.code === 'MISSING_NARRATION')).toBe(true)
    })

    it('collects keys from a gate as well as from elements', () => {
      const gated = scene('ask', {
        kind: 'gate',
        gate: { kind: 'select', prompt: 'k.prompt', question: {}, feedback: {}, patience: 30 },
      })
      const outcome = lintDocument(doc([gated]), { bundles: [bundle()] })

      expect(outcome.findings.some((f) => f.at === 'strings.k.prompt')).toBe(true)
    })
  })
})

describe('checkScene', () => {
  it('passes a scene that fits', () => {
    expect(checkScene(scene('fits'), sceneOptions()).ok).toBe(true)
  })

  it('catches text that overflows, and says how much to cut', () => {
    // The number is what makes this repairable: "shorten it" gives a different answer
    // every attempt, "cut 34 characters" gives the same one.
    const long = 'word '.repeat(400)
    const outcome = checkScene(scene('long'), sceneOptions({ 'k.body': long }))
    const finding = outcome.findings.find((f) => f.code === 'TEXT_OVERFLOWS')

    expect(finding?.severity).toBe('error')
    expect(finding?.fix).toMatch(/by at least \d+ characters/)
  })

  it('checks every aspect, not just the one being authored', () => {
    // Text that fits comfortably in landscape routinely overflows in portrait, and nobody
    // notices while authoring on a laptop.
    const outcome = checkScene(scene('both'), sceneOptions({ 'k.body': 'x'.repeat(220) }))
    const aspects = new Set(outcome.findings.map((f) => f.at.split('/')[1]))

    expect(outcome.findings.length).toBeGreaterThan(0)
    expect(aspects.has('9:16')).toBe(true)
  })

  it('surfaces layout issues from the same function the renderer uses', () => {
    const broken = scene('broken', {
      layout: { template: 'teach', regions: { nowhere: ['a'] }, overrides: {} },
    })
    const outcome = checkScene(broken, sceneOptions())

    expect(outcome.findings.some((f) => f.code === 'UNKNOWN_REGION')).toBe(true)
    expect(outcome.findings.some((f) => f.code === 'UNPLACED_ELEMENT')).toBe(true)
  })

  it('budgets less text for a wide script', () => {
    const text = 'x'.repeat(150)
    const latin = checkScene(scene('s'), { ...sceneOptions({ 'k.body': text }), script: 'Latn' })
    const han = checkScene(scene('s'), { ...sceneOptions({ 'k.body': text }), script: 'Hani' })

    expect(han.findings.length).toBeGreaterThan(latin.findings.length)
  })
})

describe('checkLesson', () => {
  const arcs = () => createArcRegistry()

  const lesson = (phases: string[]): ExplainerDocument =>
    doc(phases.map((phase, i) => scene(`s${i}`, { phase })))

  it('passes a lesson that covers the arc', () => {
    const outcome = checkLesson(lesson(['explore', 'teach', 'practice', 'checkout']), { arcs: arcs() })
    expect(errorsOf(outcome.findings)).toEqual([])
  })

  it('catches a lesson that never checks whether it landed', () => {
    // The failure this gate exists for: eight scenes that all explain, structurally
    // flawless, pedagogically not a lesson.
    const outcome = checkLesson(lesson(['teach', 'teach', 'teach', 'teach']), { arcs: arcs() })
    const missing = outcome.findings.filter((f) => f.code === 'PHASE_MISSING').map((f) => f.at)

    expect(missing).toContain('phase.checkout')
    expect(missing).toContain('phase.explore')
  })

  it('includes the phase purpose in the fix', () => {
    const outcome = checkLesson(lesson(['teach', 'teach', 'teach', 'teach']), { arcs: arcs() })
    const finding = outcome.findings.find((f) => f.at === 'phase.checkout')

    expect(finding?.fix).toContain('Check whether it landed')
  })

  it('catches a lesson too short to be one', () => {
    const outcome = checkLesson(lesson(['explore', 'teach']), { arcs: arcs() })
    const finding = outcome.findings.find((f) => f.code === 'TOO_FEW_SCENES')

    expect(finding?.fix).toContain('2 more scene')
  })

  it('rejects a phase the arc does not define', () => {
    const outcome = checkLesson(lesson(['explore', 'teach', 'invented', 'checkout']), { arcs: arcs() })

    expect(outcome.findings.some((f) => f.code === 'UNKNOWN_PHASE')).toBe(true)
  })

  it('warns rather than errors when phases run out of order', () => {
    // Interleaving teach and practice is a legitimate choice; a gate that forbade it would
    // be enforcing a preference while claiming to enforce a structure.
    const outcome = checkLesson(lesson(['explore', 'checkout', 'teach', 'checkout']), { arcs: arcs() })
    const finding = outcome.findings.find((f) => f.code === 'PHASE_OUT_OF_ORDER')

    expect(finding?.severity).toBe('warn')
    expect(outcome.ok).toBe(true)
  })

  describe('richness', () => {
    it('warns about a scene that is really a slide', () => {
      const sparse = doc([
        scene('s0', {
          phase: 'explore',
          elements: [el('a')],
          layout: { template: 'teach', regions: { stage: ['a'] }, overrides: {} },
        }),
        scene('s1', { phase: 'teach' }),
        scene('s2', { phase: 'practice' }),
        scene('s3', { phase: 'checkout' }),
      ])
      const outcome = checkLesson(sparse, { arcs: arcs() })

      expect(outcome.findings.some((f) => f.code === 'SCENE_TOO_SPARSE')).toBe(true)
    })

    it('warns when the voice talks and nothing moves', () => {
      // The most common way a generated lesson turns out lifeless.
      const still = doc([
        scene('s0', { phase: 'explore', beats: [] }),
        scene('s1', { phase: 'teach' }),
        scene('s2', { phase: 'practice' }),
        scene('s3', { phase: 'checkout' }),
      ])
      const outcome = checkLesson(still, { arcs: arcs() })

      expect(outcome.findings.some((f) => f.code === 'SCENE_WITHOUT_BEATS')).toBe(true)
    })

    it('does not expect a gate scene to be rich', () => {
      const gated = doc([
        scene('s0', { phase: 'explore' }),
        scene('s1', { phase: 'teach' }),
        scene('s2', { phase: 'practice' }),
        scene('s3', {
          phase: 'checkout',
          kind: 'gate',
          elements: [el('q')],
          layout: { template: 'teach', regions: { stage: ['q'] }, overrides: {} },
          beats: [],
        }),
      ])
      const outcome = checkLesson(gated, { arcs: arcs() })

      expect(outcome.findings.some((f) => f.at === 'scenes.3')).toBe(false)
    })
  })

  it('measures against a registered custom arc', () => {
    // A curriculum with a different pedagogy registers its own rather than patching ours.
    const registry = createArcRegistry({ includeBuiltIns: false })
    registry.register({
      descriptor: {
        id: 'drill',
        label: 'Drill',
        minScenes: 2,
        phases: [
          { id: 'model', label: 'Model', purpose: 'Show it once.', min: 1 },
          { id: 'repeat', label: 'Repeat', purpose: 'Do it many times.', min: 1 },
        ],
      },
      create: () => registry.descriptorOf('drill'),
    })

    const outcome = checkLesson(doc([scene('a', { phase: 'model' }), scene('b', { phase: 'repeat' })]), {
      arcs: registry,
      arc: 'drill',
    })

    expect(errorsOf(outcome.findings)).toEqual([])
  })

  it('reports an unknown arc rather than falling back silently', () => {
    const outcome = checkLesson(lesson(['teach']), { arcs: arcs(), arc: 'nonexistent' })

    expect(outcome.findings[0]!.code).toBe('UNKNOWN_ARC')
    expect(outcome.findings[0]!.fix).toContain('default')
  })
})

describe('repairInstructions', () => {
  it('lists only the fixes, not the complaints', () => {
    // The model does not need to be told it did badly; it needs to be told what to change.
    const outcome = checkLesson(doc([scene('a', { phase: 'teach' }), scene('b', { phase: 'teach' })]), {
      arcs: createArcRegistry(),
    })
    const text = repairInstructions(outcome.findings)

    expect(text).toContain('Add')
    expect(text).not.toContain('needs at least')
  })

  it('caps the list and says how many were dropped', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      code: 'X',
      severity: 'error' as const,
      at: `at.${i}`,
      message: 'm',
      fix: 'do the thing',
    }))

    expect(repairInstructions(many, 5)).toContain('and 25 more')
  })

  it('is empty when there is nothing to repair', () => {
    expect(repairInstructions([])).toBe('')
  })
})
