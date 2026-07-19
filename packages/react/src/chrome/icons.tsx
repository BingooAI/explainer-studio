// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'

/**
 * Control icons, drawn on a 24-unit grid and sized in `em` so they scale with their button.
 *
 * Drawn rather than typed: a `▶` character is whatever the reader's font decides it is — a
 * different weight on every platform, sometimes a colour emoji, occasionally missing — and
 * a play button is the one control that cannot afford to look accidental.
 */

interface IconProps {
  readonly size?: number
}

function Icon({ children, size = 1.3 }: IconProps & { children: JSX.Element }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={`${size}em`}
      height={`${size}em`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Filled: a play triangle in outline reads as a "next" chevron at small sizes. */
export const PlayIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <path d="M8 5.2v13.6L19 12z" fill="currentColor" stroke="currentColor" strokeWidth={1.5} />
  </Icon>
)

export const PauseIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g fill="currentColor" stroke="none">
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
    </g>
  </Icon>
)

export const ReplayIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4.2v4.6h-4.6" />
    </g>
  </Icon>
)

/** The numeral is what makes these readable at a glance; a bare arrow says only "back". */
export const SkipBackIcon = ({ seconds = 10, ...p }: IconProps & { seconds?: number }): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M4.2 12a7.8 7.8 0 1 0 2.6-5.8" />
      <path d="M4.2 4.4V9h4.6" />
      <text
        x="12"
        y="15.4"
        fontSize="8.2"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
        fontWeight={700}
      >
        {seconds}
      </text>
    </g>
  </Icon>
)

export const SkipForwardIcon = ({ seconds = 10, ...p }: IconProps & { seconds?: number }): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M19.8 12a7.8 7.8 0 1 1-2.6-5.8" />
      <path d="M19.8 4.4V9h-4.6" />
      <text
        x="12"
        y="15.4"
        fontSize="8.2"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
        fontWeight={700}
      >
        {seconds}
      </text>
    </g>
  </Icon>
)

export const NextIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M6 5.4v13.2L15.5 12z" fill="currentColor" stroke="currentColor" strokeWidth={1.4} />
      <path d="M18.4 5v14" />
    </g>
  </Icon>
)

export const PrevIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M18 5.4v13.2L8.5 12z" fill="currentColor" stroke="currentColor" strokeWidth={1.4} />
      <path d="M5.6 5v14" />
    </g>
  </Icon>
)

export const VolumeIcon = ({ muted = false, ...p }: IconProps & { muted?: boolean }): JSX.Element => (
  <Icon {...p}>
    <g>
      <path
        d="M4 9.2h3.2L11.5 5.4v13.2L7.2 14.8H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.4}
      />
      {muted ? (
        <path d="M15.4 9.6l4.4 4.8M19.8 9.6l-4.4 4.8" />
      ) : (
        <path d="M14.8 9.4a3.6 3.6 0 0 1 0 5.2M17.4 7.2a7 7 0 0 1 0 9.6" />
      )}
    </g>
  </Icon>
)

export const CaptionsIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g>
      <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.6" />
      <path d="M9 11.1a2.1 2.1 0 1 0 0 2.8M16.2 11.1a2.1 2.1 0 1 0 0 2.8" />
    </g>
  </Icon>
)

export const ChaptersIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M9 6.4h11M9 12h11M9 17.6h11" />
      <circle cx="4.6" cy="6.4" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="17.6" r="1.3" fill="currentColor" stroke="none" />
    </g>
  </Icon>
)

export const FullscreenIcon = ({ exit = false, ...p }: IconProps & { exit?: boolean }): JSX.Element => (
  <Icon {...p}>
    {exit ? (
      <g>
        <path d="M9.4 4.6v4.8H4.6M14.6 4.6v4.8h4.8M9.4 19.4v-4.8H4.6M14.6 19.4v-4.8h4.8" />
      </g>
    ) : (
      <g>
        <path d="M4.6 9.4V4.6h4.8M19.4 9.4V4.6h-4.8M4.6 14.6v4.8h4.8M19.4 14.6v4.8h-4.8" />
      </g>
    )}
  </Icon>
)

export const SettingsIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M3.4 7.6h10M17.6 7.6h3M3.4 16.4h3M10.6 16.4h10" />
      <circle cx="15" cy="7.6" r="2.5" />
      <circle cx="8" cy="16.4" r="2.5" />
    </g>
  </Icon>
)

export const CheckIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <path d="M5 12.4l4.6 4.6L19 7" />
  </Icon>
)

export const AlertIcon = (p: IconProps): JSX.Element => (
  <Icon {...p}>
    <g>
      <path d="M12 4.4L21 19.6H3z" />
      <path d="M12 10v4M12 17h.01" />
    </g>
  </Icon>
)
