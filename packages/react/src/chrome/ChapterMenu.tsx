// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program } from '@bingoo.ai/explainer-core'
import { useEffect, useRef, type JSX } from 'react'
import { CheckIcon } from './icons.js'
import { clock, sceneTitle } from './format.js'
import { PREFIX } from './styles.js'

/**
 * The chapter list, opened from the control bar.
 *
 * It is a panel rather than a permanent rail. A second row of controls under the first is
 * two rows of chrome around one lesson, and the rail earns its space only in the moment
 * somebody is looking for a section — which is exactly when they press this button.
 *
 * Closes on Escape and on a click outside, because a panel that only closes via the button
 * that opened it is a panel people leave open.
 */

export interface ChapterMenuProps {
  readonly program: Program
  readonly currentIndex: number
  readonly onSeek: (t: number) => void
  readonly onClose: () => void
}

export function ChapterMenu({ program, currentIndex, onSeek, onClose }: ChapterMenuProps): JSX.Element {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus()

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const onClick = (event: MouseEvent): void => {
      if (!panel.current?.contains(event.target as Node)) onClose()
    }

    document.addEventListener('keydown', onKey)
    // Deferred: the click that opened the panel is still propagating, and would close it.
    const timer = setTimeout(() => {
      document.addEventListener('click', onClick)
    }, 0)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
      clearTimeout(timer)
    }
  }, [onClose])

  return (
    <div className={`${PREFIX}-menu`} ref={panel} role="dialog" aria-label="Chapters">
      <p className={`${PREFIX}-menu-head`}>Chapters</p>
      <ul className={`${PREFIX}-menu-list`}>
        {program.slots.map((slot, index) => (
          <li key={slot.scene.id}>
            <button
              type="button"
              className={`${PREFIX}-menu-item`}
              aria-current={index === currentIndex}
              onClick={() => {
                onSeek(slot.start)
                onClose()
              }}
            >
              <span className={`${PREFIX}-menu-time`}>{clock(slot.start)}</span>
              <span className={`${PREFIX}-menu-title`}>{sceneTitle(program, slot)}</span>
              {slot.scene.gate ? (
                <span className={`${PREFIX}-menu-tag`} title="This chapter asks a question">
                  <CheckIcon size={0.85} />
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
