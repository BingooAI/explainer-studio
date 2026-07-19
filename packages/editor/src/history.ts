// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ExplainerDocument } from '@bingoo.ai/explainer-core'
import type { EditOp, OpRegistry } from './op.js'

/**
 * Undo and redo, built entirely from the inverses the operations already produced.
 *
 * There is no separate record of "what the document used to look like". Snapshot histories
 * are simpler to write and quietly enormous — a lesson with audio timings is not small, and
 * fifty of them in memory is a browser tab that dies during a long editing session. More
 * importantly, a snapshot cannot tell you *what changed*, which is what an audit trail and a
 * collaborative merge both need.
 *
 * Nothing here mutates a document. The state is a plain value, so an editor can hold it in
 * React state, compare it by reference, and persist it whenever it likes.
 */

export interface HistoryState {
  readonly document: ExplainerDocument
  /** Inverses of what has been done, most recent last. */
  readonly past: readonly EditOp[]
  /** Operations undone and available to redo, most recent last. */
  readonly future: readonly EditOp[]
}

export function initialHistory(document: ExplainerDocument): HistoryState {
  return { document, past: [], future: [] }
}

export interface HistoryLimits {
  /** How many undo steps to keep. Older ones are dropped from the far end. */
  readonly depth?: number
}

/**
 * Applies an op and records how to undo it.
 *
 * A new edit clears the redo stack, because those operations were computed against a state
 * that no longer exists. Keeping them would let a redo apply an op to a document it was
 * never derived from — which usually appears to work.
 */
export function commit(
  registry: OpRegistry,
  state: HistoryState,
  op: EditOp,
  limits: HistoryLimits = {},
): HistoryState {
  const result = registry.apply(state.document, op)
  const depth = limits.depth ?? 200
  const past = [...state.past, result.inverse]

  return {
    document: result.document,
    past: past.length > depth ? past.slice(past.length - depth) : past,
    future: [],
  }
}

export function undo(registry: OpRegistry, state: HistoryState): HistoryState {
  const inverse = state.past[state.past.length - 1]
  if (!inverse) return state

  const result = registry.apply(state.document, inverse)
  return {
    document: result.document,
    past: state.past.slice(0, -1),
    // The inverse of the inverse is the original operation, so redo needs no separate
    // record — and cannot disagree with what undo actually did.
    future: [...state.future, result.inverse],
  }
}

export function redo(registry: OpRegistry, state: HistoryState): HistoryState {
  const op = state.future[state.future.length - 1]
  if (!op) return state

  const result = registry.apply(state.document, op)
  return {
    document: result.document,
    past: [...state.past, result.inverse],
    future: state.future.slice(0, -1),
  }
}

export const canUndo = (state: HistoryState): boolean => state.past.length > 0
export const canRedo = (state: HistoryState): boolean => state.future.length > 0
