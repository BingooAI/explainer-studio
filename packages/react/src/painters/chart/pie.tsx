// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import type { Rect } from '@bingoo.ai/explainer-core'
import { CHART_PALETTE, color, type ThemeTokens } from '../../theme/tokens.js'
import type { ChartScale, Series } from './scale.js'

/**
 * Pie and donut.
 *
 * Slices accumulate clockwise from twelve o'clock, which is where a reader expects a pie to
 * start. The paper-coloured stroke between wedges is what separates two similar colours —
 * without it a pie of blues reads as one shape.
 */

export interface PieChartProps {
  readonly rect: Rect
  readonly donut: boolean
  readonly series: readonly Series[]
  readonly scale: ChartScale
  readonly revealed: number
  readonly size: number
  readonly theme: ThemeTokens
}

export function PieChart({ rect, donut, series, scale, revealed, size, theme }: PieChartProps): JSX.Element {
  const legendWidth = Math.min(rect.width * 0.42, size * 10)
  const chartWidth = rect.width - legendWidth
  const radius = Math.max(1, Math.min(chartWidth, rect.height) / 2 - size * 0.6)
  const cx = rect.x + chartWidth / 2
  const cy = rect.y + rect.height / 2
  const inner = donut ? radius * 0.55 : 0

  const ink = color(theme, 'ink')
  const separator = color(theme, 'paper')

  let accumulated = 0
  const slices = series.map((s, index) => {
    const fraction = scale.total > 0 ? s.value / scale.total : 0
    const from = accumulated * 2 * Math.PI - Math.PI / 2
    accumulated += fraction
    const to = accumulated * 2 * Math.PI - Math.PI / 2

    return {
      series: s,
      index,
      fraction,
      d: arcPath({ cx, cy, radius, inner, from, to }),
      fill: color(theme, s.color ?? CHART_PALETTE[index % CHART_PALETTE.length], 'accent'),
    }
  })

  return (
    <g>
      {slices.map((slice) =>
        slice.index >= revealed ? null : (
          <path
            key={`s${String(slice.index)}`}
            d={slice.d}
            fill={slice.fill}
            stroke={separator}
            strokeWidth={3}
          />
        ),
      )}

      {slices.map((slice) => {
        if (slice.index >= revealed) return null
        const y =
          rect.y + rect.height / 2 - (slices.length * size * 1.7) / 2 + slice.index * size * 1.7 + size * 0.6

        return (
          <g key={`g${String(slice.index)}`}>
            <rect
              x={rect.x + chartWidth + size * 0.4}
              y={y - size * 0.62}
              width={size * 0.8}
              height={size * 0.8}
              rx={size * 0.2}
              fill={slice.fill}
            />
            <text
              x={rect.x + chartWidth + size * 1.6}
              y={y}
              fontSize={size * 0.88}
              fontWeight={700}
              fill={ink}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {slice.series.label} · {Math.round(slice.fraction * 100)}%
            </text>
          </g>
        )
      })}
    </g>
  )
}

interface ArcSpec {
  readonly cx: number
  readonly cy: number
  readonly radius: number
  readonly inner: number
  readonly from: number
  readonly to: number
}

function arcPath({ cx, cy, radius, inner, from, to }: ArcSpec): string {
  const at = (angle: number, r: number): string => `${cx + Math.cos(angle) * r} ${cy + Math.sin(angle) * r}`
  const large = to - from > Math.PI ? 1 : 0

  if (inner > 0) {
    return [
      `M ${at(from, radius)}`,
      `A ${radius} ${radius} 0 ${large} 1 ${at(to, radius)}`,
      `L ${at(to, inner)}`,
      `A ${inner} ${inner} 0 ${large} 0 ${at(from, inner)}`,
      'Z',
    ].join(' ')
  }

  return [
    `M ${cx} ${cy}`,
    `L ${at(from, radius)}`,
    `A ${radius} ${radius} 0 ${large} 1 ${at(to, radius)}`,
    'Z',
  ].join(' ')
}
