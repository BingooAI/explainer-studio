// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program, ResolvedProfiles } from '@bingoo.ai/explainer-core'
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react'
import { Stage } from './Stage.js'
import type { BackdropKind } from './chrome/Backdrop.js'
import { ChapterMenu } from './chrome/ChapterMenu.js'
import { PlayerBar } from './chrome/PlayerBar.js'
import { Timeline } from './chrome/Timeline.js'
import { AlertIcon, PlayIcon } from './chrome/icons.js'
import { PREFIX, ensureStyles } from './chrome/styles.js'
import { createBuiltInPainters } from './painters/builtin.js'
import type { PainterRegistry } from './painters/registry.js'
import type { ThemeTokens } from './theme/tokens.js'
import { usePlayer, type AudioClock } from './usePlayer.js'

/**
 * A lesson, playing.
 *
 * Everything on screen is derived from `frame(program, t)`. This component decides when to
 * sample and how to frame the result; it never decides what is drawn.
 */

export type PlayerStatus = 'ready' | 'loading' | 'error'
export type GatePlacement = 'below' | 'overlay' | 'left' | 'right'

export interface ExplainerPlayerProps {
  readonly program: Program
  readonly profiles: ResolvedProfiles
  /** Defaults to the built-in set. Pass your own to add element types (R1). */
  readonly painters?: PainterRegistry
  readonly theme?: ThemeTokens
  readonly audioClock?: AudioClock
  readonly autoPlay?: boolean
  readonly backdrop?: BackdropKind
  readonly title?: string
  readonly subtitle?: string
  /** Whether the chapter button is offered at all. */
  readonly showChapters?: boolean
  /**
   * Where a gate's question appears.
   *
   * `below` keeps the lesson unobstructed and suits a laptop; `overlay` puts the question
   * on the work it refers to, which is what a phone has room for; `left` and `right` suit a
   * wide screen where the diagram should stay visible while the learner answers.
   */
  readonly gatePlacement?: GatePlacement
  /** Offered playback speeds. Defaults to 0.75× through 2×. */
  readonly speeds?: readonly number[]
  /** How far the skip buttons jump. Defaults to 10 seconds. */
  readonly skipSeconds?: number
  readonly status?: PlayerStatus
  readonly errorMessage?: string
  readonly onVolumeChange?: (volume: number, muted: boolean) => void
  readonly onSpeedChange?: (speed: number) => void
  readonly className?: string
  /** Rendered while a gate is open — the host owns the question UI. */
  readonly renderGate?: (
    gate: NonNullable<Program['slots'][number]['scene']['gate']>,
    resume: () => void,
  ) => ReactNode
}

