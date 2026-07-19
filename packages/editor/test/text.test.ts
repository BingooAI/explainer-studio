// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { defaultPins, type ExplainerDocument, type LocaleBundle, type Scene } from '@bingoo.ai/explainer-core'
import { describe, expect, it } from 'vitest'
import { createEditor, type EditOp, type Workspace } from '../src/ops.js'

const scene = (id: string): Scene => ({
  id,
  kind: 'exposition',
  phase: 'teach',
  layout: { template: 'teach', regions: {}, overrides: {} },
  elements: [],
  beats: [],
  narrations: [{ ref: 'n1', at: 0 }],
})

const document: ExplainerDocument = {
  version: 'explainer/v1',
  meta: { id: 'demo', title: 'k.title', tags: [] },
  locales: ['en', 'vi'],
  profiles: defaultPins,
  theme: 'default',
  scenes: [scene('one')],
}

const bundle = (locale: string, over: Partial<LocaleBundle> = {}): LocaleBundle => ({
  version: 'explainer-bundle/v1',
  documentId: 'demo',
  locale,
  strings: { 'k.title': 'Fractions' },
  narration: {
    n1: {
      script: 'A half is [[cue:c1]] one of two equal parts.',
      marks: [{ cue: 'c1', at: 1.2 }],
      words: [],
    },
  },
  ...over,
})

const space = (): Workspace => ({ document, bundles: { en: bundle('en'), vi: bundle('vi') } })

describe('words', () => {
  const editor = createEditor()

  const roundTrips = (op: EditOp): void => {
    const before = space()
    const forward = editor.apply(before, op)
    expect(editor.apply(forward.workspace, forward.inverse).workspace).toEqual(before)
  }

  it('edits a phrase and puts the old one back', () => {
    const after = editor.apply(space(), { kind: 'text.set', locale: 'en', key: 'k.title', text: 'Halves' })
    expect(after.workspace.bundles['en']?.strings['k.title']).toBe('Halves')
    roundTrips({ kind: 'text.set', locale: 'en', key: 'k.title', text: 'Halves' })
  })

  it('removes a key that did not exist, rather than leaving an empty string behind', () => {
    // An empty string is a phrase the author chose; a missing key is a phrase nobody has
    // written. The quality gate treats them differently, so undo has to as well.
    const forward = editor.apply(space(), { kind: 'text.set', locale: 'en', key: 'k.new', text: 'Added' })
    const back = editor.apply(forward.workspace, forward.inverse)

    expect('k.new' in (back.workspace.bundles['en']?.strings ?? {})).toBe(false)
  })

  it('leaves the other languages untouched', () => {
    // The whole reason words live in bundles: one lesson, many languages, edited apart.
    const after = editor.apply(space(), { kind: 'text.set', locale: 'en', key: 'k.title', text: 'Halves' })
    expect(after.workspace.bundles['vi']?.strings['k.title']).toBe('Fractions')
  })

  it('leaves the document alone when only words changed', () => {
    // Structure and language are orthogonal (R4). A text edit that touched the document
    // would make every translation a structural change, and diffs unreadable.
    const before = space()
    const after = editor.apply(before, { kind: 'text.set', locale: 'en', key: 'k.title', text: 'Halves' })

    expect(after.workspace.document).toBe(before.document)
  })

  it('drops the recording when the script is rewritten', () => {
    // Cue marks and word timings came from the old audio. Keeping them would leave visuals
    // firing on words that are no longer spoken — the lesson still plays, out of step, with
    // nothing to say it went wrong.
    const voiced = space()
    voiced.bundles['en']!.narration['n1']!.words = [{ word: 'A', start: 0, end: 0.2 }]

    const after = editor.apply(voiced, {
      kind: 'narration.setScript',
      locale: 'en',
      ref: 'n1',
      script: 'Something else entirely.',
    })

    expect(after.workspace.bundles['en']?.narration['n1']?.words).toEqual([])
    expect(after.workspace.bundles['en']?.narration['n1']?.marks).toEqual([])
  })

  it('restores the recording and its timings when the rewrite is undone', () => {
    roundTrips({ kind: 'narration.setScript', locale: 'en', ref: 'n1', script: 'Something else.' })
  })

  it('names the locales it has when asked for one it does not', () => {
    expect(() =>
      editor.apply(space(), { kind: 'text.set', locale: 'fr', key: 'k.title', text: 'x' }),
    ).toThrowError(/en, vi/)
  })

  it('undoes a mixed structural and textual edit in one step', () => {
    // The reason both live under one history. With two, undo after this walks back through
    // them in an order that belongs to neither.
    const before = space()
    const forward = editor.apply(before, {
      kind: 'batch',
      ops: [
        { kind: 'meta.setTitle', title: 'Halves' },
        { kind: 'text.set', locale: 'en', key: 'k.title', text: 'Halves' },
        { kind: 'scene.setPhase', id: 'one', phase: 'recap' },
      ],
    })

    expect(editor.apply(forward.workspace, forward.inverse).workspace).toEqual(before)
  })
})
