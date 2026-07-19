// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import type { PainterProps } from './registry.js'

/**
 * A drawn stroke — the signature of the explainer form, and the reason `drawOn` exists.
 *
 * The path is authored in a 0..100 local box and scaled to the element's rect, so one
 * drawing works at any size and in either aspect.
 *
 * `pathLength={1}` is the whole trick. It tells SVG to treat the path as one unit long
 * whatever its real length, so `strokeDashoffset = 1 - drawProgress` draws it from nothing
 * to complete without anyone measuring the geometry. Without it every path would need its
 * own length computed, and a curve's length is not something you can get from its `d`
 * attribute without walking it.
 */

interface StrokeContent {
  readonly path?: unknown
  readonly closed?: unknown
}

export function StrokePainter({ item, canvas }: PainterProps): JSX.Element | null {
  const content = item.content as StrokeContent | null
  const path = typeof content?.path === 'string' ? content.path : undefined
  if (path === undefined) return null

  const sx = item.rect.width / 100
  const sy = item.rect.height / 100
  const draw = item.pose.drawProgress

  // Stroke width is in canvas units and must survive the local-box scale, or a wide
  // element would draw with a hairline and a tall one with a slab.
  const weight = (Math.min(canvas.width, canvas.height) * 0.006) / Math.max(sx, sy, 0.001)

  return (
    <g transform={`translate(${item.rect.x} ${item.rect.y}) scale(${sx} ${sy})`}>
      <path
        d={path}
        fill={content?.closed === true ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
        // Applied only while drawing. A completed stroke with a dash array still set is
        // one rounding error away from showing a seam at the join.
        {...(draw < 1 ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - draw } : {})}
      />
    </g>
  )
}
