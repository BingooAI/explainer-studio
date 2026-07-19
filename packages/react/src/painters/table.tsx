// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { resolveFontSize } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { charsPerLine } from '../text/wrap.js'
import { defaultTheme as theme } from '../theme/tokens.js'

/**
 * A table, revealed a row at a time.
 *
 * Column zero is the key column — heavier and full-ink — and the rest are secondary. That
 * one distinction is most of what makes a table readable at the back of a classroom: the
 * eye finds the row it wants, then reads across.
 *
 * Cells are **truncated rather than left to overflow**. The implementation this is ported
 * from did neither, so a long cell silently ran through its neighbours and off the canvas.
 * An ellipsis is a visible problem the author can fix; overlapping text reads as a bug in
 * the renderer.
 */

interface TableContent {
  readonly header?: unknown
  readonly rows?: unknown
  readonly align?: unknown
}

type Align = 'left' | 'center' | 'right'

const resolve = (value: unknown, strings: Readonly<Record<string, string>>): string => {
  if (typeof value === 'string') return strings[value] ?? value
  return ''
}

const readRow = (value: unknown, strings: Readonly<Record<string, string>>): string[] =>
  Array.isArray(value) ? value.map((cell: unknown) => resolve(cell, strings)) : []

export function TablePainter({ item, strings, profiles, canvas }: PainterProps): JSX.Element | null {
  const content = item.content as TableContent | null
  const header = readRow(content?.header, strings)
  const rows = Array.isArray(content?.rows)
    ? (content.rows as unknown[]).map((row) => readRow(row, strings))
    : []

  const total = rows.length + (header.length > 0 ? 1 : 0)
  if (total === 0) return null

  const columns = Math.max(header.length, ...rows.map((row) => row.length), 1)
  const rowHeight = item.rect.height / total
  const columnWidth = item.rect.width / columns
  const size = Math.min(resolveFontSize(profiles.type, canvas, 'label').size, rowHeight * 0.46)
  const metrics = { profiles, script: undefined }

  const alignOf = (index: number): Align => {
    const declared = Array.isArray(content?.align) ? (content.align as unknown[])[index] : undefined
    if (declared === 'left' || declared === 'center' || declared === 'right') return declared
    return index === 0 ? 'left' : 'center'
  }

  const pad = columnWidth * 0.1
  const cellX = (index: number): number => {
    const align = alignOf(index)
    if (align === 'left') return item.rect.x + index * columnWidth + pad
    if (align === 'right') return item.rect.x + (index + 1) * columnWidth - pad
    return item.rect.x + index * columnWidth + columnWidth / 2
  }
  const anchorOf = (index: number): 'start' | 'middle' | 'end' => {
    const align = alignOf(index)
    return align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'
  }

  const clip = (text: string): string => {
    const limit = charsPerLine(columnWidth - pad * 2, size, metrics)
    return text.length <= limit ? text : `${text.slice(0, Math.max(1, limit - 1))}…`
  }

  const headerOffset = header.length > 0 ? 1 : 0

  return (
    <g fontFamily={theme.fonts.sans}>
      {header.length > 0 ? (
        <g>
          <rect
            x={item.rect.x}
            y={item.rect.y}
            width={item.rect.width}
            height={rowHeight}
            rx={rowHeight * 0.18}
            fill="currentColor"
            opacity={0.12}
          />
          {header.map((cell, index) => (
            <text
              key={`h${String(index)}`}
              x={cellX(index)}
              y={item.rect.y + rowHeight / 2 + size * 0.36}
              fontSize={size}
              fontWeight={800}
              textAnchor={anchorOf(index)}
              fill="currentColor"
              letterSpacing="0.02em"
            >
              {clip(cell)}
            </text>
          ))}
        </g>
      ) : null}

      {rows.map((row, rowIndex) => {
        // Rows past the reveal are not drawn at all, so a screen reader never reaches data
        // the lesson has not presented.
        if (rowIndex >= item.items) return null

        const y = item.rect.y + (rowIndex + headerOffset) * rowHeight

        return (
          <g key={`r${String(rowIndex)}`}>
            {rowIndex % 2 === 1 ? (
              <rect
                x={item.rect.x}
                y={y}
                width={item.rect.width}
                height={rowHeight}
                fill="currentColor"
                opacity={0.06}
              />
            ) : null}
            <line
              x1={item.rect.x}
              y1={y}
              x2={item.rect.x + item.rect.width}
              y2={y}
              stroke="currentColor"
              strokeWidth={1.5}
              opacity={0.25}
            />
            {row.map((cell, columnIndex) => (
              <text
                key={`c${String(columnIndex)}`}
                x={cellX(columnIndex)}
                y={y + rowHeight / 2 + size * 0.36}
                fontSize={size}
                fontWeight={columnIndex === 0 ? 700 : 600}
                textAnchor={anchorOf(columnIndex)}
                fill="currentColor"
                opacity={columnIndex === 0 ? 1 : 0.75}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {clip(cell)}
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}
