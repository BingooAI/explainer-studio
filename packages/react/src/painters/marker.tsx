// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'

/**
 * List markers.
 *
 * Every shape sits on the optical midline `y - size * 0.28` rather than the text baseline.
 * A bullet on the baseline reads as sunken, because the eye aligns it against the x-height
 * of the words beside it, not their descenders.
 */

export type MarkerStyle = 'bullet' | 'number' | 'check' | 'dash' | 'none'

export interface MarkerProps {
  readonly style: MarkerStyle
  readonly index: number
  readonly x: number
  readonly y: number
  readonly size: number
}

export function Marker({ style, index, x, y, size }: MarkerProps): JSX.Element | null {
  const mid = y - size * 0.28

  switch (style) {
    case 'number':
      return (
        <text x={x} y={y} fontSize={size * 0.9} fontWeight={800} textAnchor="middle" fill="currentColor">
          {index + 1}.
        </text>
      )

    case 'check':
      return (
        <path
          d={`M ${x - size * 0.3} ${mid} l ${size * 0.22} ${size * 0.24} l ${size * 0.42} ${-size * 0.52}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={size * 0.13}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )

    case 'dash':
      return (
        <line
          x1={x - size * 0.3}
          y1={mid}
          x2={x + size * 0.3}
          y2={mid}
          stroke="currentColor"
          strokeWidth={size * 0.12}
          strokeLinecap="round"
        />
      )

    case 'none':
      return null

    default:
      return <circle cx={x} cy={mid} r={size * 0.19} fill="currentColor" />
  }
}
