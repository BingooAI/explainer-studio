// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program } from '@bingoo.ai/explainer-core'

/** `m:ss`. Shared, so the timeline, the previews and the chapter list cannot disagree. */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, '0')}`
}

/**
 * A scene's own heading.
 *
 * Falls back to the phase rather than the id: an id is an authoring detail, and showing
 * `s3-practice-b` to a teacher is showing them our filing system.
 */
export function sceneTitle(program: Program, slot: Program['slots'][number]): string {
  for (const element of slot.scene.elements) {
    if (element.type !== 'text') continue
    const key = (element.content as { key?: unknown } | null)?.key
    if (typeof key !== 'string') continue

    const text = program.bundle.strings[key]
    if (text !== undefined && text !== '') return text
  }

  return slot.scene.phase ?? `Scene ${String(slot.index + 1)}`
}
