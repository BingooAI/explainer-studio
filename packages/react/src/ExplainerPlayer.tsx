// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Program, ResolvedProfiles } from '@bingoo.ai/explainer-core'
import { useMemo, type JSX } from 'react'
import { Stage } from './Stage.js'
import { createBuiltInPainters } from './painters/builtin.js'
import type { PainterRegistry } from './painters/registry.js'
import { usePlayer, type AudioClock } from './usePlayer.js'

/**
 * A lesson, playing.
 *
 * Everything visible here is derived from `frame(program, t)`. The component chooses when
 * to sample and how to present the surrounding chrome; it never decides what is on screen.
 */

export interface ExplainerPlayerProps {
  readonly program: Program
  readonly profiles: ResolvedProfiles
  /** Defaults to the built-in set. Pass your own to add element types (R1). */
  readonly painters?: PainterRegistry
  readonly audioClock?: AudioClock
  readonly autoPlay?: boolean
  readonly showCaptions?: boolean
  readonly className?: string
}

export function ExplainerPlayer({
  program,
  profiles,
  painters,
  audioClock,
  autoPlay = false,
  showCaptions = true,
  className,
}: ExplainerPlayerProps): JSX.Element {
  // Built once per component rather than per render: a registry is an instance, and
  // rebuilding it every frame would discard every painter's identity and remount the tree.
  const registry = useMemo(() => painters ?? createBuiltInPainters(), [painters])

  const player = usePlayer({
    program,
    autoPlay,
    ...(audioClock ? { audioClock } : {}),
  })

  const { model } = player

  return (
    <div className={className} data-playing={player.playing} data-at-gate={player.atGate}>
      <Stage model={model} painters={registry} profiles={profiles} />

      {showCaptions && model.caption ? (
        <p
          // Captions are a WCAG requirement in education, frequently a legal one — so they
          // are part of the component rather than something a host remembers to add.
          // Polite rather than assertive: a caption should not interrupt a screen reader
          // mid-sentence every time a word advances.
          aria-live="polite"
          data-caption={model.caption.ref}
          style={{ textAlign: 'center', margin: '0.5rem 0' }}
        >
          {model.caption.text}
        </p>
      ) : null}
    </div>
  )
}
