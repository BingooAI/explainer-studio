// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { resolveFontSize } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { widthOf } from '../text/wrap.js'
import { color, defaultTheme, defaultTheme as theme } from '../theme/tokens.js'

/**
 * One number, large.
 *
 * The unit is half the value's size and secondary in colour, so "42%" reads as a quantity
 * rather than as a word. Both sit in one centred `<text>`, which means the pair is centred
 * together — the number itself lands slightly left of true centre, and that is correct:
 * the eye centres on the digits, not on the glyph run.
 */

interface StatContent {
  readonly value?: unknown
  readonly label?: unknown
  readonly unit?: unknown
  readonly color?: unknown
}

const resolve = (value: unknown, strings: Readonly<Record<string, string>>): string | undefined => {
  if (typeof value !== 'string') return undefined
  return strings[value] ?? value
}

export function StatPainter({ item, strings, profiles, canvas }: PainterProps): JSX.Element | null {
  const content = item.content as StatContent | null
  const value = resolve(content?.value, strings)
  if (value === undefined || value === '') return null

  const label = resolve(content?.label, strings)
  const unit = resolve(content?.unit, strings)

  const labelSize = resolveFontSize(profiles.type, canvas, 'label').size * 0.9
  const metrics = { profiles, script: undefined }

  // Shrink until the digits fit the box, measured with the engine's glyph width like
  // everything else. The unit is excluded — it is small enough not to drive the fit, and
  // including it would shrink the number for the sake of a percent sign.
  let valueSize = Math.min(resolveFontSize(profiles.type, canvas, 'huge').size, item.rect.height * 0.52)
  while (valueSize > labelSize && widthOf(value, valueSize, metrics) > item.rect.width * 0.9) {
    valueSize -= 2
  }

  const accent = color(defaultTheme, typeof content?.color === 'string' ? content.color : 'accent')
  const soft = color(defaultTheme, 'inkSoft')
  const cx = item.rect.x + item.rect.width / 2
  // The number rides higher when there is a caption beneath it, so the pair reads as one
  // block rather than as a number that happens to have text under it.
  const cy = item.rect.y + item.rect.height * (label === undefined ? 0.55 : 0.44)

  return (
    <g fontFamily={theme.fonts.sans}>
      <text
        x={cx}
        y={cy}
        fontSize={valueSize}
        fontWeight={800}
        fill={accent}
        textAnchor="middle"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
        {unit === undefined ? null : (
          <tspan fontSize={valueSize * 0.5} fill={soft}>
            {unit}
          </tspan>
        )}
      </text>

      {label === undefined ? null : (
        <text
          x={cx}
          y={item.rect.y + item.rect.height * 0.78}
          fontSize={labelSize}
          fontWeight={700}
          fill={soft}
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  )
}
