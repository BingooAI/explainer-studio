// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import {
  buildProgram,
  createEmphasisRegistry,
  createProfileRegistry,
  createTemplateRegistry,
  defaultPins,
  frame,
  resolveProfiles,
  restingPose,
  type ExplainerDocument,
  type LocaleBundle,
  type Rect,
} from '@bingoo.ai/explainer-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  Stage,
  createBuiltInPainters,
  createPainterRegistry,
  registerPainter,
  transformFor,
} from '../src/index.js'

const rect: Rect = { x: 100, y: 50, width: 400, height: 200 }
const profiles = () => resolveProfiles(createProfileRegistry(), defaultPins)

describe('transformFor', () => {
  it('returns nothing for an element at rest', () => {
    // Most items at most times are at rest. An identity transform on every one of them is
    // noise in the DOM an editor has to diff sixty times a second.
    expect(transformFor(rect, restingPose)).toBeUndefined()
  })

  it('translates by a fraction of the element size', () => {
    // Offsets are relative to the element, so "a tenth to the left" moves the same
    // relative distance whatever size layout gave it.
    const moved = transformFor(rect, { ...restingPose, dx: 0.5, dy: -0.25 })

    expect(moved).toBe('translate(200 -50)')
  })

  it('pivots rotation on the element centre, not the origin', () => {
    // Around the origin, "rotate a little" would fling the element across the canvas.
    const rotated = transformFor(rect, { ...restingPose, rotate: 90 })

    expect(rotated).toBe('translate(300 150) rotate(90) translate(-300 -150)')
  })

  it('pivots scale on the centre too', () => {
    expect(transformFor(rect, { ...restingPose, scale: 2 })).toBe(
      'translate(300 150) scale(2) translate(-300 -150)',
    )
  })

  it('composes translation with a centred rotation', () => {
    const both = transformFor(rect, { ...restingPose, dx: 0.1, rotate: 45 })

    expect(both).toBe('translate(40 0) translate(300 150) rotate(45) translate(-300 -150)')
  })

  it('rounds to keep output stable across platforms', () => {
    // Floating point differs in the last bits between machines; three decimals is under a
    // thousandth of a pixel and keeps golden output identical everywhere.
    const transform = transformFor({ x: 0, y: 0, width: 3, height: 3 }, { ...restingPose, dx: 1 / 3 })

    expect(transform).toBe('translate(1 0)')
  })
})

// --- Stage -------------------------------------------------------------------------

const doc: ExplainerDocument = {
  version: 'explainer/v1',
  meta: { id: 'demo', title: 'k.title', tags: [] },
  locales: ['en'],
  profiles: defaultPins,
  theme: 'default',
  scenes: [
    {
      id: 'one',
      kind: 'exposition',
      layout: { template: 'teach', regions: { headline: ['title'], stage: ['body'] }, overrides: {} },
      elements: [
        {
          id: 'title',
          type: 'text',
          region: 'headline',
          flow: { order: 0, grow: 0, align: 'center' },
          content: { key: 'k.title' },
          style: { rung: 'title' },
          poses: {},
          startVisible: true,
          z: 0,
        },
        {
          id: 'body',
          type: 'text',
          region: 'stage',
          flow: { order: 0, grow: 0, align: 'center' },
          content: { key: 'k.body' },
          style: {},
          poses: {},
          startVisible: true,
          z: 0,
        },
      ],
      beats: [],
      narrations: [],
    },
  ],
}

const bundle: LocaleBundle = {
  version: 'explainer-bundle/v1',
  documentId: 'demo',
  locale: 'en',
  script: 'Latn',
  strings: { 'k.title': 'How plants eat', 'k.body': 'Sunlight into sugar' },
  narration: {},
}

const modelAt = (t: number) => {
  const program = buildProgram(doc, bundle, {
    profiles: profiles(),
    templates: createTemplateRegistry(),
    emphasis: createEmphasisRegistry(),
    aspect: '16:9',
  })
  return frame(program, t)
}

