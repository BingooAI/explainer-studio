// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX, ReactNode } from 'react'
import {
  CaptionsIcon,
  CheckIcon,
  ChaptersIcon,
  FullscreenIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  ReplayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeIcon,
} from './icons.js'
import { PREFIX } from './styles.js'

/**
 * The control row.
 *
 * Controls stay visible rather than fading out over the stage. A video player hides them
 * because the video is the point and the chrome is in the way; in a lesson the teacher is
 * driving — pausing, going back over a step, jumping to the question — and hunting for a
 * control that vanished is friction at exactly the wrong moment.
 */

export interface PlayerBarProps {
  readonly playing: boolean
  readonly finished: boolean
  readonly atGate: boolean
  readonly captions: boolean
  readonly speed: number
  readonly volume: number
  readonly muted: boolean
  readonly canPrev: boolean
  readonly canNext: boolean
  readonly fullscreen: boolean
  readonly chaptersOpen: boolean
  readonly showChapters: boolean
  readonly speeds?: readonly number[]
  readonly skipSeconds?: number
  readonly disabled?: boolean
  readonly onToggle: () => void
  readonly onSkip: (seconds: number) => void
  readonly onScene: (delta: -1 | 1) => void
  readonly onCaptions: (next: boolean) => void
  readonly onSpeed: (next: number) => void
  readonly onVolume: (next: number) => void
  readonly onMute: (next: boolean) => void
  readonly onChapters: () => void
  readonly onFullscreen: () => void
  /** Popovers anchored to the bar, so they are not clipped by the player's rounded frame. */
  readonly children?: ReactNode
}

/**
 * Offered speeds, and how far the skip buttons jump.
 *
 * Defaults, not constants (R1). A language school reviewing pronunciation wants 0.5×; a
 * revision deployment wants 3×; a lesson of long narration wants 30-second skips. None of
 * those should need a fork, and none of them is a judgement we are in a position to make.
 */
export const DEFAULT_SPEEDS: readonly number[] = [0.75, 1, 1.25, 1.5, 2]
export const DEFAULT_SKIP_SECONDS = 10

export function PlayerBar(props: PlayerBarProps): JSX.Element {
  const { playing, finished, atGate, disabled = false } = props
  const speeds = props.speeds ?? DEFAULT_SPEEDS
  const skip = props.skipSeconds ?? DEFAULT_SKIP_SECONDS

  const label = atGate ? 'Continue past the question' : finished ? 'Play again' : playing ? 'Pause' : 'Play'

  return (
    <div className={`${PREFIX}-bar`}>
      <button
        type="button"
        className={`${PREFIX}-btn ${PREFIX}-btn--play`}
        onClick={props.onToggle}
        disabled={disabled}
        aria-label={label}
        title={label}
      >
        {atGate ? <CheckIcon /> : finished ? <ReplayIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <button
        type="button"
        className={`${PREFIX}-btn`}
        onClick={() => {
          props.onSkip(-skip)
        }}
        disabled={disabled}
        aria-label={`Back ${String(skip)} seconds`}
        title={`Back ${String(skip)}s`}
      >
        <SkipBackIcon seconds={skip} />
      </button>

      <button
        type="button"
        className={`${PREFIX}-btn`}
        onClick={() => {
          props.onSkip(skip)
        }}
        disabled={disabled}
        aria-label={`Forward ${String(skip)} seconds`}
        title={`Forward ${String(skip)}s`}
      >
        <SkipForwardIcon seconds={skip} />
      </button>

      <button
        type="button"
        className={`${PREFIX}-btn`}
        onClick={() => {
          props.onScene(-1)
        }}
        disabled={disabled || !props.canPrev}
        aria-label="Previous scene"
        title="Previous scene"
      >
        <PrevIcon />
      </button>

      <button
        type="button"
        className={`${PREFIX}-btn`}
        onClick={() => {
          props.onScene(1)
        }}
        disabled={disabled || !props.canNext}
        aria-label="Next scene"
        title="Next scene"
      >
        <NextIcon />
      </button>

      <div className={`${PREFIX}-volume`}>
        <button
          type="button"
          className={`${PREFIX}-btn`}
          onClick={() => {
            props.onMute(!props.muted)
          }}
          aria-label={props.muted ? 'Unmute narration' : 'Mute narration'}
          title={props.muted ? 'Unmute' : 'Mute'}
        >
          <VolumeIcon muted={props.muted || props.volume === 0} />
        </button>
        <input
          type="range"
          className={`${PREFIX}-volume-slider`}
          min={0}
          max={1}
          step={0.05}
          value={props.muted ? 0 : props.volume}
          onChange={(event) => {
            props.onVolume(Number(event.target.value))
          }}
          aria-label="Narration volume"
        />
      </div>

      <span className={`${PREFIX}-spacer`} />

      <button
        type="button"
        className={`${PREFIX}-btn`}
        aria-pressed={props.captions}
        onClick={() => {
          props.onCaptions(!props.captions)
        }}
        aria-label={props.captions ? 'Hide captions' : 'Show captions'}
        title="Captions"
      >
        <CaptionsIcon />
      </button>

      <button
        type="button"
        className={`${PREFIX}-btn`}
        onClick={() => {
          const index = speeds.indexOf(props.speed)
          props.onSpeed(speeds[(index + 1) % speeds.length] ?? 1)
        }}
        aria-label={`Playback speed, currently ${String(props.speed)} times`}
        title="Playback speed"
      >
        {props.speed}×
      </button>

      {props.showChapters ? (
        <button
          type="button"
          className={`${PREFIX}-btn`}
          onClick={props.onChapters}
          aria-expanded={props.chaptersOpen}
          aria-pressed={props.chaptersOpen}
          aria-label="Jump to a chapter"
          title="Chapters"
        >
          <ChaptersIcon />
        </button>
      ) : null}

      <button
        type="button"
        className={`${PREFIX}-btn`}
        onClick={props.onFullscreen}
        aria-label={props.fullscreen ? 'Leave full screen' : 'Full screen'}
        title="Full screen"
      >
        <FullscreenIcon exit={props.fullscreen} />
      </button>

      {props.children}
    </div>
  )
}
