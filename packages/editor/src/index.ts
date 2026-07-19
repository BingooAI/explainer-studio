// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * Editing operations.
 *
 * Every change is a pure operation returning a new document and its inverse. Undo, redo,
 * version history and an audit trail all fall out of that pairing, and none of them can
 * drift from what actually happened — because the inverse is produced by the same code that
 * made the change, at the moment it still held the old value.
 */

export {
  applyAll,
  createOpRegistry,
  registerBatch,
  type EditOp,
  type OpHandler,
  type OpRegistry,
  type OpResult,
} from './op.js'

export { registerSceneOps } from './ops/scene.js'
export { registerElementOps } from './ops/element.js'

export {
  canRedo,
  canUndo,
  commit,
  initialHistory,
  redo,
  undo,
  type HistoryLimits,
  type HistoryState,
} from './history.js'

import { createOpRegistry, registerBatch, type OpRegistry } from './op.js'
import { registerElementOps } from './ops/element.js'
import { registerSceneOps } from './ops/scene.js'

/** A registry with the built-in operations. An instance, never shared state (R16). */
export function createEditor(): OpRegistry {
  const registry = createOpRegistry()
  registerBatch(registry)
  registerSceneOps(registry)
  registerElementOps(registry)
  return registry
}
