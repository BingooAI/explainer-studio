// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import type { Rect } from '@bingoo.ai/explainer-core'
import { color, type ThemeTokens } from '../theme/tokens.js'

/**
 * A panel behind a region's contents.
 *
 * This is the single cheapest thing that makes a scene look composed rather than assembled.
 * Without it, elements are shapes floating on a background and the learner has to work out
 * which belong together; with it, the grouping the layout already decided becomes visible.
 *
 * Not every region gets one. A heading is set *on* the page, not in a box — a card around
 * a title reads as a button, and the eye starts looking for something to click.
 */

export interface SlotCardProps {
  readonly rect: Rect
  readonly theme: ThemeTokens
}

export function SlotCard({ rect, theme }: SlotCardProps): JSX.Element {
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      rx={Math.min(rect.width, rect.height) * 0.08}
      fill={color(theme, 'paper')}
      stroke={color(theme, 'faint')}
      strokeWidth={2}
      opacity={0.85}
      aria-hidden
    />
  )
}

/**
 * Regions that get a card.
 *
 * Deliberately a small set rather than "everything except headings": a card is a strong
 * signal, and a scene where every region has one is as flat as a scene where none does.
 */
export const CARD_SLOTS = new Set(['stage', 'left', 'right', 'points', 'data'])
