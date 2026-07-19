// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import { PREFIX } from './styles.js'

/**
 * The scene strip: chapters, in order, clickable.
 *
 * A lesson has structure a scrubber cannot show. A teacher preparing for a class wants to
 * jump to the practice section, not to 4 minutes 20; and seeing the phases laid out —
 * explore, teach, practice, check — is how they judge in three seconds whether the lesson
 * is shaped the way they teach.
 *
 * Titles come from the scene's own heading text where it has one, because "Scene 3" tells
 * nobody anything.
 */

export interface SceneStripProps {
  readonly program: Program
  readonly currentIndex: number
  readonly onSeek: (t: number) => void
}

export function SceneStrip({ program, currentIndex, onSeek }: SceneStripProps): JSX.Element {
  return (
    <nav className={`${PREFIX}-strip`} aria-label="Scenes">
      {program.slots.map((slot, index) => (
        <button
          key={slot.scene.id}
          type="button"
          className={`${PREFIX}-chip`}
          aria-current={index === currentIndex}
          onClick={() => {
            onSeek(slot.start)
          }}
        >
          <span className={`${PREFIX}-chip-phase`}>{slot.scene.phase ?? `Scene ${String(index + 1)}`}</span>
          <span>{titleOf(program, slot)}</span>
        </button>
      ))}
    </nav>
  )
}

/**
 * The scene's own heading, if it has one.
 *
 * Falls back to the position rather than to the id: an id is an authoring detail, and
 * showing `s3-practice-b` to a teacher is showing them our filing system.
 */
function titleOf(program: Program, slot: Program['slots'][number]): string {
  for (const element of slot.scene.elements) {
    if (element.type !== 'text') continue
    const key = (element.content as { key?: unknown } | null)?.key
    if (typeof key !== 'string') continue

    const text = program.bundle.strings[key]
    if (text !== undefined && text !== '') return text
  }

  return `${String(Math.round(slot.end - slot.start))}s`
}
