// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  buildProgram,
  createEmphasisRegistry,
  createProfileRegistry,
  createTemplateRegistry,
  defaultPins,
  frame,
  resolveProfiles,
  slotAt,
  type BuildProgramOptions,
  type ExplainerDocument,
  type LocaleBundle,
} from '../src/index.js'

const setup = (aspect = '16:9'): BuildProgramOptions => ({
  profiles: resolveProfiles(createProfileRegistry(), defaultPins),
  templates: createTemplateRegistry(),
  emphasis: createEmphasisRegistry(),
  aspect,
})

const doc = (scenes: ExplainerDocument['scenes']): ExplainerDocument => ({
  version: 'explainer/v1',
  meta: { id: 'demo', title: 'k.title', tags: [] },
  locales: ['en'],
  profiles: defaultPins,
  theme: 'default',
  scenes,
})

const bundle = (over: Partial<LocaleBundle> = {}): LocaleBundle => ({
  version: 'explainer-bundle/v1',
  documentId: 'demo',
  locale: 'en',
  script: 'Latn',
  strings: { 'k.title': 'How plants eat', 'k.body': 'Sunlight into sugar' },
  narration: {},
  ...over,
})

const el = (id: string, region = 'stage', startVisible = false) =>
  ({
    id,
    type: 'text',
    region,
    flow: { order: 0, grow: 0, align: 'center' as const },
    content: { key: 'k.body' },
    style: {},
    poses: {},
    startVisible,
    z: 0,
  }) as ExplainerDocument['scenes'][number]['elements'][number]

const scene = (
  id: string,
  over: Partial<ExplainerDocument['scenes'][number]> = {},
): ExplainerDocument['scenes'][number] => ({
  id,
  kind: 'exposition',
  layout: { template: 'teach', regions: { stage: ['a'] }, overrides: {} },
  elements: [el('a')],
  beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] }],
  narrations: [],
  ...over,
})

describe('buildProgram', () => {
  it('lays scenes end to end with no gaps', () => {
    const program = buildProgram(doc([scene('one'), scene('two'), scene('three')]), bundle(), setup())

    expect(program.slots).toHaveLength(3)
    expect(program.slots[0]!.start).toBe(0)
    for (let i = 1; i < program.slots.length; i += 1) {
      expect(program.slots[i]!.start).toBe(program.slots[i - 1]!.end)
    }
    expect(program.duration).toBe(program.slots[2]!.end)
  })

  it('takes a scene duration from its narration when that is longer', () => {
    const narrated = scene('long', { narrations: [{ ref: 'n1', at: 0 }] })
    const program = buildProgram(
      doc([narrated]),
      bundle({ narration: { n1: { script: 'hello', durationSeconds: 12, marks: [], words: [] } } }),
      setup(),
    )

    // Cutting the voice short is the more visible failure: narration clipped mid-sentence.
    expect(program.duration).toBeCloseTo(12, 5)
  })

  it('estimates a duration before anything has been voiced', () => {
    const narrated = scene('unvoiced', { narrations: [{ ref: 'n1', at: 0 }] })
    const program = buildProgram(
      doc([narrated]),
      bundle({
        narration: { n1: { script: 'one two three four five six', marks: [], words: [] } },
      }),
      setup(),
    )

    // Six words at the Latin rate. The estimate is what lets a lesson play before anyone
    // has paid for audio.
    expect(program.duration).toBeCloseTo(6 / 2.6, 3)
  })

  it('does not count cue markers as spoken words', () => {
    const withCues = scene('cued', { narrations: [{ ref: 'n1', at: 0 }] })
    const build = (script: string) =>
      buildProgram(doc([withCues]), bundle({ narration: { n1: { script, marks: [], words: [] } } }), setup())
        .duration

    // Markers are timing instructions, not speech; counting them inflates every estimate.
    expect(build('[[cue:c1]]one two three')).toBeCloseTo(build('one two three'), 5)
  })

  it('shifts a cue mark by where its narration line starts', () => {
    const s = scene('shifted', {
      narrations: [{ ref: 'n1', at: 5 }],
      beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] }],
    })
    const program = buildProgram(
      doc([s]),
      bundle({
        narration: {
          n1: { script: '[[cue:c1]]now', durationSeconds: 3, marks: [{ cue: 'c1', at: 0.5 }], words: [] },
        },
      }),
      setup(),
    )

    // Marks are relative to their own line; beats are relative to the scene.
    expect(program.slots[0]!.timeline.beatTimes[0]!.at).toBeCloseTo(5.5, 5)
  })

  it('carries on when a narration reference is missing', () => {
    // A lesson missing one line is still a lesson; the quality gate reports the gap.
    const s = scene('gap', { narrations: [{ ref: 'absent', at: 0 }] })

    expect(() => buildProgram(doc([s]), bundle(), setup())).not.toThrow()
  })

  it('gathers layout issues per scene instead of failing the build', () => {
    const broken = scene('broken', {
      layout: { template: 'teach', regions: { nowhere: ['a'] }, overrides: {} },
    })
    const program = buildProgram(doc([broken]), bundle(), setup())

    expect(program.issues).toHaveLength(1)
    expect(program.issues[0]!.sceneId).toBe('broken')
    expect(program.slots).toHaveLength(1)
  })

  it('records where each gate opens', () => {
    const gated = scene('ask', {
      kind: 'gate',
      gate: { kind: 'select', prompt: 'k.prompt', question: {}, feedback: {}, patience: 30 },
    })
    const program = buildProgram(doc([scene('setup'), gated]), bundle(), setup())

    expect(program.gateStarts).toHaveLength(1)
    expect(program.gateStarts[0]).toBeGreaterThanOrEqual(program.slots[1]!.start)
  })
})

