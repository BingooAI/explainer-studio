// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor } from './context.js'
import { useRender } from './render.js'

/**
 * A playhead for the scene being edited.
 *
 * Scene-local, not program-wide, because that is the unit of work: an author changing scene
 * nine wants to watch scene nine, not scrub past eight minutes to reach it.
 *
 * Driven by `requestAnimationFrame` off wall-clock deltas rather than by counting frames.
 * Counting drifts as soon as the browser drops one — and it drops one every time the author
 * types, which is most of the time an editor is open.
 */

export interface ScenePlayback {
  readonly t: number
  readonly duration: number
  readonly playing: boolean
  readonly seek: (t: number) => void
  readonly toggle: () => void
  readonly stop: () => void
}

export function useScenePlayback(): ScenePlayback {
  const { ui } = useEditor()
  const { project } = useRender()

  const scene = project.scenes.find((candidate) => candidate.id === ui.activeSceneId) ?? project.scenes[0]
  const duration = Math.max((scene?.end ?? 0) - (scene?.start ?? 0), 0)

  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const frameRef = useRef(0)
  const lastRef = useRef(0)

  // Switching scenes rewinds. Holding the old position would land the playhead somewhere
  // arbitrary in the new scene — past its end, if the new one is shorter.
  useEffect(() => {
    setT(0)
    setPlaying(false)
  }, [ui.activeSceneId])

  useEffect(() => {
    if (!playing) return

    lastRef.current = performance.now()

    const step = (now: number): void => {
      const delta = (now - lastRef.current) / 1000
      lastRef.current = now

      setT((current) => {
        const next = current + delta
        if (next >= duration) {
          setPlaying(false)
          return duration
        }
        return next
      })

      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frameRef.current)
    }
  }, [playing, duration])

  const seek = useCallback(
    (next: number) => {
      setT(Math.max(0, Math.min(duration, next)))
    },
    [duration],
  )

  const toggle = useCallback(() => {
    setPlaying((current) => {
      // Pressing play at the end replays rather than doing nothing, which is what every
      // player does and what the button appears to promise.
      if (!current && t >= duration - 0.01) setT(0)
      return !current
    })
  }, [t, duration])

  const stop = useCallback(() => {
    setPlaying(false)
    setT(0)
  }, [])

  return { t, duration, playing, seek, toggle, stop }
}
