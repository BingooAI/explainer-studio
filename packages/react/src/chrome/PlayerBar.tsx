// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import { CaptionsIcon, CheckIcon, PauseIcon, PlayIcon, ReplayIcon, SpeedIcon } from './icons.js'
import { PREFIX } from './styles.js'
import type { Player } from '../usePlayer.js'

/**
 * The transport bar.
 *
 * Controls stay visible rather than fading out over the stage. A video player hides them
 * because the video is the point and the chrome is in the way; in a lesson the teacher is
 * driving — pausing, going back over a step, jumping to the question — and hunting for a
 * control that vanished is friction at exactly the wrong moment.
 *
 * The scrubber is a real `<input type="range">` made invisible over a drawn track. Styling
 * a range input natively means three vendor-prefixed pseudo-element trees that disagree
 * about everything; overlaying keeps the keyboard behaviour, the screen-reader semantics
 * and the drag handling that browsers already implement correctly, and gives us a track we
 * can actually draw chapters on.
 */

export interface PlayerBarProps {
  readonly player: Player
  readonly program: Program
  readonly captions: boolean
  readonly onCaptionsChange: (next: boolean) => void
  readonly speed: number
  readonly onSpeedChange: (next: number) => void
}

const SPEEDS = [0.75, 1, 1.25, 1.5] as const
const SKIP_SECONDS = 5

export function PlayerBar({
  player,
  program,
  captions,
  onCaptionsChange,
  speed,
  onSpeedChange,
}: PlayerBarProps): JSX.Element {
  const duration = Math.max(program.duration, 0.001)
  const finished = player.t >= duration - 0.01
  const progress = Math.min(1, player.t / duration)

  const primaryLabel = player.atGate
    ? 'Continue past the question'
    : finished
      ? 'Play again'
      : player.playing
        ? 'Pause'
        : 'Play'

  return (
    <div className={`${PREFIX}-bar`}>
      <button
        type="button"
        className={`${PREFIX}-btn ${PREFIX}-btn--primary`}
        onClick={() => {
          if (player.atGate) player.resume()
          else if (finished) {
            player.seek(0)
            player.play()
          } else if (player.playing) player.pause()
          else player.play()
        }}
        aria-label={primaryLabel}
        title={primaryLabel}
      >
        {player.atGate ? (
          <CheckIcon />
        ) : finished ? (
          <ReplayIcon />
        ) : player.playing ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </button>

      <span className={`${PREFIX}-time`}>{clock(player.t)}</span>

      <div className={`${PREFIX}-scrub`}>
        <input
          type="range"
          className={`${PREFIX}-range`}
          min={0}
          max={duration}
          step={0.05}
          value={player.t}
          onChange={(event) => {
            player.seek(Number(event.target.value))
          }}
          onKeyDown={(event) => {
            // The browser's own arrow step is one unit of `step`, which at 0.05s is
            // unusable. Five seconds is roughly a sentence.
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              player.seek(player.t + (event.key === 'ArrowRight' ? SKIP_SECONDS : -SKIP_SECONDS))
            }
          }}
          aria-label="Position in the lesson"
          aria-valuetext={`${clock(player.t)} of ${clock(duration)}`}
        />
        <div className={`${PREFIX}-track`}>
          <div className={`${PREFIX}-fill`} style={{ width: `${(progress * 100).toFixed(2)}%` }} />
          {program.gateStarts.map((at) => (
            <span
              key={at}
              className={`${PREFIX}-chapter`}
              style={{ left: `${((at / duration) * 100).toFixed(2)}%` }}
              title="Question"
              aria-hidden
            />
          ))}
          <span
            className={`${PREFIX}-thumb`}
            style={{ left: `${(progress * 100).toFixed(2)}%` }}
            aria-hidden
          />
        </div>
      </div>

      <span className={`${PREFIX}-time`}>{clock(duration)}</span>

      <button
        type="button"
        className={`${PREFIX}-btn`}
        aria-pressed={captions}
        onClick={() => {
          onCaptionsChange(!captions)
        }}
        aria-label={captions ? 'Hide captions' : 'Show captions'}
        title={captions ? 'Hide captions' : 'Show captions'}
      >
        <CaptionsIcon />
      </button>

      <button
        type="button"
        className={`${PREFIX}-btn`}
        onClick={() => {
          const index = SPEEDS.indexOf(speed as (typeof SPEEDS)[number])
          onSpeedChange(SPEEDS[(index + 1) % SPEEDS.length] ?? 1)
        }}
        aria-label={`Playback speed, currently ${String(speed)} times`}
        title="Playback speed"
      >
        <SpeedIcon />
        {speed}×
      </button>
    </div>
  )
}

function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, '0')}`
}
