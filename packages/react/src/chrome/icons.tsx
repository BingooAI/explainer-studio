// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'

/**
 * Control icons.
 *
 * Drawn rather than typed. A `▶` character is whatever the reader's font decides it is —
 * a different weight on every platform, sometimes a colour emoji, occasionally missing —
 * and the one thing a play button cannot afford is to look accidental.
 *
 * All on a 24-unit grid, sized in `em` so they scale with the control's text.
 */

interface IconProps {
  readonly size?: number
}

function Svg({ children, size = 1.15 }: IconProps & { children: JSX.Element }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={`${size}em`}
      height={`${size}em`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function PlayIcon(props: IconProps): JSX.Element {
  // Filled: a play triangle in outline reads as a "next" chevron at small sizes.
  return (
    <Svg {...props}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="currentColor" strokeWidth={1.6} />
    </Svg>
  )
}

export function PauseIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <g fill="currentColor" stroke="none">
        <rect x="7" y="5" width="3.4" height="14" rx="1.1" />
        <rect x="13.6" y="5" width="3.4" height="14" rx="1.1" />
      </g>
    </Svg>
  )
}

export function ReplayIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <g>
        <path d="M20 12a8 8 0 1 1-2.6-5.9" />
        <path d="M20 4v4.5h-4.5" />
      </g>
    </Svg>
  )
}

export function CaptionsIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <g>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="M8.6 11.2a2 2 0 1 0 0 2.6M15.8 11.2a2 2 0 1 0 0 2.6" />
      </g>
    </Svg>
  )
}

export function SpeedIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <g>
        <path d="M12 20a8 8 0 1 1 8-8" />
        <path d="M12 12l4.2-3.4" />
      </g>
    </Svg>
  )
}

export function CheckIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  )
}
