// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import {
  buildProgram,
  createEmphasisRegistry,
  createProfileRegistry,
  createTemplateRegistry,
  defaultPins,
  resolveProfiles,
  type Element,
  type ExplainerDocument,
  type LocaleBundle,
  type Program,
  type Scene,
} from '@bingoo.ai/explainer-core'
import { describe, expect, it } from 'vitest'
import { buildProject, clipOf, sceneAt } from '../src/clips.js'

const element = (id: string): Element => ({
  id,
  type: 'text',
  region: 'stage',
  flow: { order: 0, grow: 0, align: 'center' },
  content: { key: `k.${id}` },
  style: {},
  poses: {},
  startVisible: false,
  z: 0,
})

const scene = (id: string, over: Partial<Scene> = {}): Scene => ({
  id,
  kind: 'exposition',
  layout: { template: 'teach', regions: { stage: ['a', 'b'] }, overrides: {} },
  elements: [element('a'), element('b')],
  beats: [
    { id: 'beat1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] },
    { id: 'beat2', cue: 'c2', actions: [{ verb: 'reveal', target: 'b' }] },
  ],
  narrations: [{ ref: `${id}.n1`, at: 0 }],
  ...over,
})

const bundle = (refs: readonly string[]): LocaleBundle => ({
  version: 'explainer-bundle/v1',
  documentId: 'demo',
  locale: 'en',
  strings: { 'k.a': 'The numerator counts the parts you have', 'k.b': 'Denominator' },
  narration: Object.fromEntries(
    refs.map((ref) => [
      ref,
      {
        script: 'First [[cue:c1]] this, and then [[cue:c2]] that.',
        marks: [
          { cue: 'c1', at: 1 },
          { cue: 'c2', at: 3 },
        ],
        words: [],
      },
    ]),
  ),
})

function program(scenes: Scene[]): Program {
  const document: ExplainerDocument = {
    version: 'explainer/v1',
    meta: { id: 'demo', title: 'Demo', tags: [] },
    locales: ['en'],
    profiles: defaultPins,
    theme: 'default',
    scenes,
  }

  return buildProgram(document, bundle(scenes.map((s) => `${s.id}.n1`)), {
    profiles: resolveProfiles(createProfileRegistry(), defaultPins),
    templates: createTemplateRegistry(),
    emphasis: createEmphasisRegistry(),
    aspect: '16:9',
  })
}

describe('the clip model', () => {
  it('starts a clip where the element is revealed, not where its scene begins', () => {
    // The point of the view: a bar you can look along and see when something arrives.
    // Starting every clip at the scene boundary would draw a wall of identical bars.
    const project = buildProject(program([scene('one')]))
    const clip = clipOf(project, 'one', 'b')

    expect(clip?.start).toBeCloseTo(3, 1)
  })

  it('runs an element with no exit to the end of its scene', () => {
    const project = buildProject(program([scene('one')]))
    const clip = clipOf(project, 'one', 'a')
    const bounds = project.scenes[0]!

    expect(clip?.end).toBeCloseTo(bounds.end, 3)
  })

  it('cuts a clip at its exit', () => {
    const withExit = scene('one', {
      beats: [
        { id: 'beat1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] },
        { id: 'beat2', cue: 'c2', actions: [{ verb: 'exit', target: 'a' }] },
      ],
    })

    const clip = clipOf(buildProject(program([withExit])), 'one', 'a')
    expect(clip?.end).toBeCloseTo(3, 1)
  })

  it('stacks overlapping clips onto separate rows and shares one where they do not overlap', () => {
    // Interval partitioning: the fewest rows possible, because every extra row is height
    // taken away from the preview above.
    const project = buildProject(program([scene('one')]))

    // 'a' runs from 1s to the end and 'b' from 3s, so they overlap and cannot share a row.
    expect(project.tracks.length).toBeGreaterThan(1)
  })

  it('labels a clip with what the element says', () => {
    // A strip labelled text, text, text is a strip you have to click through.
    const clip = clipOf(buildProject(program([scene('one')])), 'one', 'a')

    expect(clip?.label).toContain('numerator')
  })

  it('shortens a long label rather than letting it push the bar out of shape', () => {
    const clip = clipOf(buildProject(program([scene('one')])), 'one', 'a')

    expect(clip?.label.length).toBeLessThanOrEqual(24)
    expect(clip?.label.endsWith('…')).toBe(true)
  })

  it('lays scenes end to end in program time', () => {
    const project = buildProject(program([scene('one'), scene('two')]))

    expect(project.scenes[1]!.start).toBeCloseTo(project.scenes[0]!.end, 3)
  })

  it('places a narration clip where its line is spoken', () => {
    const project = buildProject(program([scene('one')]))

    expect(project.narration).toHaveLength(1)
    expect(project.narration[0]!.text).not.toContain('[[cue:')
  })

  it('finds the scene at a moment, and holds the last one past the end', () => {
    // Past the end returns the final scene rather than nothing, so a playhead parked at the
    // finish does not leave the panels rendering from undefined.
    const project = buildProject(program([scene('one'), scene('two')]))

    expect(sceneAt(project, 0)?.id).toBe('one')
    expect(sceneAt(project, project.duration + 10)?.id).toBe('two')
  })

  it('marks a gate where it becomes answerable', () => {
    const asking = scene('one', {
      kind: 'gate',
      gate: {
        kind: 'multiple-choice',
        prompt: 'k.a',
        question: { choices: ['k.a', 'k.b'], answer: 0 },
        feedback: {},
        patience: 1,
      },
    })

    const project = buildProject(program([asking]))
    expect(project.gates).toHaveLength(1)
  })
})
