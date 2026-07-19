// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { RenderModel, ResolvedProfiles } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import { Backdrop, type BackdropKind } from './chrome/Backdrop.js'
import { CaptionBand } from './chrome/CaptionBand.js'
import { CARD_SLOTS, SlotCard } from './chrome/SlotCard.js'
import type { PainterRegistry } from './painters/registry.js'
import { color, defaultTheme, type ThemeTokens } from './theme/tokens.js'
import { transformFor } from './transform.js'

/**
 * The Stage paints a `RenderModel` and does nothing else.
 *
 * It owns no timing, no layout and no easing — those were decided by the engine (R3). A
 * renderer that recomputed any of them would be a second source of truth, and the two would
 * drift apart in ways nobody notices until a video disagrees with its own preview.
 *
 * Four layers, in this order, each earning its place:
 *
 *   1. **backdrop** — painted, not styled, so a headless export gets it too
 *   2. **slot cards** — panels behind grouped regions; what makes a scene look composed
 *   3. **items** — already sorted back to front by the engine
 *   4. **chrome** — the caption, drawn inside the canvas so the exported video has it
 */

export interface StageProps {
  readonly model: RenderModel
  readonly painters: PainterRegistry
  readonly profiles: ResolvedProfiles
  readonly theme?: ThemeTokens
  /** Describes the lesson for assistive technology. */
  readonly label?: string
  /** Captions are drawn by default so an export carries them. */
  readonly captions?: boolean
  readonly backdrop?: BackdropKind
  readonly className?: string
}

export function Stage({
  model,
  painters,
  profiles,
  theme = defaultTheme,
  label,
  captions = true,
  backdrop = 'paper',
  className,
}: StageProps): JSX.Element {
  const metrics = { profiles, script: undefined }

  // Only regions that actually hold something get a card. An empty panel is a promise of
  // content the scene never makes good on.
  const occupied = new Set(model.items.map((item) => item.slot))

  return (
    <svg
      viewBox={`0 0 ${model.canvas.width} ${model.canvas.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={label ?? 'Lesson'}
      data-scene={model.sceneId}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <Backdrop
        kind={backdrop}
        canvas={model.canvas}
        horizon={profiles.layout.horizon[model.aspect] ?? 0.8}
        theme={theme}
      />

      {Object.entries(model.slots).map(([name, rect]) =>
        CARD_SLOTS.has(name) && occupied.has(name) ? (
          <SlotCard key={`card-${name}`} rect={rect} theme={theme} />
        ) : null,
      )}

      <g color={color(theme, 'ink')}>
        {model.items.map((item) => {
          // An unregistered type is a configuration problem the quality gate reports, not a
          // reason for the rest of the lesson to disappear.
          if (!painters.has(item.type)) return null
          const Painter = painters.get(item.type)

          return (
            <g
              key={item.id}
              data-element={item.id}
              data-type={item.type}
              transform={transformFor(item.rect, item.pose)}
              opacity={item.pose.opacity === 1 ? undefined : item.pose.opacity}
            >
              <Painter
                item={item}
                strings={model.strings}
                profiles={profiles}
                canvas={model.canvas}
                rects={model.rects}
              />
            </g>
          )
        })}
      </g>

      {captions && model.caption ? (
        <CaptionBand canvas={model.canvas} text={model.caption.text} theme={theme} metrics={metrics} />
      ) : null}
    </svg>
  )
}
