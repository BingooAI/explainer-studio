// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import type { Rect } from '@bingoo.ai/explainer-core'
import { CHART_PALETTE, color, type ThemeTokens } from '../../theme/tokens.js'
import { formatValue, type ChartScale, type Series } from './scale.js'

/**
 * Bar, column, line and area charts.
 *
 * Every gutter and gap is derived from the type size rather than fixed in pixels, which is
 * what keeps a chart on the same visual scale as the text beside it. A chart with hardcoded
 * padding looks correct at one canvas size and cramped at every other.
 */

export type AxisKind = 'bar' | 'column' | 'line' | 'area'

export interface AxisChartProps {
  readonly rect: Rect
  readonly kind: AxisKind
  readonly series: readonly Series[]
  readonly scale: ChartScale
  readonly revealed: number
  readonly size: number
  readonly theme: ThemeTokens
  readonly showValues: boolean
  readonly unit?: string | undefined
}

const TICKS = 4

export function AxisChart(props: AxisChartProps): JSX.Element {
  const { rect, kind, series, scale, revealed, size, theme, showValues } = props
  const horizontal = kind === 'bar'

  const padLeft = horizontal ? Math.min(rect.width * 0.3, size * 7) : size * 3.2
  const padBottom = horizontal ? size * 2.2 : size * 2.6
  const padTop = size * 1.4
  const padRight = size * 1.6
  const plotW = Math.max(1, rect.width - padLeft - padRight)
  const plotH = Math.max(1, rect.height - padTop - padBottom)

  const x0 = rect.x + padLeft
  const y0 = rect.y + padTop
  const band = (horizontal ? plotH : plotW) / Math.max(1, series.length)
  const thickness = band * 0.62

  const faint = color(theme, 'faint')
  const soft = color(theme, 'inkSoft')
  const ink = color(theme, 'ink')
  const fillOf = (s: Series, i: number): string =>
    color(theme, s.color ?? CHART_PALETTE[i % CHART_PALETTE.length], 'accent')

  return (
    <g>
      {/* Gridlines and their labels, drawn first so marks sit above them. */}
      {Array.from({ length: TICKS + 1 }, (_, i) => {
        const value = (scale.max * i) / TICKS
        const f = value / scale.max

        return horizontal ? (
          <g key={`t${String(i)}`}>
            <line
              x1={x0 + f * plotW}
              y1={y0}
              x2={x0 + f * plotW}
              y2={y0 + plotH}
              stroke={faint}
              strokeWidth={1}
              opacity={0.7}
            />
            <text
              x={x0 + f * plotW}
              y={y0 + plotH + size * 1.3}
              fontSize={size * 0.8}
              fill={soft}
              textAnchor="middle"
            >
              {formatValue(value)}
            </text>
          </g>
        ) : (
          <g key={`t${String(i)}`}>
            <line
              x1={x0}
              y1={y0 + (1 - f) * plotH}
              x2={x0 + plotW}
              y2={y0 + (1 - f) * plotH}
              stroke={faint}
              strokeWidth={1}
              opacity={0.7}
            />
            <text
              x={x0 - size * 0.5}
              y={y0 + (1 - f) * plotH + size * 0.32}
              fontSize={size * 0.8}
              fill={soft}
              textAnchor="end"
            >
              {formatValue(value)}
            </text>
          </g>
        )
      })}

      {kind === 'line' || kind === 'area' ? (
        <Polyline {...props} x0={x0} y0={y0} plotW={plotW} plotH={plotH} band={band} />
      ) : (
        series.map((s, i) => {
          if (i >= revealed) return null
          const f = Math.max(0, s.value / scale.max)

          return horizontal ? (
            <g key={s.label + String(i)}>
              <rect
                x={x0}
                y={y0 + band * i + (band - thickness) / 2}
                width={Math.max(0, f * plotW)}
                height={thickness}
                rx={thickness * 0.22}
                fill={fillOf(s, i)}
              />
              {showValues && f > 0.02 ? (
                <text
                  x={x0 + f * plotW + size * 0.5}
                  y={y0 + band * i + band / 2 + size * 0.32}
                  fontSize={size * 0.85}
                  fontWeight={700}
                  fill={ink}
                >
                  {formatValue(s.value)}
                  {props.unit ?? ''}
                </text>
              ) : null}
            </g>
          ) : (
            <g key={s.label + String(i)}>
              <rect
                x={x0 + band * i + (band - thickness) / 2}
                y={y0 + plotH - f * plotH}
                width={thickness}
                height={Math.max(0, f * plotH)}
                rx={thickness * 0.18}
                fill={fillOf(s, i)}
              />
              {showValues && f > 0.02 ? (
                <text
                  x={x0 + band * i + band / 2}
                  y={y0 + plotH - f * plotH - size * 0.42}
                  fontSize={size * 0.85}
                  fontWeight={700}
                  fill={ink}
                  textAnchor="middle"
                >
                  {formatValue(s.value)}
                  {props.unit ?? ''}
                </text>
              ) : null}
            </g>
          )
        })
      )}

      {/* Category labels. */}
      {series.map((s, i) =>
        i >= revealed ? null : horizontal ? (
          <text
            key={`l${String(i)}`}
            x={x0 - size * 0.6}
            y={y0 + band * (i + 0.5) + size * 0.34}
            fontSize={size * 0.9}
            fontWeight={700}
            fill={ink}
            textAnchor="end"
          >
            {s.label}
          </text>
        ) : (
          <text
            key={`l${String(i)}`}
            x={x0 + band * (i + 0.5)}
            y={y0 + plotH + size * 1.5}
            fontSize={size * 0.9}
            fontWeight={700}
            fill={ink}
            textAnchor="middle"
          >
            {s.label}
          </text>
        ),
      )}

      {/* Baseline last, so it reads as the floor the marks stand on. */}
      <line x1={x0} y1={y0 + plotH} x2={x0 + plotW} y2={y0 + plotH} stroke={soft} strokeWidth={2} />
    </g>
  )
}

interface PolylineProps extends AxisChartProps {
  readonly x0: number
  readonly y0: number
  readonly plotW: number
  readonly plotH: number
  readonly band: number
}

/**
 * The revealed points are a **prefix**, not a filter.
 *
 * The implementation this replaces filtered the whole array, so a non-monotonic reveal drew
 * a line straight across the gap between two revealed points as though the missing one did
 * not exist. A prefix stops where the data stops, which is what a line building
 * left-to-right should do and what an out-of-order reveal should also do.
 */
function Polyline({
  series,
  scale,
  revealed,
  size,
  theme,
  kind,
  x0,
  y0,
  plotH,
  band,
}: PolylineProps): JSX.Element {
  const accent = color(theme, 'accent')
  const points = series.slice(0, Math.max(0, Math.min(series.length, revealed))).map((s, i) => ({
    x: x0 + band * (i + 0.5),
    y: y0 + (1 - s.value / scale.max) * plotH,
  }))

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <g>
      {kind === 'area' && points.length > 1 && first && last ? (
        <path
          d={`${d} L ${last.x} ${y0 + plotH} L ${first.x} ${y0 + plotH} Z`}
          fill={accent}
          opacity={0.16}
        />
      ) : null}
      {points.length > 1 ? (
        <path
          d={d}
          fill="none"
          stroke={accent}
          strokeWidth={size * 0.22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {points.map((p, i) => (
        <circle key={`p${String(i)}`} cx={p.x} cy={p.y} r={size * 0.3} fill={accent} />
      ))}
    </g>
  )
}
