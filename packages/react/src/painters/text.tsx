// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { resolveFontSize } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { anchorFor } from '../transform.js'
import { wrapText } from '../text/wrap.js'

/**
 * Plain text.
 *
 * Wrapping uses the shared estimate, which is the same one the quality gate budgets
 * against. A painter that measured differently would let text pass the gate and overflow
 * on screen — the exact failure the shared budget exists to prevent.
 */

/** Text content is `{ key }` — a lookup, never the words themselves (R4). */
export function textOf(content: unknown, strings: Readonly<Record<string, string>>): string {
  if (typeof content !== 'object' || content === null) return ''
  const key = (content as Record<string, unknown>)['key']
  return typeof key === 'string' ? (strings[key] ?? '') : ''
}

export function TextPainter({ item, strings, profiles, canvas }: PainterProps): JSX.Element | null {
  const text = textOf(item.content, strings)
  if (text === '') return null

  const { size, lineHeight } = resolveFontSize(profiles.type, canvas, item.style.rung)
  const { x, anchor } = anchorFor(item.align)
  const lines = wrapText(text, item.rect.width, size, { profiles, script: undefined })

  // Vertically centred in the allotted rect: layout gives space, the painter places content
  // inside it. Anything else would need the painter to know about its siblings.
  const blockHeight = lines.length * size * lineHeight
  const firstBaseline = item.rect.y + (item.rect.height - blockHeight) / 2 + size

  return (
    <text
      x={x(item.rect)}
      y={firstBaseline}
      textAnchor={anchor}
      fontSize={size}
      fontWeight={item.style.weight === 'bold' ? 700 : item.style.weight === 'medium' ? 600 : 400}
      fill="currentColor"
    >
      {lines.map((line, index) => (
        <tspan key={line + String(index)} x={x(item.rect)} dy={index === 0 ? 0 : size * lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}
