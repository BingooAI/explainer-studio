// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { color, defaultTheme } from '../theme/tokens.js'

/**
 * A stick figure — the character a lesson can point with.
 *
 * Joints are absolute world angles in degrees measured from straight down, so `0` points at
 * the floor and `±90` is horizontal. Absolute rather than relative to the parent bone: an
 * author setting `elbowL` means "the forearm points there", not "bend this much from
 * wherever the upper arm happens to be", which is the only one of the two a person can
 * picture without doing trigonometry.
 */

export type FaceExpression = 'neutral' | 'happy' | 'think' | 'surprise'

interface StickContent {
  readonly face?: unknown
  /** Phase through the walk cycle, 0..1. Absent means standing. */
  readonly walk?: unknown
  /** Named joint angles in degrees, overriding the rest pose or the walk. */
  readonly joints?: unknown
}

const DEFAULT_JOINTS: Readonly<Record<string, number>> = {
  neck: 0,
  shoulderL: -28,
  elbowL: -20,
  shoulderR: 28,
  elbowR: 20,
  hipL: -12,
  kneeL: -8,
  hipR: 12,
  kneeR: 8,
}

interface Point {
  readonly x: number
  readonly y: number
}

/** Forward kinematics: extend `length` from `from` at `degrees` off the downward vertical. */
function extend(from: Point, length: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180
  return { x: from.x + length * Math.sin(radians), y: from.y + length * Math.cos(radians) }
}

/**
 * A walk cycle, derived from the pose rather than authored joint by joint.
 *
 * Bingoo has no gait at all — the `walk` verb exists and renders nothing. Legs swing in
 * antiphase, knees only bend on the forward swing (a straight leg on the backswing is what
 * reads as a stride rather than a shuffle), arms counter the legs, and the body bobs at
 * twice the stride rate because there are two footfalls per cycle.
 */
function walkJoints(phase: number): Record<string, number> {
  const swing = Math.sin(phase * Math.PI * 2)
  const counter = Math.sin(phase * Math.PI * 2 + Math.PI)

  return {
    hipL: swing * 26,
    hipR: counter * 26,
    kneeL: swing * 26 + Math.max(0, Math.sin(phase * Math.PI * 2 + 0.6)) * 24,
    kneeR: counter * 26 + Math.max(0, Math.sin(phase * Math.PI * 2 + Math.PI + 0.6)) * 24,
    shoulderL: counter * 18 - 10,
    shoulderR: swing * 18 + 10,
    elbowL: counter * 12 - 10,
    elbowR: swing * 12 + 10,
  }
}

export function StickPainter({ item }: PainterProps): JSX.Element {
  const content = item.content as StickContent | null
  const walking = typeof content?.walk === 'number' ? content.walk : undefined

  const authored =
    typeof content?.joints === 'object' && content.joints !== null
      ? (content.joints as Record<string, number>)
      : {}

  const joints: Record<string, number> = {
    ...DEFAULT_JOINTS,
    ...(walking === undefined ? {} : walkJoints(walking)),
    // An authored joint always wins, so a scene can override one limb of a walk.
    ...authored,
  }

  const size = Math.min(item.rect.height * 0.94, item.rect.width * 1.7)
  const headR = size * 0.1
  const neck = size * 0.05
  const torso = size * 0.32
  const upper = size * 0.17
  const fore = size * 0.16
  const thigh = size * 0.19
  const shin = size * 0.18

  // Seated on the bottom of its rect rather than centred in it. Bingoo centred, so a figure
  // the layout had placed on the ground hovered roughly 9% of its own height above it —
  // visible in every scene with a horizon.
  const reach = headR * 2 + neck + torso + thigh + shin
  const cx = item.rect.x + item.rect.width / 2
  const topY = item.rect.y + item.rect.height - reach

  const head: Point = { x: cx, y: topY + headR }
  const shoulder = extend({ x: head.x, y: head.y + headR }, neck, joints['neck'] ?? 0)
  const hip: Point = { x: shoulder.x, y: shoulder.y + torso }

  const elbowL = extend(shoulder, upper, joints['shoulderL'] ?? 0)
  const elbowR = extend(shoulder, upper, joints['shoulderR'] ?? 0)
  const kneeL = extend(hip, thigh, joints['hipL'] ?? 0)
  const kneeR = extend(hip, thigh, joints['hipR'] ?? 0)

  const bone = {
    stroke: 'currentColor',
    strokeWidth: size * 0.028,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  }
  const line = (points: Point[]): string => points.map((p) => `${p.x},${p.y}`).join(' ')

  const face = typeof content?.face === 'string' ? (content.face as FaceExpression) : 'neutral'

  return (
    <g>
      <polyline points={line([shoulder, elbowL, extend(elbowL, fore, joints['elbowL'] ?? 0)])} {...bone} />
      <polyline points={line([shoulder, elbowR, extend(elbowR, fore, joints['elbowR'] ?? 0)])} {...bone} />
      <polyline points={line([hip, kneeL, extend(kneeL, shin, joints['kneeL'] ?? 0)])} {...bone} />
      <polyline points={line([hip, kneeR, extend(kneeR, shin, joints['kneeR'] ?? 0)])} {...bone} />
      {/* Spine over the limbs, so shoulders and hips read as joints rather than as gaps. */}
      <line x1={shoulder.x} y1={shoulder.y} x2={hip.x} y2={hip.y} {...bone} />
      <circle
        cx={head.x}
        cy={head.y}
        r={headR}
        stroke="currentColor"
        strokeWidth={size * 0.025}
        fill={color(defaultTheme, 'paper')}
      />
      <Face cx={head.x} cy={head.y} r={headR} expression={face} />
    </g>
  )
}

interface FaceProps {
  readonly cx: number
  readonly cy: number
  readonly r: number
  readonly expression: FaceExpression
}

function Face({ cx, cy, r, expression }: FaceProps): JSX.Element {
  const eyeY = cy - r * 0.15
  const eyeDx = r * 0.4
  const weight = Math.max(2, r * 0.12)
  const stroke = {
    stroke: 'currentColor',
    strokeWidth: weight,
    fill: 'none',
    strokeLinecap: 'round' as const,
  }

  return (
    <g>
      <circle cx={cx - eyeDx} cy={eyeY} r={r * 0.11} fill="currentColor" />
      <circle cx={cx + eyeDx} cy={eyeY} r={r * 0.11} fill="currentColor" />

      {expression === 'think' ? (
        <path
          d={`M ${cx + eyeDx - r * 0.2} ${eyeY - r * 0.35} q ${r * 0.2} ${-r * 0.12} ${r * 0.4} 0`}
          {...stroke}
          strokeWidth={weight * 0.8}
        />
      ) : null}

      {expression === 'happy' ? (
        <path
          d={`M ${cx - r * 0.35} ${cy + r * 0.25} Q ${cx} ${cy + r * 0.6} ${cx + r * 0.35} ${cy + r * 0.25}`}
          {...stroke}
        />
      ) : expression === 'surprise' ? (
        <circle cx={cx} cy={cy + r * 0.35} r={r * 0.16} {...stroke} />
      ) : expression === 'think' ? (
        <line x1={cx - r * 0.2} y1={cy + r * 0.35} x2={cx + r * 0.3} y2={cy + r * 0.3} {...stroke} />
      ) : (
        <line x1={cx - r * 0.3} y1={cy + r * 0.35} x2={cx + r * 0.3} y2={cy + r * 0.35} {...stroke} />
      )}
    </g>
  )
}
