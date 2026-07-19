// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { createRegistry, type Registry } from '@bingoo.ai/explainer-kernel'
import { z } from 'zod'
import { registryKey } from '../schema/primitives.js'
import type { Pose } from '../schema/primitives.js'
import { LINEAR, ease } from './easing.js'

/**
 * Emphasis is a small keyframe grammar: pulse, shake, glow.
 *
 * It is a registry rather than a switch (R1) so a deployment can add its own without a core
 * release — and because emphasis is exactly the kind of thing a school's designer will want
 * to change while wanting nothing else changed.
 *
 * Keyframes describe a *transient overlay*, not a new resting state. An emphasised element
 * returns to exactly where it was, which is what lets emphasis be applied to anything
 * without the choreographer tracking what it disturbed.
 */

const keyframe = z.object({
  /** Position through the effect, 0 to 1. */
  at: z.number().min(0).max(1),
  scale: z.number().positive().max(8).optional(),
  opacity: z.number().min(0).max(1).optional(),
  rotate: z.number().min(-360).max(360).optional(),
  dx: z.number().min(-4).max(4).optional(),
  dy: z.number().min(-4).max(4).optional(),
})

export type Keyframe = z.infer<typeof keyframe>

export const emphasisDescriptor = z.object({
  id: registryKey,
  /** Seconds. Overridable per profile later; a sensible default belongs with the effect. */
  duration: z.number().positive().max(10).default(0.6),
  easing: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  /** Must start at 0 and end at 1, so the element returns to rest. Checked on registration. */
  keyframes: z.array(keyframe).min(2).max(16),
})

export type EmphasisDescriptor = z.infer<typeof emphasisDescriptor>
export type EmphasisRegistry = Registry<EmphasisDescriptor, EmphasisDescriptor>

export function createEmphasisRegistry(options: { includeBuiltIns?: boolean } = {}): EmphasisRegistry {
  const registry = createRegistry<EmphasisDescriptor, EmphasisDescriptor>({
    kind: 'emphasis',
    schema: emphasisDescriptor.superRefine((value, ctx) => {
      const first = value.keyframes[0]
      const last = value.keyframes[value.keyframes.length - 1]

      if (first?.at !== 0 || last?.at !== 1) {
        ctx.addIssue({
          code: 'custom',
          message:
            'keyframes must start at 0 and end at 1, so the element returns to rest — an emphasis that leaves it displaced would silently corrupt the layout',
        })
      }

      for (let i = 1; i < value.keyframes.length; i += 1) {
        if (value.keyframes[i]!.at < value.keyframes[i - 1]!.at) {
          ctx.addIssue({ code: 'custom', message: 'keyframes must be ordered by `at`' })
          break
        }
      }
    }),
  })

  if (options.includeBuiltIns !== false) {
    for (const effect of builtInEmphasis) {
      registry.register({ descriptor: effect, create: () => effect })
    }
  }

  return registry
}

/**
 * The overlay at a point through the effect. Returns an empty overlay outside its span, so
 * a caller can apply it unconditionally.
 */
export function emphasisAt(effect: EmphasisDescriptor, progress: number): Partial<Pose> {
  if (progress <= 0 || progress >= 1) return {}

  const eased = ease(effect.easing ?? LINEAR, progress)
  const frames = effect.keyframes

  let index = 0
  while (index < frames.length - 2 && frames[index + 1]!.at < eased) index += 1

  const from = frames[index]!
  const to = frames[index + 1]!
  const span = to.at - from.at
  const local = span <= 0 ? 0 : (eased - from.at) / span

  return {
    scale: blend(from.scale, to.scale, local, 1),
    opacity: blend(from.opacity, to.opacity, local, 1),
    rotate: blend(from.rotate, to.rotate, local, 0),
    dx: blend(from.dx, to.dx, local, 0),
    dy: blend(from.dy, to.dy, local, 0),
  }
}

/** A channel a keyframe does not mention stays at its neutral value rather than jumping. */
function blend(from: number | undefined, to: number | undefined, t: number, neutral: number): number {
  const a = from ?? neutral
  const b = to ?? neutral
  return a + (b - a) * t
}

/**
 * A small starting set, chosen so each says something different: attention without motion,
 * attention with motion, and a negative signal. More is easy to add and hard to keep
 * meaningful — an emphasis vocabulary where three effects mean "look here" teaches nothing.
 */
export const builtInEmphasis: readonly EmphasisDescriptor[] = [
  {
    id: 'pulse',
    duration: 0.6,
    keyframes: [
      { at: 0, scale: 1 },
      { at: 0.5, scale: 1.08 },
      { at: 1, scale: 1 },
    ],
  },
  {
    id: 'glow',
    duration: 0.8,
    keyframes: [
      { at: 0, opacity: 1 },
      { at: 0.5, opacity: 0.65 },
      { at: 1, opacity: 1 },
    ],
  },
  {
    id: 'shake',
    duration: 0.5,
    keyframes: [
      { at: 0, dx: 0 },
      { at: 0.25, dx: -0.04 },
      { at: 0.5, dx: 0.04 },
      { at: 0.75, dx: -0.02 },
      { at: 1, dx: 0 },
    ],
  },
  {
    id: 'bounce',
    duration: 0.7,
    keyframes: [
      { at: 0, dy: 0 },
      { at: 0.4, dy: -0.12 },
      { at: 0.7, dy: 0.02 },
      { at: 1, dy: 0 },
    ],
  },
]
