// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { frame, type Program, type ResolvedProfiles } from '@bingoo.ai/explainer-core'
import { useMemo, type JSX } from 'react'
import { Stage } from '../Stage.js'
import type { PainterRegistry } from '../painters/registry.js'
import type { ThemeTokens } from '../theme/tokens.js'
import { clock } from './format.js'
import { PREFIX } from './styles.js'

/**
 * What a scrub position actually looks like.
 *
 * A timestamp tells you where you are on a clock; it does not tell you what is there.
 * Every player people already use answers "what is at this point" with a picture, because
 * that is the question being asked — a teacher dragging the scrubber is looking for the
 * diagram, not for 2:14.
 *
 * The thumbnail is a real render at that instant, not a stored image. `frame(program, t)`
 * is pure and cheap (ARCHITECTURE §1), so the preview cannot disagree with what playback
 * will show — which a pre-baked storyboard eventually does, the moment a lesson is edited.
 */

export interface ScrubPreviewProps {
  readonly program: Program
  readonly profiles: ResolvedProfiles
  readonly painters: PainterRegistry
  readonly theme?: ThemeTokens | undefined
  /** Program time being previewed. */
  readonly at: number
  /** Horizontal position within the track, 0..1. */
  readonly position: number
  readonly title: string
}

/**
 * Half the preview's width, as a fraction of a typical track.
 *
 * A preview centred on the first chapter runs off the left edge and is clipped by the
 * player's own rounded frame — which is exactly where a first-time viewer hovers. Clamping
 * keeps it inside; the arrow is not drawn, so a preview that has slid sideways still reads
 * as belonging to the point under the cursor.
 */
const HALF_WIDTH_FRACTION = 0.09

const clamped = (position: number): number =>
  Math.min(1 - HALF_WIDTH_FRACTION, Math.max(HALF_WIDTH_FRACTION, position))

export function ScrubPreview({
  program,
  profiles,
  painters,
  theme,
  at,
  position,
  title,
}: ScrubPreviewProps): JSX.Element {
  // Rounded to a tenth of a second so moving the pointer a pixel does not rebuild the
  // frame; the eye cannot see the difference and React can skip the work.
  const sampled = Math.round(at * 10) / 10
  const model = useMemo(() => frame(program, sampled), [program, sampled])

  return (
    <div
      className={`${PREFIX}-preview`}
      style={{
        left: `${(clamped(position) * 100).toFixed(2)}%`,
      }}
      role="tooltip"
      aria-hidden
    >
      {/* A notch under the card, at the true pointer position rather than the card's.
          Without it a clamped card near either end reads as describing some other point —
          the connection between "here" and "this is what is here" has to be drawn. */}
      <span
        className={`${PREFIX}-preview-notch`}
        style={{ left: `${((position - clamped(position)) * 100 + 50).toFixed(2)}%` }}
      />
      <div className={`${PREFIX}-preview-shot`}>
        <Stage
          model={model}
          painters={painters}
          profiles={profiles}
          captions={false}
          backdrop="paper"
          {...(theme ? { theme } : {})}
        />
      </div>
      <div className={`${PREFIX}-preview-meta`}>
        <span className={`${PREFIX}-preview-title`}>{title}</span>
        <span className={`${PREFIX}-preview-time`}>{clock(at)}</span>
      </div>
    </div>
  )
}
