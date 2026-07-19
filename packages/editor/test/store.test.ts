// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { defaultPins, type ExplainerDocument, type LocaleBundle, type Scene } from '@bingoo.ai/explainer-core'
import { describe, expect, it } from 'vitest'
import { createEditor } from '../src/ops.js'
import { createEditorStore, type EditorStore } from '../src/ui/store.js'

const scene = (id: string): Scene => ({
  id,
  kind: 'exposition',
  layout: { template: 'focus', regions: { stage: [] }, overrides: {} },
  elements: [],
  beats: [],
  narrations: [],
})

const document: ExplainerDocument = {
  version: 'explainer/v1',
  meta: { id: 'demo', title: 'Untitled', tags: [] },
  locales: ['en'],
  profiles: defaultPins,
  theme: 'default',
  scenes: [scene('one'), scene('two')],
}

const bundle: LocaleBundle = {
  version: 'explainer-bundle/v1',
  documentId: 'demo',
  locale: 'en',
  strings: {},
  narration: {},
}

const store = (): EditorStore =>
  createEditorStore({ registry: createEditor(), document, bundles: { en: bundle } })

describe('the editor store', () => {
  it('makes a run of typing one undo step', () => {
    // Without coalescing, undo walks back one keystroke at a time and nobody presses it
    // twice. This is the difference between a working undo and a decorative one.
    const editor = store()
    for (const title of ['F', 'Fr', 'Fra', 'Frac']) {
      editor.dispatch({ kind: 'meta.setTitle', title }, 'meta.title')
    }

    expect(editor.getSnapshot().document.meta.title).toBe('Frac')

    editor.undo()
    expect(editor.getSnapshot().document.meta.title).toBe('Untitled')
    expect(editor.getSnapshot().canUndo).toBe(false)
  })

  it('starts a new step once the run has ended', () => {
    const editor = store()
    editor.dispatch({ kind: 'meta.setTitle', title: 'First' }, 'meta.title')
    editor.endCoalesce()
    editor.dispatch({ kind: 'meta.setTitle', title: 'Second' }, 'meta.title')

    editor.undo()
    expect(editor.getSnapshot().document.meta.title).toBe('First')
  })

  it('does not merge edits to different fields', () => {
    // Two coalescing runs with different keys are two separate things being typed into.
    const editor = store()
    editor.dispatch({ kind: 'meta.setTitle', title: 'Named' }, 'meta.title')
    editor.dispatch({ kind: 'scene.setPhase', id: 'one', phase: 'recap' }, 'phase:one')

    editor.undo()
    expect(editor.getSnapshot().document.meta.title).toBe('Named')
  })

  it('hands out the same snapshot until something changes', () => {
    // useSyncExternalStore compares by reference and will loop forever if a fresh object
    // comes back from every call.
    const editor = store()
    expect(editor.getSnapshot()).toBe(editor.getSnapshot())

    const before = editor.getSnapshot()
    editor.dispatch({ kind: 'meta.setTitle', title: 'Changed' })
    expect(editor.getSnapshot()).not.toBe(before)
  })

  it('tells subscribers once per change', () => {
    const editor = store()
    let calls = 0
    const stop = editor.subscribe(() => {
      calls += 1
    })

    editor.dispatch({ kind: 'meta.setTitle', title: 'A' })
    editor.dispatch({ kind: 'meta.setTitle', title: 'B' })
    stop()
    editor.dispatch({ kind: 'meta.setTitle', title: 'C' })

    expect(calls).toBe(2)
  })

  it('stops pointing at a scene that undo removed', () => {
    // Otherwise every panel below renders from undefined, one interaction after an undo that
    // appeared to work.
    const editor = store()
    editor.dispatch({ kind: 'scene.add', scene: scene('three'), at: 2 })
    editor.select({ sceneId: 'three' })
    editor.undo()

    expect(editor.getSnapshot().ui.activeSceneId).toBe('one')
    expect(editor.getSnapshot().ui.selection).toBeNull()
  })

  it('drops a selected element that no longer exists', () => {
    const editor = store()
    const element = {
      id: 'e1',
      type: 'text',
      region: 'stage',
      flow: { order: 0, grow: 0, align: 'center' as const },
      content: { key: 'k' },
      style: {},
      poses: {},
      startVisible: false,
      z: 0,
    }

    editor.dispatch({ kind: 'element.add', sceneId: 'one', element })
    editor.select({ sceneId: 'one', elementId: 'e1' })
    editor.undo()

    expect(editor.getSnapshot().ui.selection).toEqual({ sceneId: 'one' })
  })

  it('applies a batch as a single step', () => {
    const editor = store()
    editor.batch([
      { kind: 'meta.setTitle', title: 'Batched' },
      { kind: 'scene.setPhase', id: 'one', phase: 'recap' },
    ])

    editor.undo()
    expect(editor.getSnapshot().document.meta.title).toBe('Untitled')
    expect(editor.getSnapshot().document.scenes[0]?.phase).toBeUndefined()
  })

  it('ignores an empty batch rather than recording a step that does nothing', () => {
    const editor = store()
    editor.batch([])
    expect(editor.getSnapshot().canUndo).toBe(false)
  })
})
