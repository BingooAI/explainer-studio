// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ExplainerDocument, LocaleBundle } from '@bingoo.ai/explainer-core'
import type { EditOp, OpRegistry } from '../op.js'
import {
  canRedo,
  canUndo,
  commit,
  initialHistory,
  redo as redoStep,
  undo as undoStep,
  type HistoryState,
} from '../history.js'

/**
 * The editor's state, as an external store.
 *
 * An external store rather than React state because everything that is not React needs to
 * read it too: an autosave timer, a keyboard shortcut bound to the window, a host wanting to
 * know whether there are unsaved edits. `useSyncExternalStore` then gives the panels a
 * consistent view without prop-drilling the document through six levels of layout.
 *
 * The store owns *what is being edited*. It does not own persistence — a host decides
 * whether edits go to localStorage, a database, or nowhere at all (R8).
 */

/** What is selected. `null` means the scene itself, which is what the inspector falls back to. */
export interface Selection {
  readonly sceneId: string
  readonly elementId?: string
}

export interface UIState {
  readonly activeSceneId: string | undefined
  readonly selection: Selection | null
  readonly locale: string
  readonly aspect: string
}

export interface EditorSnapshot {
  readonly document: ExplainerDocument
  readonly bundles: Readonly<Record<string, LocaleBundle>>
  readonly ui: UIState
  readonly canUndo: boolean
  readonly canRedo: boolean
}

export interface EditorStore {
  readonly getSnapshot: () => EditorSnapshot
  readonly subscribe: (listener: () => void) => () => void
  /**
   * Applies an operation and records it in history.
   *
   * `coalesceKey` merges consecutive edits that share it into one history entry. Typing a
   * title is one edit as far as the author is concerned; without this, undo walks back
   * through it one keystroke at a time and nobody ever presses it twice.
   */
  readonly dispatch: (op: EditOp, coalesceKey?: string) => void
  /** Ends a coalescing run, so the next edit starts a fresh history entry. Call on blur. */
  readonly endCoalesce: () => void
  readonly batch: (ops: readonly EditOp[]) => void
  readonly undo: () => void
  readonly redo: () => void
  readonly setUI: (patch: Partial<UIState>) => void
  readonly select: (selection: Selection | null) => void
  readonly registry: OpRegistry
}

export interface CreateStoreOptions {
  readonly registry: OpRegistry
  readonly document: ExplainerDocument
  readonly bundles: Readonly<Record<string, LocaleBundle>>
  readonly locale?: string
  readonly aspect?: string
  readonly depth?: number
}

/** The aspect an editor opens at when the host does not say. */
export const DEFAULT_ASPECT = '16:9'

export function createEditorStore(options: CreateStoreOptions): EditorStore {
  const { registry } = options
  const listeners = new Set<() => void>()

  let history: HistoryState = initialHistory({ document: options.document, bundles: options.bundles })
  let ui: UIState = {
    activeSceneId: options.document.scenes[0]?.id,
    selection: null,
    locale: options.locale ?? options.document.locales[0] ?? 'en',
    aspect: options.aspect ?? DEFAULT_ASPECT,
  }
  let coalescing: string | null = null
  let snapshot = build()

  function build(): EditorSnapshot {
    return {
      document: history.workspace.document,
      bundles: history.workspace.bundles,
      ui,
      canUndo: canUndo(history),
      canRedo: canRedo(history),
    }
  }

  function emit(): void {
    // Rebuilt once per change, not per reader. `useSyncExternalStore` compares by reference
    // and will loop forever if `getSnapshot` returns a fresh object each call.
    snapshot = build()
    for (const listener of listeners) listener()
  }

  return {
    registry,

    getSnapshot: () => snapshot,

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    dispatch: (op, coalesceKey) => {
      const limits = options.depth === undefined ? {} : { depth: options.depth }

      if (coalesceKey !== undefined && coalesceKey === coalescing && canUndo(history)) {
        // Continuing a run: take the new document but drop the inverse it produced, keeping
        // the one already on the stack. That older inverse still points at the state before
        // the run started, which is what undo should return to. Keeping the newer one would
        // undo a single keystroke and leave the rest of the typing in place.
        const next = commit(registry, history, op, limits)
        history = { ...next, past: next.past.slice(0, -1) }
      } else {
        history = commit(registry, history, op, limits)
        coalescing = coalesceKey ?? null
      }

      emit()
    },

    endCoalesce: () => {
      coalescing = null
    },

    batch: (ops) => {
      if (ops.length === 0) return
      coalescing = null
      history = commit(
        registry,
        history,
        { kind: 'batch', ops },
        options.depth === undefined ? {} : { depth: options.depth },
      )
      emit()
    },

    undo: () => {
      coalescing = null
      const next = undoStep(registry, history)
      if (next === history) return
      history = next
      ui = { ...ui, ...reconcile(ui, history.workspace.document) }
      emit()
    },

    redo: () => {
      coalescing = null
      const next = redoStep(registry, history)
      if (next === history) return
      history = next
      ui = { ...ui, ...reconcile(ui, history.workspace.document) }
      emit()
    },

    setUI: (patch) => {
      ui = { ...ui, ...patch }
      emit()
    },

    select: (selection) => {
      ui = { ...ui, selection, ...(selection ? { activeSceneId: selection.sceneId } : {}) }
      emit()
    },
  }
}

/**
 * Keeps the UI pointing at things that still exist.
 *
 * Undoing the creation of a scene leaves the strip selecting a scene that is gone, and every
 * panel below then renders from `undefined`. The document is the authority; the selection
 * follows it.
 */
function reconcile(ui: UIState, document: ExplainerDocument): Partial<UIState> {
  const scene = document.scenes.find((candidate) => candidate.id === ui.activeSceneId)
  if (!scene) {
    return { activeSceneId: document.scenes[0]?.id, selection: null }
  }

  const elementId = ui.selection?.elementId
  if (elementId !== undefined && !scene.elements.some((element) => element.id === elementId)) {
    return { selection: { sceneId: scene.id } }
  }

  return {}
}
