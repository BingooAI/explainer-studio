// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Easing } from '../profiles/schema.js'

/**
 * Cubic-bezier easing, the same curve CSS uses, solved without a browser.
 *
 * The engine must produce identical numbers in a headless MP4 render and in a browser
 * (R3), so it cannot delegate easing to the platform. Two renderers reading the same
 * profile but solving the curve differently would drift apart slowly enough that nobody
 * would notice until a video and its preview disagreed.
 */

const NEWTON_ITERATIONS = 6
const NEWTON_MIN_SLOPE = 0.001
const SUBDIVISION_EPSILON = 1e-7
const SUBDIVISION_MAX = 12

/**
 * Evaluates the curve at `x` (progress through the duration) and returns eased progress.
 *
 * Control points are clamped to [0,1] on the x axis, as CSS requires: a curve that is not
 * a function of x has no single answer, and silently picking one would make output depend
 * on the solver rather than on the profile.
 */
export function ease(curve: Easing, x: number): number {
  const [x1, y1, x2, y2] = curve

  if (x <= 0) return 0
  if (x >= 1) return 1
  // A straight line needs no solving, and this is the common case for the `linear` curve.
  if (x1 === y1 && x2 === y2) return x

  const cx1 = clamp01(x1)
  const cx2 = clamp01(x2)
  return bezier(y1, y2, solveForT(cx1, cx2, x))
}

/** One axis of a cubic bezier with endpoints fixed at 0 and 1. */
function bezier(a1: number, a2: number, t: number): number {
  const c = 3 * a1
  const b = 3 * (a2 - a1) - c
  const a = 1 - c - b
  return ((a * t + b) * t + c) * t
}

function slope(a1: number, a2: number, t: number): number {
  const c = 3 * a1
  const b = 3 * (a2 - a1) - c
  const a = 1 - c - b
  return (3 * a * t + 2 * b) * t + c
}

/**
 * Newton-Raphson where the curve is steep enough to converge, bisection where it is not.
 *
 * Newton alone diverges on the flat sections of an ease-in-out curve — exactly the curves
 * we ship — so the fallback is not defensive padding, it is the case that actually occurs.
 */
function solveForT(x1: number, x2: number, x: number): number {
  let t = x

  for (let i = 0; i < NEWTON_ITERATIONS; i += 1) {
    const currentSlope = slope(x1, x2, t)
    if (currentSlope === 0) break
    if (Math.abs(currentSlope) < NEWTON_MIN_SLOPE) break
    t -= (bezier(x1, x2, t) - x) / currentSlope
  }

  const error = bezier(x1, x2, t) - x
  if (Math.abs(error) < SUBDIVISION_EPSILON) return t

  let low = 0
  let high = 1
  t = x

  for (let i = 0; i < SUBDIVISION_MAX; i += 1) {
    const value = bezier(x1, x2, t)
    if (Math.abs(value - x) < SUBDIVISION_EPSILON) return t
    if (value > x) high = t
    else low = t
    t = (low + high) / 2
  }

  return t
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

export const LINEAR: Easing = [0, 0, 1, 1]
