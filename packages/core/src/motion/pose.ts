// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Pose } from '../schema/primitives.js'
import { clamp01 } from './easing.js'

/**
 * Poses are discrete named states; motion is interpolation between two of them.
 *
 * Keeping the author's vocabulary discrete and the engine's maths continuous is what makes
 * "declare intent, never milliseconds" (R5) workable. An author says `move` to `raised`;
 * how long that takes and what curve it follows comes from the profile, so retuning the
 * house style retimes every lesson pinned to it.
 */

export const restingPose: Pose = {
  visible: true,
  dx: 0,
  dy: 0,
  scale: 1,
  opacity: 1,
  rotate: 0,
  drawProgress: 1,
}

/** Off-screen resting state: what an element looks like before it has been revealed. */
export const hiddenPose: Pose = { ...restingPose, visible: false, opacity: 0 }

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * Interpolates every numeric channel and switches `visible` at the point it becomes
 * meaningful.
 *
 * `visible` is deliberately not a linear blend: it turns on as soon as the transition
 * starts and off only once it has finished. An element fading in is visible from the first
 * frame at opacity 0.01, and one fading out stays visible until it has actually gone —
 * treating it as a midpoint switch would make things pop in and out.
 */
export function lerpPose(from: Pose, to: Pose, t: number): Pose {
  const p = clamp01(t)

  return {
    visible: p >= 1 ? to.visible : from.visible || to.visible,
    dx: lerp(from.dx, to.dx, p),
    dy: lerp(from.dy, to.dy, p),
    scale: lerp(from.scale, to.scale, p),
    opacity: lerp(from.opacity, to.opacity, p),
    rotate: lerp(from.rotate, to.rotate, p),
    drawProgress: lerp(from.drawProgress, to.drawProgress, p),
  }
}

/** Layers a transient effect on top of a base pose, without either owning the other. */
export function composePose(base: Pose, overlay: Partial<Pose>): Pose {
  return {
    visible: overlay.visible ?? base.visible,
    dx: base.dx + (overlay.dx ?? 0),
    dy: base.dy + (overlay.dy ?? 0),
    scale: base.scale * (overlay.scale ?? 1),
    opacity: base.opacity * (overlay.opacity ?? 1),
    rotate: base.rotate + (overlay.rotate ?? 0),
    drawProgress: overlay.drawProgress ?? base.drawProgress,
  }
}
