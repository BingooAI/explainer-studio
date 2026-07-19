// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Rect } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { color, defaultTheme } from '../theme/tokens.js'

/**
 * An arrow between two elements.
 *
 * Endpoints are computed by intersecting the line between the two centres with each box's
 * border, so an arrow always touches the shapes rather than starting at their middles or at
 * a guessed offset — and it keeps touching them when the layout moves at another aspect.
 *
 * This is the routing Bingoo's connector uses and its diagram does not; the diagram instead
 * insets by a hardcoded 100 units, which reverses an arrow whenever two nodes are closer
 * than that. Both use it here.
 */

interface ConnectorContent {
  readonly from?: unknown
  readonly to?: unknown
  readonly label?: unknown
  readonly arrow?: unknown
  readonly dash?: unknown
  readonly bend?: unknown
}

export interface Point {
  readonly x: number
  readonly y: number
}

export function centreOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/** Where the ray from a box's centre toward `target` crosses the box border. */
export function edgePoint(rect: Rect, target: Point): Point {
  const centre = centreOf(rect)
  const dx = target.x - centre.x
  const dy = target.y - centre.y
  if (dx === 0 && dy === 0) return centre

  const scale = Math.min(
    dx === 0 ? Infinity : rect.width / 2 / Math.abs(dx),
    dy === 0 ? Infinity : rect.height / 2 / Math.abs(dy),
  )
  return { x: centre.x + dx * scale, y: centre.y + dy * scale }
}

export function ConnectorPainter({ item, strings, canvas, rects }: PainterProps): JSX.Element | null {
  const content = item.content as ConnectorContent | null
  const from = typeof content?.from === 'string' ? rects[content.from] : undefined
  const to = typeof content?.to === 'string' ? rects[content.to] : undefined
  if (!from || !to) return null

  const start = edgePoint(from, centreOf(to))
  const end = edgePoint(to, centreOf(from))
  const bend = typeof content?.bend === 'number' ? content.bend : 0

  // The control point is offset perpendicular to the run, so `bend` reads as curvature
  // rather than as an arbitrary displacement the author has to solve for.
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const control: Point = {
    x: (start.x + end.x) / 2 - (dy / length) * bend * length * 0.5,
    y: (start.y + end.y) / 2 + (dx / length) * bend * length * 0.5,
  }

  const weight = Math.min(canvas.width, canvas.height) * 0.005
  const head = Math.max(16, weight * 2.6)
  const arrow = content?.arrow !== false

  // The tangent at the end is control → end, not start → end, or a curved connector's head
  // points off the curve it arrived on.
  const angle = Math.atan2(end.y - control.y, end.x - control.x)
  const tip = arrow
    ? { x: end.x - head * 0.85 * Math.cos(angle), y: end.y - head * 0.85 * Math.sin(angle) }
    : end

  const ink = color(defaultTheme, 'ink')
  const label = typeof content?.label === 'string' ? (strings[content.label] ?? content.label) : undefined
  const fontSize = Math.min(canvas.width, canvas.height) * 0.032

  return (
    <g>
      <path
        d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${tip.x} ${tip.y}`}
        fill="none"
        stroke={ink}
        strokeWidth={weight}
        strokeLinecap="round"
        strokeDasharray={content?.dash === true ? `${weight * 2.4} ${weight * 1.8}` : undefined}
      />

      {arrow ? (
        <polygon
          points={[
            `${end.x},${end.y}`,
            `${end.x - head * Math.cos(angle - Math.PI / 7)},${end.y - head * Math.sin(angle - Math.PI / 7)}`,
            `${end.x - head * Math.cos(angle + Math.PI / 7)},${end.y - head * Math.sin(angle + Math.PI / 7)}`,
          ].join(' ')}
          fill={ink}
        />
      ) : null}

      {label === undefined ? null : (
        <Label point={midpoint(start, control, end)} text={label} fontSize={fontSize} />
      )}
    </g>
  )
}

/** The curve's actual midpoint, B(0.5) of the quadratic — not the chord's. */
function midpoint(start: Point, control: Point, end: Point): Point {
  return {
    x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
  }
}

interface LabelProps {
  readonly point: Point
  readonly text: string
  readonly fontSize: number
}

/**
 * A chip sized for the size the text is **actually** drawn at.
 *
 * Bingoo sizes the box from the base font size while rendering the text at 80% of it, so
 * every connector label sits in a chip a quarter too large.
 */
function Label({ point, text, fontSize }: LabelProps): JSX.Element {
  const size = fontSize * 0.8
  const width = text.length * size * 0.6 + size

  return (
    <g>
      <rect
        x={point.x - width / 2}
        y={point.y - size * 0.85}
        width={width}
        height={size * 1.7}
        rx={size * 0.4}
        fill={color(defaultTheme, 'paper')}
        opacity={0.92}
      />
      <text
        x={point.x}
        y={point.y + size * 0.32}
        fontSize={size}
        textAnchor="middle"
        fill={color(defaultTheme, 'ink')}
      >
        {text}
      </text>
    </g>
  )
}
