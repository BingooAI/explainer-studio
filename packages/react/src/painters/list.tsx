// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { resolveFontSize } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { wrapText } from '../text/wrap.js'
import { Marker, type MarkerStyle } from './marker.js'

/**
 * A list, revealed a point at a time.
 *
 * Progressive reveal is what separates a list in a lesson from a list on a slide: the
 * learner reads each point as it is spoken instead of racing ahead to the end. The engine
 * decides how many are showing; this only draws them.
 *
 * Rows do not reflow as they appear. Every row is laid out at its final position and then
 * faded in, because a list that re-centres itself on every reveal is unreadable while it
 * is building.
 */

interface ListContent {
  readonly items?: unknown
  readonly marker?: unknown
  readonly dense?: unknown
}

const MARKERS: readonly MarkerStyle[] = ['bullet', 'number', 'check', 'dash', 'none']

function readItems(content: unknown, strings: Readonly<Record<string, string>>): string[] {
  const raw = (content as ListContent | null)?.items
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry: unknown) => {
      if (typeof entry === 'string') return strings[entry] ?? entry
      const key = (entry as Record<string, unknown> | null)?.['key']
      return typeof key === 'string' ? (strings[key] ?? '') : ''
    })
    .filter((text) => text !== '')
}

export function ListPainter({ item, strings, profiles, canvas }: PainterProps): JSX.Element | null {
  const content = item.content as ListContent | null
  const entries = readItems(item.content, strings)
  if (entries.length === 0) return null

  const rawMarker = content?.marker
  const marker: MarkerStyle =
    typeof rawMarker === 'string' && (MARKERS as readonly string[]).includes(rawMarker)
      ? (rawMarker as MarkerStyle)
      : 'bullet'

  const metrics = { profiles, script: undefined }
  const ideal = resolveFontSize(
    profiles.type,
    canvas,
    item.style.rung ?? (content?.dense === true ? 'label' : 'body'),
  )

  const indent = marker === 'none' ? 0 : Math.min(item.rect.width * 0.09, ideal.size * 1.9)
  const textWidth = Math.max(1, item.rect.width - indent)

  const fitted = fitRows(entries, textWidth, item.rect.height, ideal.size, metrics)
  const gap = fitted.size * 0.55
  const blockHeight =
    fitted.rows.reduce((sum, lines) => sum + lines.length * fitted.lineHeight, 0) + (entries.length - 1) * gap

  let y = item.rect.y + Math.max(0, (item.rect.height - blockHeight) / 2)

  return (
    <g>
      {fitted.rows.map((lines, index) => {
        const top = y
        y += lines.length * fitted.lineHeight + gap

        // `items` is how many are revealed; Infinity means all. Rows past it are simply
        // not drawn, rather than drawn transparent — a screen reader should not read out
        // points the learner has not reached.
        if (index >= item.items) return null

        return (
          <g key={entries[index]}>
            {marker === 'none' ? null : (
              <Marker
                style={marker}
                index={index}
                x={item.rect.x + indent * 0.5}
                y={top + fitted.size * 0.78}
                size={fitted.size}
              />
            )}
            <text
              x={item.rect.x + indent}
              y={top + fitted.size * 0.8}
              fontSize={fitted.size}
              fontWeight={600}
              fill="currentColor"
            >
              {lines.map((line, lineIndex) => (
                <tspan
                  key={line + String(lineIndex)}
                  x={item.rect.x + indent}
                  dy={lineIndex === 0 ? 0 : fitted.lineHeight}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/**
 * Shrinks until every row fits, returning the size and the rows wrapped **at that size**.
 *
 * Keeping the pair together is deliberate: the implementation this replaces decremented
 * the size and then used lines wrapped at the previous one, so a list that never fitted
 * was laid out one step narrower than it had been measured for.
 */
function fitRows(
  entries: readonly string[],
  width: number,
  height: number,
  ideal: number,
  metrics: Parameters<typeof wrapText>[3],
): { size: number; rows: string[][]; lineHeight: number } {
  const floor = ideal * 0.6

  for (let size = ideal; size >= floor; size -= 1) {
    const rows = entries.map((text) => wrapText(text, width, size, metrics))
    const lineHeight = size * 1.26
    const total = rows.reduce((sum, lines) => sum + lines.length, 0)
    const gaps = (entries.length - 1) * size * 0.55

    if (total * lineHeight + gaps <= height) return { size, rows, lineHeight }
  }

  const size = floor
  return {
    size,
    rows: entries.map((text) => wrapText(text, width, size, metrics)),
    lineHeight: size * 1.26,
  }
}
