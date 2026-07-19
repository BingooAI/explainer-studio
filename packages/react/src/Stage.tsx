// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { RenderModel, ResolvedProfiles } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterRegistry } from './painters/registry.js'
import { transformFor } from './transform.js'

/**
 * The Stage paints a `RenderModel` and does nothing else.
 *
 * It owns no timing, no layout and no easing — those were decided by the engine, and a
 * renderer that recomputed any of them would be a second source of truth (R3). Every
 * temptation to "just handle this one case here" is the beginning of two products that
 * look different and are each correct according to themselves.
 *
 * One `<svg>` with a viewBox in canvas units, so the whole lesson scales to any container
 * without a single number changing.
 */

export interface StageProps {
  readonly model: RenderModel
  readonly painters: PainterRegistry
  readonly profiles: ResolvedProfiles
  /** Describes the lesson for assistive technology. */
  readonly label?: string
  readonly className?: string
}

export function Stage({ model, painters, profiles, label, className }: StageProps): JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${model.canvas.width} ${model.canvas.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      // The scene is a live region rather than an image: its content changes as the lesson
      // plays, and a screen reader that announced it once would describe the first frame
      // for the whole lesson.
      role="img"
      aria-label={label ?? model.strings[model.sceneId] ?? 'Lesson'}
      data-scene={model.sceneId}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* Layer 1: backdrop. Painted rather than styled so a headless export gets it too. */}
      <rect
        x={0}
        y={0}
        width={model.canvas.width}
        height={model.canvas.height}
        fill="var(--explainer-surface, #ffffff)"
      />

      {/* Layer 2: items, already sorted back to front by the engine. */}
      <g color="var(--explainer-foreground, #111827)">
        {model.items.map((item) => {
          if (!painters.has(item.type)) {
            // An unregistered type is a configuration problem, not a reason to blank the
            // lesson. It renders as nothing and the quality gate reports it.
            return null
          }

          const Painter = painters.get(item.type)

          return (
            <g
              key={item.id}
              data-element={item.id}
              data-type={item.type}
              transform={transformFor(item.rect, item.pose)}
              opacity={item.pose.opacity === 1 ? undefined : item.pose.opacity}
            >
              <Painter item={item} strings={model.strings} profiles={profiles} canvas={model.canvas} />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
