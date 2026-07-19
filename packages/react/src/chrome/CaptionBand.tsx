// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import { color, type ThemeTokens } from '../theme/tokens.js'
import { wrapText, type Metrics } from '../text/wrap.js'

/**
 * The caption, drawn inside the canvas.
 *
 * A **floating pill**, not a reserved strip: it overlays the bottom of the scene the way a
 * video subtitle does, and it is only as wide as the words. A full-width band would be
 * territory the composition had to give up permanently, including on the scenes with no
 * narration at all.
 *
 * It is painted into the SVG rather than layered over it in HTML so that a headless MP4
 * render gets captions too. A caption that exists only in the player is a caption the
 * exported video does not have — and the export is the copy that gets shared.
 */

export interface CaptionBandProps {
  readonly canvas: { readonly width: number; readonly height: number }
  readonly text: string
  readonly theme: ThemeTokens
  readonly metrics: Metrics
}

export function CaptionBand({ canvas, text, theme, metrics }: CaptionBandProps): JSX.Element | null {
  if (text === '') return null

  const unit = Math.min(canvas.width, canvas.height)
  const size = unit * 0.042
  const maxWidth = canvas.width * 0.86

  const lines = wrapText(text, maxWidth, size, metrics)
  const lineHeight = size * 1.28
  const boxHeight = lines.length * lineHeight + size * 0.7
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0)
  const boxWidth = Math.min(maxWidth + size, longest * size * 0.56 + size * 1.6)

  const cx = canvas.width / 2
  const boxY = canvas.height - boxHeight - size * 0.4
  const firstBaseline = boxY + boxHeight / 2 - (lines.length * lineHeight) / 2 + size * 0.82

  return (
    // Hidden from assistive technology: the player already exposes the caption as a live
    // region in the DOM, and reading it twice is worse than not reading it at all.
    <g aria-hidden>
      <rect
        x={cx - boxWidth / 2}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={boxHeight * 0.3}
        fill={color(theme, 'ink')}
        opacity={0.82}
      />
      <text x={cx} y={firstBaseline} fontSize={size} fontWeight={600} fill="#ffffff" textAnchor="middle">
        {lines.map((line, index) => (
          <tspan key={line + String(index)} x={cx} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}
