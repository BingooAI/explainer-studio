// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { defaultPins, type Element, type ExplainerDocument, type Scene } from '@bingoo.ai/explainer-core'
import { isKernelError } from '@bingoo.ai/explainer-kernel'
import { describe, expect, it } from 'vitest'
import {
  type EditOp,
  canRedo,
  canUndo,
  commit,
  createEditor,
  createOpRegistry,
  initialHistory,
  redo,
  undo,
} from '../src/index.js'

const element = (id: string, region = 'stage'): Element => ({
  id,
  type: 'text',
  region,
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
  phase: 'teach',
  layout: { template: 'teach', regions: { stage: ['a'] }, overrides: {} },
  elements: [element('a')],
  beats: [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] }],
  narrations: [],
  ...over,
})

const doc = (scenes: Scene[]): ExplainerDocument => ({
  version: 'explainer/v1',
  meta: { id: 'demo', title: 'k.title', tags: [] },
  locales: ['en'],
  profiles: defaultPins,
  theme: 'default',
  scenes,
})

describe('operations', () => {
  const editor = createEditor()

  it('does not mutate the document it was given', () => {
    // The property an editor's history depends on: a document you still hold is unchanged,
    // so a past state can be kept in a plain array without defensive copying.
    const before = doc([scene('one')])
    const snapshot = JSON.stringify(before)

    editor.apply(before, { kind: 'scene.remove', id: 'one' })

    expect(JSON.stringify(before)).toBe(snapshot)
  })

  describe('every operation round-trips through its inverse', () => {
    const cases: Array<[string, ExplainerDocument, EditOp]> = [
      ['scene.add', doc([scene('one')]), { kind: 'scene.add', scene: scene('two'), at: 0 }],
      ['scene.remove', doc([scene('one'), scene('two')]), { kind: 'scene.remove', id: 'one' }],
      ['scene.move', doc([scene('a'), scene('b'), scene('c')]), { kind: 'scene.move', id: 'a', to: 2 }],
      ['scene.setPhase', doc([scene('one')]), { kind: 'scene.setPhase', id: 'one', phase: 'recap' }],
      [
        'scene.setTemplate',
        doc([scene('one')]),
        { kind: 'scene.setTemplate', id: 'one', template: 'bullets' },
      ],
      ['element.add', doc([scene('one')]), { kind: 'element.add', sceneId: 'one', element: element('b') }],
      ['element.remove', doc([scene('one')]), { kind: 'element.remove', sceneId: 'one', id: 'a' }],
      [
        'element.setContent',
        doc([scene('one')]),
        { kind: 'element.setContent', sceneId: 'one', id: 'a', content: { key: 'k.changed' } },
      ],
      [
        'element.move',
        doc([
          scene('one', {
            elements: [element('a', 'left')],
            layout: { template: 'two-col', regions: { left: ['a'], right: [] }, overrides: {} },
          }),
        ]),
        { kind: 'element.move', sceneId: 'one', id: 'a', region: 'right' },
      ],
    ]

    it.each(cases)('%s', (_name, input, op) => {
      const forward = editor.apply(input, op)
      const back = editor.apply(forward.document, forward.inverse)

      // Deep equality, not "close enough": an inverse that restores a document which merely
      // looks right is how an undo silently corrupts a lesson.
      expect(back.document).toEqual(input)
    })
  })

  it('removes the beats that referred to a deleted element, and brings them back', () => {
    // Leaving them behind produces a document the lint gate rejects, from an action the
    // author had every reason to think was safe.
    const before = doc([scene('one')])
    const removed = editor.apply(before, { kind: 'element.remove', sceneId: 'one', id: 'a' })

    expect(removed.document.scenes[0]!.beats[0]!.actions).toHaveLength(0)
    expect(editor.apply(removed.document, removed.inverse).document).toEqual(before)
  })

  it('keeps the region list in step when an element is added', () => {
    // An element the layout never places is invisible, and the document is still valid —
    // exactly the silent failure the layout gate reports.
    const after = editor.apply(doc([scene('one')]), {
      kind: 'element.add',
      sceneId: 'one',
      element: element('b'),
    })

    expect(after.document.scenes[0]!.layout.regions['stage']).toEqual(['a', 'b'])
  })

  it('reverses a move using where the element actually was, not what it claims', () => {
    // A document can disagree with itself: `element.region` names a region while
    // `layout.regions` lists the members. The layout decides where it is drawn, so the
    // layout is what a move must reverse — trusting the field returns it somewhere it
    // never was, and the undo looks like it worked.
    const drifted = doc([
      scene('one', {
        elements: [element('a', 'stage')],
        layout: { template: 'two-col', regions: { left: ['a'], right: [] }, overrides: {} },
      }),
    ])

    const moved = editor.apply(drifted, { kind: 'element.move', sceneId: 'one', id: 'a', region: 'right' })
    const back = editor.apply(moved.document, moved.inverse)

    expect(back.document.scenes[0]!.layout.regions).toEqual({ left: ['a'], right: [] })
  })

  it('clamps an out-of-range move rather than refusing it', () => {
    // Overshooting the end of a list while dragging means "put it last", which is what the
    // person doing the dragging intended.
    const after = editor.apply(doc([scene('a'), scene('b')]), { kind: 'scene.move', id: 'a', to: 99 })

    expect(after.document.scenes.map((s) => s.id)).toEqual(['b', 'a'])
  })

  describe('failure modes', () => {
    it('names the scenes that exist when an id is unknown', () => {
      try {
        editor.apply(doc([scene('one')]), { kind: 'scene.remove', id: 'ghost' })
        expect.unreachable('should have thrown')
      } catch (error) {
        expect(isKernelError(error)).toBe(true)
        if (!isKernelError(error)) return
        expect(error.hint).toContain('one')
      }
    })

    it('rejects an unregistered operation and lists what is available', () => {
      try {
        editor.apply(doc([scene('one')]), { kind: 'scene.explode' })
        expect.unreachable('should have thrown')
      } catch (error) {
        expect(isKernelError(error) && error.hint).toContain('scene.add')
      }
    })

    it('refuses to register the same kind twice', () => {
      const registry = createOpRegistry()
      registry.register('x', (d) => ({ document: d, inverse: { kind: 'x' } }))

      expect(() => {
        registry.register('x', (d) => ({ document: d, inverse: { kind: 'x' } }))
      }).toThrowError(/already registered/i)
    })
  })

  it('lets a plugin add an operation without touching the built-ins', () => {
    // The acceptance test for the design (R1): a kit that adds an element type will want
    // operations for editing it, and those must not require a change here.
    const registry = createEditor()
    registry.register('kit:fraction-bar.setParts', (document, op) => ({
      document,
      inverse: { kind: 'kit:fraction-bar.setParts', parts: op['parts'] },
    }))

    expect(registry.has('kit:fraction-bar.setParts')).toBe(true)
  })
})

