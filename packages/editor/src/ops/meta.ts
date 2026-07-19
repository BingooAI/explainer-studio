// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { documentOp, requireString, type OpRegistry } from '../op.js'

/**
 * Document-level operations: what the lesson is called, what it is tagged with, which theme
 * it wears.
 *
 * Small, and separate from scenes, because these are the fields a library view reads. A
 * lesson list showing stale titles is the visible symptom of an editor that only wrote them
 * on save.
 */

export function registerMetaOps(registry: OpRegistry): void {
  registry.register(
    'meta.setTitle',
    documentOp((document, op) => {
      const title = requireString(op, 'title')

      return {
        document: { ...document, meta: { ...document.meta, title } },
        inverse: { kind: 'meta.setTitle', title: document.meta.title },
      }
    }),
  )

  registry.register(
    'meta.setTheme',
    documentOp((document, op) => {
      const theme = requireString(op, 'theme')

      return {
        document: { ...document, theme },
        inverse: { kind: 'meta.setTheme', theme: document.theme },
      }
    }),
  )
}
