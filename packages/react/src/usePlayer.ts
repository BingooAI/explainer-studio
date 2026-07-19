// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { frame, type Program, type RenderModel } from '@bingoo.ai/explainer-core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * The playhead.
 *
 * The important decision here is which clock is authoritative. While a narration line is
 * playing, **the audio is the clock** — the playhead reads the audio element's own position
 * rather than accumulating animation frames. Between lines, requestAnimationFrame takes
 * over.
 *
 * Accumulating frames alone drifts. It drifts slowly, so it looks fine in a ten-second
 * test and is visibly wrong by the end of a five-minute lesson: captions highlight the
 * wrong word and reveals land after the sentence that motivated them. Reading the audio
 * position cannot drift, because it is the same measurement the ear is making.
 *
 * Audio playback itself stays outside this package. The host owns the element — or the
 * browser's speech synthesis, which has no element at all — and supplies a function that
 * reports program time when it is speaking and `null` when it is not.
 */

export interface AudioClock {
  /** Program-relative seconds while audio is authoritative, or null to fall back to rAF. */
  (): number | null
}

export interface UsePlayerOptions {
  readonly program: Program
  readonly audioClock?: AudioClock
  readonly autoPlay?: boolean
  /** Injected for tests; defaults to the platform clock. */
  readonly now?: () => number
}

export interface Player {
  readonly t: number
  readonly model: RenderModel
  readonly playing: boolean
  /** True while a gate is waiting for an answer. Advancing is suspended. */
  readonly atGate: boolean
  play(): void
  pause(): void
  seek(t: number): void
  /** Resumes past the gate the learner has just answered. */
  resume(): void
}

export function usePlayer(options: UsePlayerOptions): Player {
  const { program, audioClock, autoPlay = false } = options
  const now = options.now ?? (() => performance.now() / 1000)

  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const [passedGates, setPassedGates] = useState<readonly number[]>([])

  const tRef = useRef(t)
  tRef.current = t

  const model = useMemo(() => frame(program, t), [program, t])

  // A gate stops the playhead where it opened. Running past it would ask a question and
  // answer it in the same breath.
  const pendingGate = useMemo(() => {
    if (!model.gate) return undefined
    const start = program.gateStarts.find((g) => g <= t && !passedGates.includes(g))
    return start
  }, [model.gate, program.gateStarts, t, passedGates])

  const atGate = pendingGate !== undefined

  useEffect(() => {
    if (!playing || atGate) return

    let raf = 0
    let last = now()

    const tick = (): void => {
      const current = now()
      const elapsed = current - last
      last = current

      const fromAudio = audioClock?.()
      // Audio wins whenever it is speaking; rAF only fills the silence between lines.
      const next = fromAudio ?? tRef.current + elapsed

      const clamped = Math.min(next, program.duration)
      tRef.current = clamped
      setT(clamped)

      if (clamped >= program.duration) {
        setPlaying(false)
        return
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [playing, atGate, audioClock, program.duration, now])

  const play = useCallback(() => {
    setPlaying(true)
  }, [])

  const pause = useCallback(() => {
    setPlaying(false)
  }, [])

  const seek = useCallback(
    (to: number) => {
      const clamped = Math.max(0, Math.min(to, program.duration))
      tRef.current = clamped
      setT(clamped)
    },
    [program.duration],
  )

  const resume = useCallback(() => {
    if (pendingGate === undefined) return
    setPassedGates((passed) => [...passed, pendingGate])
    setPlaying(true)
  }, [pendingGate])

  return { t, model, playing, atGate, play, pause, seek, resume }
}
