// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Pose, Rect } from '@bingoo.ai/explainer-core'

/**
 * Turns a pose into an SVG transform.
 *
 * This is the only arithmetic the renderer is allowed to do. Everything else — when, how
 * long, what curve — was decided by the engine (R3); a painter that computed its own
 * easing would be a second source of truth, and the two would drift apart in ways nobody
 * notices until a video disagrees with its preview.
 *
 * Pose offsets are fractions of the element's own size rather than canvas units, so an
 * element nudged "a tenth to the left" moves the same *relative* distance whatever size
 * layout gave it. That is what keeps motion looking consistent across aspects.
 */

export function transformFor(rect: Rect, pose: Pose): string | undefined {
  const dx = pose.dx * rect.width
  const dy = pose.dy * rect.height
  const moved = dx !== 0 || dy !== 0
  const rotated = pose.rotate !== 0
  const scaled = pose.scale !== 1

  // Most items at most times are at rest. Returning undefined rather than an identity
  // transform keeps the DOM free of attributes that mean nothing, which matters when an
  // editor is diffing the tree sixty times a second.
  if (!moved && !rotated && !scaled) return undefined

  const parts: string[] = []
  if (moved) parts.push(`translate(${round(dx)} ${round(dy)})`)

  if (rotated || scaled) {
    // Rotation and scale pivot on the element's centre. Around the origin they would fling
    // the element across the canvas, which is never what "make this a bit bigger" means.
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    parts.push(`translate(${round(cx)} ${round(cy)})`)
    if (rotated) parts.push(`rotate(${round(pose.rotate)})`)
    if (scaled) parts.push(`scale(${round(pose.scale)})`)
    parts.push(`translate(${round(-cx)} ${round(-cy)})`)
  }

  return parts.join(' ')
}

/**
 * Three decimals is under a thousandth of a pixel on a 1600-wide canvas — far below
 * anything visible, and it keeps golden output stable across platforms whose floating
 * point differs in the last bits.
 */
function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** Where text sits within its allotted rect, given the alignment layout passed through. */
export function anchorFor(align: 'start' | 'center' | 'end' | 'stretch'): {
  x: (rect: Rect) => number
  anchor: 'start' | 'middle' | 'end'
} {
  switch (align) {
    case 'start':
      return { x: (rect) => rect.x, anchor: 'start' }
    case 'end':
      return { x: (rect) => rect.x + rect.width, anchor: 'end' }
    default:
      return { x: (rect) => rect.x + rect.width / 2, anchor: 'middle' }
  }
}
