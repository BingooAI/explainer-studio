// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { resolveFontSize } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { fitText } from '../text/wrap.js'
import { color, defaultTheme } from '../theme/tokens.js'

/**
 * A quotation, set larger than body text with an accent rule beside it.
 *
 * The rule is what marks the words as borrowed. Without it a quote is just a sentence in a
 * bigger font, and the learner has no signal that someone else said it.
 */

interface QuoteContent {
  readonly text?: unknown
  readonly by?: unknown
}

const resolve = (value: unknown, strings: Readonly<Record<string, string>>): string | undefined => {
  if (typeof value !== 'string') return undefined
  return strings[value] ?? value
}

export function QuotePainter({ item, strings, profiles, canvas }: PainterProps): JSX.Element | null {
  const content = item.content as QuoteContent | null
  const text = resolve(content?.text, strings)
  if (text === undefined || text === '') return null

  const by = resolve(content?.by, strings)
  const ideal = resolveFontSize(profiles.type, canvas, item.style.rung ?? 'title').size

  const fitted = fitText(
    text,
    { width: item.rect.width * 0.88, height: item.rect.height * 0.78 },
    { ideal, lineHeightRatio: 1.3, minRatio: 0.55, step: 2, metrics: { profiles, script: undefined } },
  )

  const top = item.rect.y + Math.max(0, (item.rect.height - fitted.lines.length * fitted.lineHeight) / 2)
  const x = item.rect.x + item.rect.width * 0.09
  const accent = color(defaultTheme, 'accent')
  const soft = color(defaultTheme, 'inkSoft')

  return (
    <g>
      <rect
        x={item.rect.x}
        y={top - fitted.size * 0.3}
        width={fitted.size * 0.16}
        // Extends above the first line and ends flush with the last, matching the optical
        // top of the text rather than its box.
        height={fitted.lines.length * fitted.lineHeight + fitted.size * 0.3}
        rx={fitted.size * 0.08}
        fill={accent}
      />

      <text
        x={x}
        y={top + fitted.size * 0.82}
        fontSize={fitted.size}
        fontWeight={700}
        fill="currentColor"
        fontStyle="italic"
      >
        {fitted.lines.map((line, index) => (
          <tspan key={line + String(index)} x={x} dy={index === 0 ? 0 : fitted.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>

      {by === undefined ? null : (
        <text
          x={x}
          y={top + fitted.lines.length * fitted.lineHeight + fitted.size * 0.9}
          fontSize={fitted.size * 0.5}
          fontWeight={700}
          fill={soft}
        >
          — {by}
        </text>
      )}
    </g>
  )
}
