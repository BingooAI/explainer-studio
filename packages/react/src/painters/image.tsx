// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { textOf } from './text.js'

/**
 * Images are addressed by a storage reference, never a URL (R16), so the host resolves it.
 *
 * Without a resolver the painter draws a placeholder rather than a broken image: the
 * keyless path (R9) has no media store, and a lesson should still be legible there.
 */
export function ImagePainter({ item, strings }: PainterProps): JSX.Element {
  const ref = (item.content as Record<string, unknown> | null)?.['ref']
  const href = typeof ref === 'string' ? strings[`media:${ref}`] : undefined
  const alt = textOf((item.content as Record<string, unknown> | null)?.['alt'], strings)

  if (href === undefined) {
    return (
      <rect
        x={item.rect.x}
        y={item.rect.y}
        width={item.rect.width}
        height={item.rect.height}
        fill="none"
        stroke="currentColor"
        strokeDasharray="8 8"
        strokeOpacity={0.4}
      />
    )
  }

  return (
    <image
      href={href}
      x={item.rect.x}
      y={item.rect.y}
      width={item.rect.width}
      height={item.rect.height}
      preserveAspectRatio="xMidYMid meet"
      // Empty alt marks it decorative; a real description belongs in the document, so an
      // image with nothing to say is silent rather than read out as a filename.
      aria-label={alt === '' ? undefined : alt}
      aria-hidden={alt === '' ? true : undefined}
    />
  )
}