describe('batch', () => {
  const editor = createEditor()

  it('undoes a compound edit in one step, in reverse order', () => {
    // Undoing a sequence means walking back out of it. The wrong order produces an undo
    // that appears to work and leaves the document subtly wrong.
    const before = doc([scene('one')])
    const result = editor.apply(before, {
      kind: 'batch',
      ops: [
        { kind: 'element.add', sceneId: 'one', element: element('b') },
        { kind: 'element.add', sceneId: 'one', element: element('c') },
        { kind: 'scene.setPhase', id: 'one', phase: 'recap' },
      ],
    })

    expect(result.document.scenes[0]!.elements).toHaveLength(3)
    expect(editor.apply(result.document, result.inverse).document).toEqual(before)
  })
})

describe('history', () => {
  const editor = createEditor()
  const start = () => initialHistory(doc([scene('one')]))

  it('undoes and redoes back to the same document', () => {
    const before = start()
    const edited = commit(editor, before, { kind: 'scene.setPhase', id: 'one', phase: 'recap' })

    expect(edited.document.scenes[0]!.phase).toBe('recap')
    expect(undo(editor, edited).document).toEqual(before.document)
    expect(redo(editor, undo(editor, edited)).document).toEqual(edited.document)
  })

  it('reports what is available', () => {
    const before = start()
    expect(canUndo(before)).toBe(false)
    expect(canRedo(before)).toBe(false)

    const edited = commit(editor, before, { kind: 'scene.setPhase', id: 'one', phase: 'recap' })
    expect(canUndo(edited)).toBe(true)
    expect(canRedo(undo(editor, edited))).toBe(true)
  })

  it('drops the redo stack when a new edit lands', () => {
    // Those operations were computed against a state that no longer exists. Keeping them
    // would let a redo apply an op to a document it was never derived from — which usually
    // appears to work.
    const edited = commit(editor, start(), { kind: 'scene.setPhase', id: 'one', phase: 'recap' })
    const undone = undo(editor, edited)
    const diverged = commit(editor, undone, { kind: 'scene.setTemplate', id: 'one', template: 'bullets' })

    expect(canRedo(diverged)).toBe(false)
  })

  it('survives a long run of edits and undoes all of them', () => {
    let state = start()
    const phases = ['explore', 'orient', 'teach', 'formalize', 'guided', 'practice', 'recap']

    for (const phase of phases) {
      state = commit(editor, state, { kind: 'scene.setPhase', id: 'one', phase })
    }
    for (let i = 0; i < phases.length; i += 1) {
      state = undo(editor, state)
    }

    expect(state.document).toEqual(start().document)
    expect(canUndo(state)).toBe(false)
  })

  it('caps how far back it remembers', () => {
    // A lesson with audio timings is not small, and an unbounded history is a tab that dies
    // during a long editing session.
    let state = start()
    for (let i = 0; i < 12; i += 1) {
      state = commit(editor, state, { kind: 'scene.setPhase', id: 'one', phase: 'recap' }, { depth: 5 })
    }

    expect(state.past).toHaveLength(5)
  })

  it('does nothing when there is nothing to undo', () => {
    const before = start()
    expect(undo(editor, before)).toBe(before)
    expect(redo(editor, before)).toBe(before)
  })
})
