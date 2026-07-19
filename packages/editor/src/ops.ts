// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * Editing operations.
 *
 * Every change is a pure operation returning a new workspace — the document and its locale
 * bundles together — and its inverse. Undo, redo,
 * version history and an audit trail all fall out of that pairing, and none of them can
 * drift from what actually happened — because the inverse is produced by the same code that
 * made the change, at the moment it still held the old value.
 */

export {
  applyAll,
  createOpRegistry,
  documentOp,
  registerBatch,
  type EditOp,
  type OpHandler,
  type OpRegistry,
  type OpResult,
  type Workspace,
} from './op.js'

export { registerSceneOps } from './ops/scene.js'
export { registerElementOps } from './ops/element.js'
export { registerTextOps } from './ops/text.js'
export { registerMetaOps } from './ops/meta.js'

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
import { registerMetaOps } from './ops/meta.js'
import { registerTextOps } from './ops/text.js'

/** A registry with the built-in operations. An instance, never shared state (R16). */
export function createEditor(): OpRegistry {
  const registry = createOpRegistry()
  registerBatch(registry)
  registerSceneOps(registry)
  registerElementOps(registry)
  registerTextOps(registry)
  registerMetaOps(registry)
  return registry
}

export {
  buildProject,
  clipOf,
  sceneAt,
  ENTRANCE_VERBS,
  EXIT_VERBS,
  type Clip,
  type ClipEffect,
  type GateClip,
  type NarrationClip,
  type Project,
  type SceneBound,
  type Track,
} from './clips.js'
