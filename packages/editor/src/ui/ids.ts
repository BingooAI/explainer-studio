// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * Identifiers for things the author creates.
 *
 * They have to be unique within a document and stable once written, because beats, layout
 * regions and locale keys all refer to elements by id. They do **not** have to be random —
 * but they must not collide between two editors editing the same lesson offline, which a
 * plain counter does immediately.
 *
 * `crypto.randomUUID` where the platform has it, a counter-and-timestamp where it does not
 * (older Safari, and any non-secure context — a self-hosted editor on plain HTTP, which R9
 * says has to work).
 */

let counter = 0

export function generateId(prefix: string): string {
  const unique =
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${(counter += 1).toString(36)}`

  return `${prefix}-${unique}`
}

/** A locale key for a new element's words, namespaced so two scenes cannot collide. */
export function stringKeyFor(sceneId: string, elementId: string): string {
  return `${sceneId}.${elementId}`
}