export function ExplainerPlayer({
  program,
  profiles,
  painters,
  theme,
  audioClock,
  autoPlay = false,
  backdrop = 'paper',
  title,
  subtitle,
  showChapters = true,
  speeds,
  skipSeconds,
  gatePlacement = 'below',
  status = 'ready',
  errorMessage,
  onVolumeChange,
  onSpeedChange,
  className,
  renderGate,
}: ExplainerPlayerProps): JSX.Element {
  ensureStyles()

  // Built once: a registry is an instance, and rebuilding it every render would discard
  // every painter's identity and remount the tree.
  const registry = useMemo(() => painters ?? createBuiltInPainters(), [painters])
  const shell = useRef<HTMLDivElement>(null)

  const [captions, setCaptions] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)

  const player = usePlayer({ program, autoPlay, ...(audioClock ? { audioClock } : {}) })
  const { model } = player
  const busy = status !== 'ready'
  const finished = player.t >= program.duration - 0.01

  const toggle = useCallback(() => {
    if (busy) return
    if (player.atGate) player.resume()
    else if (finished) {
      player.seek(0)
      player.play()
    } else if (player.playing) player.pause()
    else player.play()
  }, [busy, finished, player])

  const toScene = useCallback(
    (delta: -1 | 1) => {
      const next = program.slots[model.sceneIndex + delta]
      if (next) player.seek(next.start)
    },
    [model.sceneIndex, player, program.slots],
  )

  // Space and `k` from anywhere in the player, except while a control that already uses
  // space has focus — otherwise the button toggles and the handler toggles it back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!shell.current?.contains(event.target as Node)) return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (event.key === ' ' && tag && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return
      if (event.key !== ' ' && event.key !== 'k') return

      event.preventDefault()
      toggle()
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [toggle])

  useEffect(() => {
    const onChange = (): void => {
      setFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
    }
  }, [])

  const portrait = model.canvas.height > model.canvas.width

  return (
    <div
      ref={shell}
      className={[`${PREFIX}-player`, className].filter(Boolean).join(' ')}
      data-orientation={portrait ? 'portrait' : 'landscape'}
      data-at-gate={player.atGate}
      data-status={status}
      data-gate={gatePlacement}
    >
      <div className={`${PREFIX}-screen`}>
        <Stage
          model={model}
          painters={registry}
          profiles={profiles}
          backdrop={backdrop}
          captions={captions}
          className={`${PREFIX}-stage`}
          {...(theme ? { theme } : {})}
          {...(title ? { label: title } : {})}
        />

        {title === undefined && subtitle === undefined ? null : (
          <div className={`${PREFIX}-head`}>
            <div className={`${PREFIX}-head-text`}>
              {title === undefined ? null : <p className={`${PREFIX}-title`}>{title}</p>}
              {subtitle === undefined ? null : <p className={`${PREFIX}-sub`}>{subtitle}</p>}
            </div>
          </div>
        )}

        {/* The big affordance while paused, and clicking the screen toggles — the gesture
            people will try before they look for a button. */}
        {!player.playing && !busy && !player.atGate ? (
          <button type="button" className={`${PREFIX}-bigplay`} onClick={toggle} aria-label="Play">
            <span>
              <PlayIcon size={2} />
            </span>
          </button>
        ) : null}

        {status === 'loading' ? (
          <span className={`${PREFIX}-badge`}>
            <span className={`${PREFIX}-spinner`} /> Preparing
          </span>
        ) : null}
        {status === 'error' ? (
          <span className={`${PREFIX}-badge ${PREFIX}-badge--error`}>
            <AlertIcon size={1} /> {errorMessage ?? 'Something went wrong'}
          </span>
        ) : null}
      </div>

      <Timeline
        t={player.t}
        duration={program.duration}
        program={program}
        profiles={profiles}
        painters={registry}
        theme={theme}
        disabled={busy}
        onSeek={(next) => {
          player.seek(next)
        }}
      />

      <PlayerBar
        playing={player.playing}
        finished={finished}
        atGate={player.atGate}
        captions={captions}
        speed={speed}
        volume={volume}
        muted={muted}
        canPrev={model.sceneIndex > 0}
        canNext={model.sceneIndex < program.slots.length - 1}
        fullscreen={fullscreen}
        disabled={busy}
        {...(speeds ? { speeds } : {})}
        {...(skipSeconds === undefined ? {} : { skipSeconds })}
        onToggle={toggle}
        onSkip={(seconds) => {
          player.seek(player.t + seconds)
        }}
        onScene={toScene}
        onCaptions={setCaptions}
        onSpeed={(next) => {
          setSpeed(next)
          onSpeedChange?.(next)
        }}
        onVolume={(next) => {
          setVolume(next)
          setMuted(next === 0)
          onVolumeChange?.(next, next === 0)
        }}
        onMute={(next) => {
          setMuted(next)
          onVolumeChange?.(volume, next)
        }}
        chaptersOpen={chaptersOpen}
        showChapters={showChapters}
        onChapters={() => {
          setChaptersOpen((open) => !open)
        }}
        onFullscreen={() => {
          if (document.fullscreenElement) void document.exitFullscreen()
          else void shell.current?.requestFullscreen()
        }}
      >
        {chaptersOpen ? (
          <ChapterMenu
            program={program}
            currentIndex={model.sceneIndex}
            onSeek={(next) => {
              player.seek(next)
            }}
            onClose={() => {
              setChaptersOpen(false)
            }}
          />
        ) : null}
      </PlayerBar>

      {/* Keyed off `atGate`, not off the scene having a gate at all. Rendering whenever the
          scene carried one left the question on screen after it was answered, so Continue
          appeared to do nothing — `frame` has no notion of "answered" and cannot. */}
      {player.atGate && model.gate && renderGate ? (
        <div className={`${PREFIX}-gate`} data-placement={gatePlacement}>
          {renderGate(model.gate, () => {
            player.resume()
          })}
        </div>
      ) : null}
    </div>
  )
}
