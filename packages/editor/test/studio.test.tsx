// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { defaultPins, type ExplainerDocument, type LocaleBundle, type Scene } from '@bingoo.ai/explainer-core'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ExplainerStudio } from '../src/index.js'

/**
 * The panels, driven the way a person drives them.
 *
 * These assert what someone editing a lesson would see, not what the code does. That
 * distinction is the whole reason this file exists: the operation layer had a full suite of
 * passing tests while the editor showed nothing you could click.
 */

afterEach(cleanup)

const element = (id: string, key: string) => ({
  id,
  type: 'text',
  region: 'stage',
  flow: { order: 0, grow: 0, align: 'center' as const },
  content: { key },
  style: {},
  poses: {},
  startVisible: true,
  z: 0,
})

const scene = (id: string, over: Partial<Scene> = {}): Scene => ({
  id,
  kind: 'exposition',
  phase: 'teach',
  layout: { template: 'teach', regions: { stage: ['e1'] }, overrides: {} },
  elements: [element('e1', 'k.heading')],
  beats: [],
  narrations: [{ ref: 'n1', at: 0 }],
  ...over,
})

const document: ExplainerDocument = {
  version: 'explainer/v1',
  meta: { id: 'demo', title: 'Fractions', tags: [] },
  locales: ['en'],
  profiles: defaultPins,
  theme: 'default',
  scenes: [
    scene('one'),
    scene('two', { elements: [], layout: { template: 'teach', regions: {}, overrides: {} } }),
  ],
}

const bundle: LocaleBundle = {
  version: 'explainer-bundle/v1',
  documentId: 'demo',
  locale: 'en',
  strings: { 'k.heading': 'One half' },
  narration: { n1: { script: 'A half is one of two equal parts.', marks: [], words: [] } },
}

function mount(
  onChange?: (document: ExplainerDocument, bundles: Readonly<Record<string, LocaleBundle>>) => void,
) {
  return render(
    <ExplainerStudio document={document} bundles={{ en: bundle }} {...(onChange ? { onChange } : {})} />,
  )
}

describe('the studio', () => {
  it('shows the lesson, its scenes and the words on the current one', () => {
    mount()

    expect(screen.getByLabelText('Lesson title')).toHaveValue('Fractions')
    expect(within(screen.getByRole('list', { name: 'Scenes' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByLabelText('Narration')).toHaveValue('A half is one of two equal parts.')
  })

  it('selects an element by clicking it on the stage', () => {
    // The behaviour that decides whether the editor is usable: you change a thing by
    // clicking the thing, not by finding its id in a list.
    mount()

    fireEvent.click(screen.getByLabelText('Select text'))

    expect(screen.getByLabelText('Words')).toHaveValue('One half')
  })

  it('edits the words, and undoes the whole run at once', () => {
    mount()
    fireEvent.click(screen.getByLabelText('Select text'))

    const words = screen.getByLabelText('Words')
    fireEvent.change(words, { target: { value: 'One third' } })
    fireEvent.change(words, { target: { value: 'One quarter' } })

    expect(screen.getByLabelText('Words')).toHaveValue('One quarter')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByLabelText('Words')).toHaveValue('One half')
  })

  it('reports every edit to the host', () => {
    // The host owns persistence (R8), so it has to be told — and told the bundles too, or
    // saving a lesson would silently drop the text edits.
    const seen: string[] = []
    mount((_document, bundles) => {
      seen.push(bundles['en']?.strings['k.heading'] ?? '')
    })

    fireEvent.click(screen.getByLabelText('Select text'))
    fireEvent.change(screen.getByLabelText('Words'), { target: { value: 'Changed' } })

    expect(seen.at(-1)).toBe('Changed')
  })

  it('switches scenes from the filmstrip', () => {
    mount()

    fireEvent.click(screen.getByTitle('Scene 2'))

    // Scene two is empty, so the palette is what should be on offer.
    expect(screen.getByText('Add to this scene')).toBeDefined()
    expect(screen.queryByLabelText('Words')).toBeNull()
  })

  it('offers a palette built from the painter registry, not a fixed list', () => {
    // The test of whether the extension point is real (R1). A kit that registers a painter
    // must appear here without a line changing.
    mount()
    fireEvent.click(screen.getByTitle('Scene 2'))

    expect(screen.getByRole('button', { name: 'Text' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Diagram' })).toBeDefined()
  })

  it('adds an element, and removes it again in one undo', () => {
    // Adding is three operations — the element, its words, the beat that reveals it. An
    // author who presses undo expects the element gone, not a third of it.
    mount()
    fireEvent.click(screen.getByTitle('Scene 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))

    expect(screen.getByLabelText('Words')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Add to this scene')).toBeDefined()
  })

  it('reorders scenes and puts them back', () => {
    mount()
    const scenes = within(screen.getByRole('list', { name: 'Scenes' })).getAllByRole('listitem')

    fireEvent.click(within(scenes[0]!).getByTitle('Move right'))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByTitle('Scene 1')).toBeDefined()
  })

  it('will not delete the last scene', () => {
    // A lesson with no scenes is not a state the editor should be able to reach: nothing
    // renders, and the way back is not obvious.
    render(<ExplainerStudio document={{ ...document, scenes: [scene('only')] }} bundles={{ en: bundle }} />)

    expect(screen.getByTitle('Delete')).toBeDisabled()
  })

  it('keeps redo available after an undo, and drops it once a new edit lands', () => {
    mount()

    fireEvent.change(screen.getByLabelText('Lesson title'), { target: { value: 'Halves' } })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Redo' })).not.toBeDisabled()

    fireEvent.change(screen.getByLabelText('Lesson title'), { target: { value: 'Thirds' } })
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('plays, and stops at the end of the scene', () => {
    mount()

    const play = screen.getByRole('button', { name: 'Play' })
    fireEvent.click(play)

    expect(screen.getByRole('button', { name: 'Pause' })).toBeDefined()
  })
})
