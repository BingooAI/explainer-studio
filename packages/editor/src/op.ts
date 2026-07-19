// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ExplainerDocument, LocaleBundle } from '@bingoo.ai/explainer-core'
import { KernelError } from '@bingoo.ai/explainer-kernel'

/**
 * What an edit can change.
 *
 * A lesson is a document *and* its locale bundles: the structure says there is a caption
 * here, the bundle says what it reads. Editing text is the commonest edit there is, so both
 * have to move under one history — with two, undo after "rename the heading, then reorder
 * the scenes" walks back through them in an order that belongs to neither.
 */
export interface Workspace {
  readonly document: ExplainerDocument
  readonly bundles: Readonly<Record<string, LocaleBundle>>
}

/**
 * Every edit is a pure operation that returns a new document **and its inverse**.
 *
 * That pairing is the whole design. Undo, redo, version history and an audit trail all fall
 * out of it for free, and none of them can drift from what actually happened — because the
 * inverse is produced by the same code that made the change, at the moment it had the old
 * value in hand.
 *
 * The alternative, which is what most editors end up with, is a separate undo stack that
 * remembers what it *thinks* the previous state was. It works until one operation forgets
 * to record something, and then undo silently corrupts a lesson in a way nobody notices
 * until a teacher reopens it.
 *
 * Nothing here mutates. An op applied to a document you still hold leaves that document
 * exactly as it was, which is what makes an editor's history safe to keep in a plain array.
 */

export interface OpResult {
  readonly workspace: Workspace
  /** Applying this to `workspace` restores the input exactly. */
  readonly inverse: EditOp
}

/**
 * An operation.
 *
 * `kind` is a namespaced string rather than an enum, so a plugin can register its own —
 * the same rule as everywhere else (R1). A kit that adds an element type will want ops for
 * editing it, and those must not require a change here.
 */
export interface EditOp {
  readonly kind: string
  readonly [key: string]: unknown
}

export type OpHandler = (workspace: Workspace, op: EditOp) => OpResult

/**
 * Reads a required string field from an op.
 *
 * An op arrives as loose data — it may have come from a saved history file, a collaborative
 * peer, or a plugin — so its fields are `unknown` and coercing them with `String()` turns a
 * mistake into `"[object Object]"` and carries on. Failing here names the field and the
 * operation, which is the difference between a fixable error and a lesson that quietly
 * grows a scene called `[object Object]`.
 */
export function requireString(op: EditOp, key: string): string {
  const value = op[key]
  if (typeof value !== 'string' || value === '') {
    throw new KernelError('CONFIG_INVALID', `The "${op.kind}" operation needs a "${key}".`, {
      at: op.kind,
      hint: `Received ${describe(value)}.`,
    })
  }
  return value
}

/** Reads an optional string field, treating anything else as absent. */
export function optionalString(op: EditOp, key: string): string | undefined {
  const value = op[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function describe(value: unknown): string {
  if (value === undefined) return 'nothing'
  if (value === null) return 'null'
  return typeof value
}

/**
 * Lifts an operation that only changes structure.
 *
 * Most do: reordering scenes has nothing to say about locale bundles. Writing them against
 * the document keeps them honest about what they touch, and means a bundle cannot be
 * altered by an operation that never meant to.
 */
export function documentOp(
  handler: (document: ExplainerDocument, op: EditOp) => { document: ExplainerDocument; inverse: EditOp },
): OpHandler {
  return (workspace, op) => {
    const { document, inverse } = handler(workspace.document, op)
    return { workspace: { ...workspace, document }, inverse }
  }
}

export interface OpRegistry {
  register(kind: string, handler: OpHandler): void
  has(kind: string): boolean
  apply(workspace: Workspace, op: EditOp): OpResult
  kinds(): readonly string[]
}

/**
 * A registry instance, never module state (R16).
 *
 * Two documents open in one editor, or two tenants in one server, must not share an op
 * table — and a host that wants to forbid an operation should be able to simply not
 * register it.
 */
export function createOpRegistry(): OpRegistry {
  const handlers = new Map<string, OpHandler>()

  return {
    register(kind, handler) {
      if (handlers.has(kind)) {
        throw new KernelError('REGISTRY_DUPLICATE_ID', 'An operation with this kind is already registered.', {
          at: kind,
          hint: 'Namespace it, for example "kit:fraction-bar.setParts".',
        })
      }
      handlers.set(kind, handler)
    },

    has(kind) {
      return handlers.has(kind)
    },

    apply(workspace, op) {
      const handler = handlers.get(op.kind)
      if (!handler) {
        throw new KernelError('REGISTRY_UNKNOWN_ID', 'No editing operation is registered under this kind.', {
          at: op.kind,
          hint: `Registered operations: ${[...handlers.keys()].join(', ') || 'none'}.`,
        })
      }
      return handler(workspace, op)
    },

    kinds() {
      return [...handlers.keys()]
    },
  }
}

/**
 * Applies a sequence as one unit, returning a single inverse that undoes all of it.
 *
 * The inverse is the individual inverses **reversed**, because undoing a sequence means
 * walking back out of it. Getting that order wrong produces an undo that appears to work
 * and leaves the document subtly wrong — the ops still apply, they just apply against
 * states that no longer exist.
 */
export function applyAll(registry: OpRegistry, workspace: Workspace, ops: readonly EditOp[]): OpResult {
  let current = workspace
  const inverses: EditOp[] = []

  for (const op of ops) {
    const result = registry.apply(current, op)
    current = result.workspace
    inverses.unshift(result.inverse)
  }

  return { workspace: current, inverse: { kind: 'batch', ops: inverses } }
}

/** Registers `batch`, so a compound edit is itself an op and undoes in one step. */
export function registerBatch(registry: OpRegistry): void {
  registry.register('batch', (workspace, op) => {
    const ops = Array.isArray(op['ops']) ? (op['ops'] as EditOp[]) : []
    return applyAll(registry, workspace, ops)
  })
}
