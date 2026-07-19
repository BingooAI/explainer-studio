// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { createRegistry, type Registry } from '@bingoo.ai/explainer-kernel'
import type { Rect, RenderItem, ResolvedProfiles } from '@bingoo.ai/explainer-core'
import { z } from 'zod'
import type { ComponentType } from 'react'

/**
 * Painters are a registry, not a switch in the Stage.
 *
 * This is the same rule as everywhere else (R1), and here it has a concrete payoff: a
 * plugin that registers a new element type ships its painter alongside it, and the Stage
 * never grows a branch. The alternative — one component with a `switch (item.type)` — means
 * every new kit is a change to core rendering, reviewed by us, released by us.
 */

export interface PainterProps {
  readonly item: RenderItem
  /** The locale's strings. Content holds keys, never text (R4). */
  readonly strings: Readonly<Record<string, string>>
  readonly profiles: ResolvedProfiles
  readonly canvas: { readonly width: number; readonly height: number }
  /**
   * Every placed element's rectangle.
   *
   * A connector needs both endpoints even when one is not on screen yet, so it cannot work
   * from the item list alone.
   */
  readonly rects: Readonly<Record<string, Rect>>
}

export type Painter = ComponentType<PainterProps>

export const painterDescriptor = z.object({
  /** The element `type` this paints, e.g. `text`, `image`, `fraction-bar`. */
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
})

export type PainterDescriptor = z.infer<typeof painterDescriptor>
export type PainterRegistry = Registry<PainterDescriptor, Painter>

export function createPainterRegistry(): PainterRegistry {
  return createRegistry<PainterDescriptor, Painter>({ kind: 'painter', schema: painterDescriptor })
}

export function registerPainter(
  registry: PainterRegistry,
  descriptor: PainterDescriptor,
  painter: Painter,
): void {
  registry.register({ descriptor, create: () => painter })
}