describe('slotAt', () => {
  const program = () => buildProgram(doc([scene('one'), scene('two')]), bundle(), setup())

  it('finds the scene playing at t', () => {
    const p = program()
    expect(slotAt(p, 0)!.scene.id).toBe('one')
    expect(slotAt(p, p.slots[1]!.start + 0.01)!.scene.id).toBe('two')
  })

  it('holds on the last scene past the end', () => {
    // A lesson that goes blank when it finishes is worse than one that holds its final
    // frame while a teacher talks over it.
    const p = program()
    expect(slotAt(p, p.duration + 100)!.scene.id).toBe('two')
  })

  it('holds on the first scene before the start', () => {
    expect(slotAt(program(), -5)!.scene.id).toBe('one')
  })
})

describe('frame', () => {
  const built = (aspect = '16:9') => buildProgram(doc([scene('one')]), bundle(), setup(aspect))

  it('is a pure function of t', () => {
    // The property the entire architecture rests on (R3). If this fails, a React player
    // and a headless MP4 render can disagree and both be "right".
    const program = built()

    for (const t of [0, 0.1, 0.3, 1, 2, 10]) {
      expect(frame(program, t)).toEqual(frame(program, t))
    }
  })

  it('produces a stable golden model at a fixed time', () => {
    const program = built()
    const model = frame(program, 0.5)

    expect({
      sceneId: model.sceneId,
      sceneIndex: model.sceneIndex,
      canvas: model.canvas,
      theme: model.theme,
      items: model.items.map((i) => ({ id: i.id, type: i.type, rect: i.rect, opacity: i.pose.opacity })),
    }).toMatchInlineSnapshot(`
      {
        "canvas": {
          "height": 900,
          "width": 1600,
        },
        "items": [
          {
            "id": "a",
            "opacity": 1,
            "rect": {
              "height": 513.36,
              "width": 1363.36,
              "x": 118.32,
              "y": 238.32,
            },
            "type": "text",
          },
        ],
        "sceneId": "one",
        "sceneIndex": 0,
        "theme": "default",
      }
    `)
  })

  it('omits an element that has not been revealed yet', () => {
    const program = built()

    expect(frame(program, 0).items).toHaveLength(0)
    expect(frame(program, 0.5).items).toHaveLength(1)
  })

  it('sorts items back to front, breaking ties stably', () => {
    // A stable order is what makes a golden test meaningful at all.
    const s = scene('layered', {
      elements: [
        { ...el('behind'), z: -1, startVisible: true },
        { ...el('front'), z: 5, startVisible: true },
        { ...el('same-b'), z: 0, startVisible: true },
        { ...el('same-a'), z: 0, startVisible: true },
      ],
      layout: {
        template: 'teach',
        regions: { stage: ['behind', 'front', 'same-b', 'same-a'] },
        overrides: {},
      },
      beats: [],
    })

    const model = frame(buildProgram(doc([s]), bundle(), setup()), 0)
    expect(model.items.map((i) => i.id)).toEqual(['behind', 'same-a', 'same-b', 'front'])
  })

  it('clamps at the boundaries rather than running past', () => {
    const program = built()

    expect(frame(program, -10).tScene).toBe(0)
    expect(frame(program, program.duration + 50).tScene).toBeCloseTo(program.slots[0]!.end, 5)
  })

  it('carries the locale strings so a painter can resolve keys', () => {
    // Element content holds keys, never text (R4), so the table has to travel with the model.
    expect(frame(built(), 0.5).strings['k.body']).toBe('Sunlight into sugar')
  })

  it('lays out the same document differently per aspect', () => {
    const landscape = frame(built('16:9'), 0.5)
    const portrait = frame(built('9:16'), 0.5)

    expect(landscape.canvas).toEqual({ width: 1600, height: 900 })
    expect(portrait.canvas).toEqual({ width: 900, height: 1600 })
    expect(landscape.items[0]!.rect).not.toEqual(portrait.items[0]!.rect)
  })

  it('returns an empty model for a document with no scenes', () => {
    const program = buildProgram(doc([]), bundle(), setup())
    const model = frame(program, 0)

    expect(model.items).toEqual([])
    expect(model.sceneIndex).toBe(-1)
  })

  describe('captions', () => {
    const spoken = () =>
      buildProgram(
        doc([scene('talk', { narrations: [{ ref: 'n1', at: 1 }] })]),
        bundle({
          narration: {
            n1: {
              script: '[[cue:c1]]Plants make food.',
              durationSeconds: 4,
              marks: [{ cue: 'c1', at: 0 }],
              words: [
                { word: 'Plants', start: 0, end: 1 },
                { word: 'make', start: 1, end: 2 },
                { word: 'food.', start: 2, end: 3 },
              ],
            },
          },
        }),
        setup(),
      )

    it('shows a caption only while its line is playing', () => {
      const program = spoken()

      expect(frame(program, 0.5).caption).toBeUndefined()
      expect(frame(program, 2).caption?.ref).toBe('n1')
    })

    it('strips cue markers from what a viewer reads', () => {
      // Markers are instructions for the engine; showing them would be a visible bug.
      expect(frame(spoken(), 2).caption?.text).toBe('Plants make food.')
    })

    it('tracks which word is being spoken', () => {
      const program = spoken()

      expect(frame(program, 1.5).caption?.wordIndex).toBe(0)
      expect(frame(program, 2.5).caption?.wordIndex).toBe(1)
      expect(frame(program, 3.5).caption?.wordIndex).toBe(2)
    })

    it('reports no word before timings exist', () => {
      const program = buildProgram(
        doc([scene('talk', { narrations: [{ ref: 'n1', at: 0 }] })]),
        bundle({ narration: { n1: { script: 'no timings', durationSeconds: 5, marks: [], words: [] } } }),
        setup(),
      )

      expect(frame(program, 1).caption?.wordIndex).toBe(-1)
    })
  })

  describe('gates', () => {
    const gated = () =>
      buildProgram(
        doc([
          scene('ask', {
            kind: 'gate',
            gate: { kind: 'select', prompt: 'k.prompt', question: {}, feedback: {}, patience: 30 },
          }),
        ]),
        bundle(),
        setup(),
      )

    it('withholds the gate until its scene has played', () => {
      // A gate offered before its own setup has finished is a question the learner has not
      // been given the information to answer.
      const program = gated()

      expect(frame(program, 0).gate).toBeUndefined()
      expect(frame(program, program.slots[0]!.timeline.duration).gate?.kind).toBe('select')
    })

    it('leaves the gate absent on an exposition scene', () => {
      const program = buildProgram(doc([scene('plain')]), bundle(), setup())
      expect(frame(program, 5).gate).toBeUndefined()
    })
  })
})
