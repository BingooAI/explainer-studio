// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program, ResolvedProfiles } from '@bingoo.ai/explainer-core'
import { useRef, useState, type JSX } from 'react'
import type { PainterRegistry } from '../painters/registry.js'
import type { ThemeTokens } from '../theme/tokens.js'
import { ScrubPreview } from './ScrubPreview.js'
import { clock, sceneTitle } from './format.js'
import { PREFIX } from './styles.js'

/**
 * The scrub track.
 *
 * A real `<input type="range">`, made invisible over a drawn track. Styling a range natively
 * means three vendor-prefixed pseudo-element trees that disagree about everything;
 * overlaying keeps the keyboard behaviour, screen-reader semantics and drag handling that
 * browsers already implement correctly, and leaves us a track we can draw on.
 *
 * Hovering shows what is at that point, because that is the question being asked — a
 * teacher dragging the scrubber is looking for the diagram, not for 2:14.
 */

export interface TimelineProps {
  readonly t: number
  readonly duration: number
  readonly program: Program
  readonly profiles: ResolvedProfiles
  readonly painters: PainterRegistry
  readonly theme?: ThemeTokens | undefined
  readonly onSeek: (t: number) => void
  readonly disabled?: boolean
  readonly nudgeSeconds?: number
}

/**
 * How far an arrow key moves the playhead.
 *
 * Deliberately smaller than the skip buttons: arrows are for finding a sentence, buttons
 * are for stepping past a passage. The browser's own step is one unit of `step`, which at
 * 0.05s is unusable.
 */
const DEFAULT_NUDGE_SECONDS = 5

export function Timeline({
  t,
  duration,
  program,
  profiles,
  painters,
  theme,
  onSeek,
  disabled = false,
  nudgeSeconds = DEFAULT_NUDGE_SECONDS,
}: TimelineProps): JSX.Element {
  const total = Math.max(duration, 0.001)
  const track = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const percent = (value: number): string => `${((value / total) * 100).toFixed(3)}%`

  // The preview sits under the cursor and shows the frame at exactly that instant.
  //
  // It used to snap to the enclosing scene's start, which made it look like it was
  // previewing a different point: hovering mid-scene drew the card back at the previous
  // marker, and clicking then seeked to the cursor rather than to what was pictured. Hover
  // and click have to agree, and the only way they can is if both mean the same time.
  const previewAt = hover === null ? null : Math.max(0, Math.min(total, hover))
  const previewSlot =
    previewAt === null
      ? undefined
      : (program.slots.find((slot) => previewAt >= slot.start && previewAt < slot.end) ??
        program.slots[program.slots.length - 1])

  return (
    <div className={`${PREFIX}-timeline`}>
      <div
        className={`${PREFIX}-scrub`}
        onPointerMove={(event) => {
          const box = track.current?.getBoundingClientRect()
          if (!box || box.width === 0) return
          setHover(((event.clientX - box.left) / box.width) * total)
        }}
        onPointerLeave={() => {
          setHover(null)
        }}
        onPointerDown={(event) => {
          // Seeking on pointer-down as well as through the range input.
          //
          // The invisible range handles keyboard, drag and screen readers correctly, but a
          // plain click on it is subject to the browser's own hit-testing against a control
          // that has no visible box. Handling the press here means the click lands where the
          // preview says it will, which is the only behaviour that makes the preview
          // trustworthy.
          if (disabled) return
          const box = track.current?.getBoundingClientRect()
          if (!box || box.width === 0) return
          onSeek(Math.max(0, Math.min(total, ((event.clientX - box.left) / box.width) * total)))
        }}
      >
        <input
          type="range"
          className={`${PREFIX}-range`}
          min={0}
          max={total}
          step={0.05}
          value={Math.min(t, total)}
          disabled={disabled}
          onChange={(event) => {
            onSeek(Number(event.target.value))
          }}
          onKeyDown={(event) => {
            // The browser steps by `step`, which at 0.05s is unusable. Five seconds is
            // roughly a sentence — the unit a person actually wants to move by.
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              onSeek(t + (event.key === 'ArrowRight' ? nudgeSeconds : -nudgeSeconds))
            }
          }}
          aria-label="Position in the lesson"
          aria-valuetext={`${clock(t)} of ${clock(total)}`}
        />
        <div className={`${PREFIX}-track`} ref={track}>
          <div className={`${PREFIX}-fill`} style={{ width: percent(Math.min(t, total)) }} />
          {program.slots.slice(1).map((slot) => (
            <span
              key={slot.scene.id}
              className={`${PREFIX}-mark`}
              style={{ left: percent(slot.start) }}
              aria-hidden
            />
          ))}
          <span className={`${PREFIX}-thumb`} style={{ left: percent(Math.min(t, total)) }} aria-hidden />
        </div>

        {previewSlot && previewAt !== null && !disabled ? (
          <ScrubPreview
            program={program}
            profiles={profiles}
            painters={painters}
            theme={theme}
            at={previewAt}
            position={previewAt / total}
            title={sceneTitle(program, previewSlot)}
          />
        ) : null}
      </div>

      <div className={`${PREFIX}-times`}>
        <span>{clock(t)}</span>
        <span>{clock(total)}</span>
      </div>
    </div>
  )
}