describe('Stage', () => {
  it('paints one svg sized in canvas units', () => {
    const { container } = render(
      <Stage model={modelAt(0)} painters={createBuiltInPainters()} profiles={profiles()} />,
    )
    const svg = container.querySelector('svg')

    // A viewBox in canvas units is what lets the same lesson scale to any container
    // without a single number changing.
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1600 900')
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('renders text through the string table rather than from content', () => {
    // Content holds keys, never words (R4). If this ever renders the key, the separation
    // has been broken somewhere upstream.
    render(<Stage model={modelAt(0)} painters={createBuiltInPainters()} profiles={profiles()} />)

    expect(screen.getByText(/How plants eat/)).toBeDefined()
    expect(screen.queryByText('k.title')).toBeNull()
  })

  it('gives every element a stable hook for tests and editors', () => {
    const { container } = render(
      <Stage model={modelAt(0)} painters={createBuiltInPainters()} profiles={profiles()} />,
    )

    expect(container.querySelector('[data-element="title"]')).not.toBeNull()
    expect(container.querySelector('[data-element="body"]')).not.toBeNull()
  })

  it('paints nothing for an unregistered element type instead of blanking the lesson', () => {
    // An unregistered type is a configuration problem the quality gate reports, not a
    // reason for the rest of the lesson to disappear.
    const empty = createPainterRegistry()
    const { container } = render(<Stage model={modelAt(0)} painters={empty} profiles={profiles()} />)

    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelectorAll('text')).toHaveLength(0)
  })

  it('carries an accessible name', () => {
    const { container } = render(
      <Stage
        model={modelAt(0)}
        painters={createBuiltInPainters()}
        profiles={profiles()}
        label="Photosynthesis"
      />,
    )

    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Photosynthesis')
  })

  it('is a pure function of the model', () => {
    // The renderer owns no timing (R3): given the same model it must produce the same
    // markup, or a headless render and a browser can disagree.
    const model = modelAt(0)
    const first = render(<Stage model={model} painters={createBuiltInPainters()} profiles={profiles()} />)
    const firstHtml = first.container.innerHTML
    first.unmount()

    const second = render(<Stage model={model} painters={createBuiltInPainters()} profiles={profiles()} />)

    expect(second.container.innerHTML).toBe(firstHtml)
  })
})

describe('painter registry', () => {
  it('lets a plugin add an element type without touching the Stage', () => {
    // The acceptance test for the whole design: adding a type changes no existing file.
    // Proved by rendering it, not merely by registering it — a registry that accepts a
    // painter the Stage never calls would pass a weaker test and still be broken.
    const registry = createBuiltInPainters()
    registerPainter(registry, { id: 'fraction-bar', label: 'Fraction bar' }, ({ item }) => (
      <g data-plugin={item.id} />
    ))

    const model = modelAt(0)
    const withPlugin = {
      ...model,
      items: model.items.map((item) => ({ ...item, type: 'fraction-bar' })),
    }
    const { container } = render(<Stage model={withPlugin} painters={registry} profiles={profiles()} />)

    expect(container.querySelectorAll('[data-plugin]')).toHaveLength(model.items.length)
  })

  it('rejects a duplicate registration loudly', () => {
    const registry = createBuiltInPainters()

    expect(() => registerPainter(registry, { id: 'text', label: 'Second text' }, () => null)).toThrowError(
      /already registered/i,
    )
  })

  it('starts empty when built directly, so a host can opt out of the defaults', () => {
    expect(createPainterRegistry().size).toBe(0)
  })
})

describe('usePlayer gates', () => {
  const gated = () => {
    const withGate = {
      ...doc,
      scenes: [
        { ...doc.scenes[0]!, id: 'lead' },
        {
          id: 'ask',
          kind: 'gate' as const,
          layout: { template: 'title-card', regions: { headline: ['title'] }, overrides: {} },
          elements: [doc.scenes[0]!.elements[0]!],
          beats: [],
          narrations: [],
          gate: { kind: 'select', prompt: 'k.title', question: {}, feedback: {}, patience: 30 },
        },
      ],
    } as ExplainerDocument

    return buildProgram(withGate, bundle, {
      profiles: profiles(),
      templates: createTemplateRegistry(),
      emphasis: createEmphasisRegistry(),
      aspect: '16:9',
    })
  }

  it('reports a gate as pending once its scene has played', () => {
    const program = gated()
    const at = program.gateStarts[0]!

    expect(frame(program, at - 0.5).gate).toBeUndefined()
    expect(frame(program, at + 0.01).gate?.kind).toBe('select')
  })

  it('keeps reporting the gate on the frame after it is answered', () => {
    // `frame` is pure and has no notion of "answered" — it cannot know. Which is exactly
    // why the player must key its question panel off the player's pending state rather
    // than off the frame, or Continue appears to do nothing.
    const program = gated()
    const at = program.gateStarts[0]!

    expect(frame(program, at + 0.5).gate).toBeDefined()
    expect(frame(program, at + 2).gate).toBeDefined()
  })
})
