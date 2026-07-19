// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program, ResolvedProfiles } from '@bingoo.ai/explainer-core'
import { useEffect, useMemo, useState, type JSX } from 'react'
import { Stage } from './Stage.js'
import type { BackdropKind } from './chrome/Backdrop.js'
import { PlayerBar } from './chrome/PlayerBar.js'
import { SceneStrip } from './chrome/SceneStrip.js'
import { PREFIX, ensureStyles } from './chrome/styles.js'
import { createBuiltInPainters } from './painters/builtin.js'
import type { PainterRegistry } from './painters/registry.js'
import type { ThemeTokens } from './theme/tokens.js'
import { usePlayer, type AudioClock } from './usePlayer.js'

/**
 * A lesson, playing.
 *
 * Everything visible is derived from `frame(program, t)`. This component decides when to
 * sample and how to frame the result; it never decides what is on screen.
 */

export interface ExplainerPlayerProps {
  readonly program: Program
  readonly profiles: ResolvedProfiles
  /** Defaults to the built-in set. Pass your own to add element types (R1). */
  readonly painters?: PainterRegistry
  readonly theme?: ThemeTokens
  readonly audioClock?: AudioClock
  readonly autoPlay?: boolean
  readonly backdrop?: BackdropKind
  /** The chapter strip. Worth hiding in a small embed, worth showing to a teacher. */
  readonly showScenes?: boolean
  readonly onSpeedChange?: (speed: number) => void
  readonly className?: string
  /** Rendered while a gate is open — the host owns the question UI. */
  readonly renderGate?: (gate: NonNullable<ReturnType<typeof gateOf>>, resume: () => void) => JSX.Element
}

/** Only exists to give `renderGate` a name for the gate's type. */
function gateOf(program: Program): NonNullable<Program['slots'][number]['scene']['gate']> | undefined {
  return program.slots[0]?.scene.gate
}

export function ExplainerPlayer({
  program,
  profiles,
  painters,
  theme,
  audioClock,
  autoPlay = false,
  backdrop = 'paper',
  showScenes = true,
  onSpeedChange,
  className,
  renderGate,
}: ExplainerPlayerProps): JSX.Element {
  ensureStyles()

  // Built once per component: a registry is an instance, and rebuilding it every render
  // would discard every painter's identity and remount the whole tree.
  const registry = useMemo(() => painters ?? createBuiltInPainters(), [painters])

  const [captions, setCaptions] = useState(true)
  const [speed, setSpeed] = useState(1)

  const player = usePlayer({ program, autoPlay, ...(audioClock ? { audioClock } : {}) })
  const { model } = player

  // Space plays and pauses from anywhere in the player, except while the focus is on a
  // control that already uses space — otherwise the button both toggles and re-toggles.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== ' ' && event.key !== 'k') return
      const target = event.target as HTMLElement | null
      if (target && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return

      event.preventDefault()
      if (player.playing) player.pause()
      else player.play()
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [player])

  return (
    <div className={[`${PREFIX}-player`, className].filter(Boolean).join(' ')} data-at-gate={player.atGate}>
      <Stage
        model={model}
        painters={registry}
        profiles={profiles}
        backdrop={backdrop}
        captions={captions}
        className={`${PREFIX}-stage`}
        {...(theme ? { theme } : {})}
      />

      <PlayerBar
        player={player}
        program={program}
        captions={captions}
        onCaptionsChange={setCaptions}
        speed={speed}
        onSpeedChange={(next) => {
          setSpeed(next)
          onSpeedChange?.(next)
        }}
      />

      {model.gate && renderGate ? (
        <div className={`${PREFIX}-gate`}>
          {renderGate(model.gate, () => {
            player.resume()
          })}
        </div>
      ) : null}

      {showScenes ? (
        <SceneStrip
          program={program}
          currentIndex={model.sceneIndex}
          onSeek={(t) => {
            player.seek(t)
          }}
        />
      ) : null}
    </div>
  )
}
