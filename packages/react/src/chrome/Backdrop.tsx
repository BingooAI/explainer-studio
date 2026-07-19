// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import { useId } from 'react'
import { color, type ThemeTokens } from '../theme/tokens.js'

/**
 * The scene's background: paper, a wash, a meadow with a horizon, or a grid.
 *
 * Painted into the SVG rather than styled onto the container, so a headless MP4 render gets
 * the same background the player shows. A backdrop that lives in CSS is a backdrop the
 * exported video does not have.
 *
 * The horizon comes from the layout profile, which is also what seats anything standing on
 * the ground. Bingoo kept two numbers — grass painted at 0.78, props seated at 0.80 — so a
 * figure stood *below* the grass in landscape and floated above it in portrait.
 */

export type BackdropKind = 'paper' | 'gradient' | 'meadow' | 'sky' | 'grid' | 'none'

export interface BackdropProps {
  readonly kind: BackdropKind
  readonly canvas: { readonly width: number; readonly height: number }
  /** Fraction of canvas height where the ground begins. */
  readonly horizon: number
  readonly theme: ThemeTokens
}

export function Backdrop({ kind, canvas, horizon, theme }: BackdropProps): JSX.Element {
  // A page can hold many Stages, and a fixed gradient id would have them overwrite each
  // other's definitions — every scene would render with the last one's colours.
  const uid = useId().replace(/:/g, '')
  const { width: w, height: h } = canvas

  return (
    <g aria-hidden>
      <rect x={0} y={0} width={w} height={h} fill={color(theme, 'surface')} />

      {kind === 'meadow' ? <Meadow width={w} height={h} horizon={h * horizon} theme={theme} /> : null}
      {kind === 'sky' ? <Sky width={w} height={h} theme={theme} uid={uid} /> : null}
      {kind === 'grid' ? <GridPaper width={w} height={h} theme={theme} /> : null}
      {kind === 'gradient' ? <Wash width={w} height={h} theme={theme} uid={uid} /> : null}
    </g>
  )
}

interface BandProps {
  readonly width: number
  readonly height: number
  readonly theme: ThemeTokens
}

function Meadow({ width, height, horizon, theme }: BandProps & { horizon: number }): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={width} height={horizon} fill={color(theme, 'paper')} />
      {/* A shallow rise rather than a ruled line: a straight horizon reads as a chart axis. */}
      <path
        d={`M0 ${horizon} Q ${width * 0.25} ${horizon - height * 0.05} ${width * 0.5} ${horizon} T ${width} ${horizon} L ${width} ${height} L 0 ${height} Z`}
        fill={color(theme, 'good')}
        opacity={0.28}
      />
      <path
        d={`M0 ${height * 0.93} Q ${width * 0.4} ${height * 0.88} ${width} ${height * 0.94} L ${width} ${height} L 0 ${height} Z`}
        fill={color(theme, 'deep')}
        opacity={0.22}
      />
    </g>
  )
}

function Sky({ width, height, theme, uid }: BandProps & { uid: string }): JSX.Element {
  const id = `sky-${uid}`
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color(theme, 'accent2')} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color(theme, 'paper')} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </g>
  )
}

function Wash({ width, height, theme, uid }: BandProps & { uid: string }): JSX.Element {
  const id = `wash-${uid}`
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color(theme, 'paper')} />
          <stop offset="100%" stopColor={color(theme, 'faint')} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </g>
  )
}

function GridPaper({ width, height, theme }: BandProps): JSX.Element {
  // Spacing scales with the canvas, so the grid reads the same at any size. A fixed step
  // gives a dense mesh on a tall canvas and a sparse one on a wide canvas.
  const step = Math.min(width, height) / 18
  const faint = color(theme, 'faint')
  const lines: JSX.Element[] = []

  for (let x = step; x < width; x += step) {
    lines.push(
      <line
        key={`v${String(x)}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={faint}
        strokeWidth={1}
        opacity={0.35}
      />,
    )
  }
  for (let y = step; y < height; y += step) {
    lines.push(
      <line
        key={`h${String(y)}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={faint}
        strokeWidth={1}
        opacity={0.35}
      />,
    )
  }

  return <g>{lines}</g>
}
