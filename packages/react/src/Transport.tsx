// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { Player } from './usePlayer.js'

/**
 * Play, pause, scrub.
 *
 * The scrubber shows **where the gates are**, which a plain progress bar cannot. A teacher
 * scanning a lesson before class needs to know where it stops and asks something — those
 * are the moments they have to plan around, and finding them by dragging is how a preview
 * becomes a chore.
 *
 * Keyboard-operable throughout: space plays and pauses, the arrows scrub. In education this
 * is frequently a legal requirement rather than a courtesy.
 */

export interface TransportProps {
  readonly player: Player
  readonly program: Program
  readonly className?: string
}

const STEP_SECONDS = 5

export function Transport({ player, program, className }: TransportProps): JSX.Element {
  const { t, playing, atGate } = player
  const duration = Math.max(program.duration, 0.001)

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}
      onKeyDown={(event) => {
        if (event.key === ' ') {
          event.preventDefault()
          if (playing) player.pause()
          else player.play()
        }
        if (event.key === 'ArrowRight') player.seek(t + STEP_SECONDS)
        if (event.key === 'ArrowLeft') player.seek(t - STEP_SECONDS)
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (atGate) player.resume()
          else if (playing) player.pause()
          else player.play()
        }}
        aria-label={atGate ? 'Continue past the question' : playing ? 'Pause' : 'Play'}
        style={buttonStyle}
      >
        {atGate ? 'Continue' : playing ? '❚❚' : '▶'}
      </button>

      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', minWidth: '5.5ch' }}>
        {clock(t)}
      </span>

      <div style={{ position: 'relative', flex: 1, height: '1.5rem' }}>
        {/* Gate markers sit under the slider so the thumb stays draggable over them. */}
        {program.gateStarts.map((at) => (
          <span
            key={at}
            title="Question"
            aria-hidden
            style={{
              position: 'absolute',
              left: `${((at / duration) * 100).toFixed(2)}%`,
              top: '0.35rem',
              width: '3px',
              height: '0.8rem',
              marginLeft: '-1px',
              borderRadius: '2px',
              background: '#e07a42',
            }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={t}
          onChange={(event) => {
            player.seek(Number(event.target.value))
          }}
          aria-label="Position in the lesson"
          aria-valuetext={`${clock(t)} of ${clock(duration)}`}
          style={{ position: 'absolute', inset: 0, width: '100%', margin: 0 }}
        />
      </div>

      <span
        style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', minWidth: '5.5ch', opacity: 0.6 }}
      >
        {clock(duration)}
      </span>
    </div>
  )
}

const buttonStyle = {
  minWidth: '2.5rem',
  padding: '0.35rem 0.7rem',
  borderRadius: '0.4rem',
  border: '1px solid #d8cfc2',
  background: '#fff',
  cursor: 'pointer',
  font: 'inherit',
} as const

function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  return `${String(minutes)}:${String(total % 60).padStart(2, '0')}`
}
