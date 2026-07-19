// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { captionText, type Program } from '@bingoo.ai/explainer-core'
import { useCallback, useEffect, useRef } from 'react'
import type { AudioClock } from './usePlayer.js'

/**
 * Narration through the browser's own speech synthesis.
 *
 * This is what makes the keyless path real (R9): a lesson speaks, and the visuals follow
 * the voice, with no account, no API key and no network call. It is the difference between
 * a demo that plays and a demo that shows a picture and asks you to imagine the rest.
 *
 * Quality is worse than a paid voice. That is the whole point of the routing chain — a
 * deployment that configures one gets it, and a deployment that configures nothing still
 * has a lesson rather than silence.
 */

interface SpeechWindow {
  readonly speechSynthesis?: {
    speak(utterance: unknown): void
    cancel(): void
  }
  SpeechSynthesisUtterance?: new (text: string) => {
    lang: string
    rate: number
    onboundary: ((event: { charIndex: number }) => void) | null
    onend: (() => void) | null
  }
}

export interface SpeechOptions {
  readonly program: Program
  readonly enabled: boolean
  readonly rate?: number
}

/**
 * Returns a clock that reports program time while the browser is speaking.
 *
 * The position comes from `onboundary`, which fires per word with the character offset
 * reached. Converting that offset to a fraction of the line gives a real audio position —
 * coarser than an audio element's `currentTime`, but measured from the same speech the ear
 * is hearing, which is the property that matters (§ usePlayer).
 */
export function useSpeechClock({ program, enabled, rate = 1 }: SpeechOptions): {
  clock: AudioClock
  speakFrom: (t: number) => void
  stop: () => void
} {
  const position = useRef<number | null>(null)
  const spoken = useRef<string | null>(null)

  const stop = useCallback(() => {
    const synthesis = (globalThis as unknown as SpeechWindow).speechSynthesis
    synthesis?.cancel()
    position.current = null
    spoken.current = null
  }, [])

  useEffect(() => stop, [stop])

  const speakFrom = useCallback(
    (t: number) => {
      const scope = globalThis as unknown as SpeechWindow
      const synthesis = scope.speechSynthesis
      const Utterance = scope.SpeechSynthesisUtterance
      if (!enabled || !synthesis || !Utterance) return

      const slot = program.slots.find((s) => t >= s.start && t < s.end)
      const segment = slot?.narrations.find(
        (n) => t - slot.start >= n.at && t - slot.start < n.at + n.duration,
      )
      if (!slot || !segment) return

      const key = `${slot.scene.id}:${segment.ref}`
      if (spoken.current === key) return
      spoken.current = key

      const text = captionText(segment.narration.script)
      const utterance = new Utterance(text)
      utterance.lang = program.bundle.locale
      utterance.rate = rate

      const start = slot.start + segment.at
      utterance.onboundary = (event) => {
        // Character offset into the line, as a fraction of its duration. Speech synthesis
        // does not report a clock, so this is the closest thing to one it offers.
        const fraction = text.length === 0 ? 0 : event.charIndex / text.length
        position.current = start + fraction * segment.duration
      }
      utterance.onend = () => {
        position.current = null
        spoken.current = null
      }

      synthesis.cancel()
      synthesis.speak(utterance)
    },
    [program, enabled, rate],
  )

  const clock = useCallback(() => position.current, [])

  return { clock, speakFrom, stop }
}
