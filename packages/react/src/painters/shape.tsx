// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import type { PainterProps } from './registry.js'

/** Simple filled shapes — the background a diagram or a label sits on. */

export function ShapePainter({ item }: PainterProps): JSX.Element {
  const shape = (item.content as Record<string, unknown> | null)?.['shape']

  if (shape === 'circle') {
    return (
      <circle
        cx={item.rect.x + item.rect.width / 2}
        cy={item.rect.y + item.rect.height / 2}
        r={Math.min(item.rect.width, item.rect.height) / 2}
        fill="currentColor"
      />
    )
  }

  return (
    <rect
      x={item.rect.x}
      y={item.rect.y}
      width={item.rect.width}
      height={item.rect.height}
      rx={Math.min(item.rect.width, item.rect.height) * 0.04}
      fill="currentColor"
    />
  )
}
