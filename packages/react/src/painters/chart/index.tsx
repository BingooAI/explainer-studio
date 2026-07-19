// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { resolveFontSize } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from '../registry.js'
import { defaultTheme } from '../../theme/tokens.js'
import { AxisChart, type AxisKind } from './axis.js'
import { PieChart } from './pie.js'
import { readSeries, scaleOf } from './scale.js'

/** Dispatches to the right chart. Everything shared lives in `scale.ts`. */

const AXIS_KINDS: readonly AxisKind[] = ['bar', 'column', 'line', 'area']

export function ChartPainter({ item, strings, profiles, canvas }: PainterProps): JSX.Element | null {
  const series = readSeries(item.content, strings)
  if (series.length === 0) return null

  const content = item.content as Record<string, unknown> | null
  const rawKind = content?.['chart']
  const kind = typeof rawKind === 'string' ? rawKind : 'column'
  const scale = scaleOf(series)

  // Chart metrics all derive from the type scale, so a chart stays proportionate to the
  // text beside it at any canvas size.
  const size = resolveFontSize(profiles.type, canvas, 'label').size * 0.82
  const revealed = Number.isFinite(item.items) ? item.items : series.length
  const showValues = content?.['showValues'] !== false
  const unit = typeof content?.['unit'] === 'string' ? content['unit'] : undefined

  if (kind === 'pie' || kind === 'donut') {
    return (
      <PieChart
        rect={item.rect}
        donut={kind === 'donut'}
        series={series}
        scale={scale}
        revealed={revealed}
        size={size}
        theme={defaultTheme}
      />
    )
  }

  return (
    <AxisChart
      rect={item.rect}
      kind={(AXIS_KINDS as readonly string[]).includes(kind) ? (kind as AxisKind) : 'column'}
      series={series}
      scale={scale}
      revealed={revealed}
      size={size}
      theme={defaultTheme}
      showValues={showValues}
      unit={unit}
    />
  )
}
