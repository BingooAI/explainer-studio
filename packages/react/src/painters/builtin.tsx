// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { resolveFontSize } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps, PainterRegistry } from './registry.js'
import { createPainterRegistry, registerPainter } from './registry.js'
import { anchorFor } from '../transform.js'

/**
 * The base painters.
 *
 * SVG rather than canvas, deliberately (ARCHITECTURE §3): text stays selectable and
 * reachable by a screen reader, elements are inspectable in devtools, and the same tree
 * serialises for headless export. Canvas would cost all three, and the accessibility one
 * is frequently a legal requirement in education rather than a preference.
 */

/** Text content is `{ key }` — a lookup, never the words themselves (R4). */
function textOf(content: unknown, strings: Readonly<Record<string, string>>): string {
  if (typeof content !== 'object' || content === null) return ''
  const key = (content as Record<string, unknown>)['key']
  return typeof key === 'string' ? (strings[key] ?? '') : ''
}

function TextPainter({ item, strings, profiles, canvas }: PainterProps): JSX.Element | null {
  const text = textOf(item.content, strings)
  if (text === '') return null

  const { size, lineHeight } = resolveFontSize(profiles.type, canvas, item.style.rung)
  const { x, anchor } = anchorFor(item.align)
  const lines = wrap(text, item.rect.width, size, profiles)

  // Vertically centred within the allotted rect: layout gives space, the painter places
  // content inside it. Anything else would need the painter to know about siblings.
  const blockHeight = lines.length * size * lineHeight
  const firstBaseline = item.rect.y + (item.rect.height - blockHeight) / 2 + size

  return (
    <text
      x={x(item.rect)}
      y={firstBaseline}
      textAnchor={anchor}
      fontSize={size}
      fontWeight={item.style.weight ?? 'regular'}
      fill="currentColor"
    >
      {lines.map((line, index) => (
        <tspan key={line + String(index)} x={x(item.rect)} dy={index === 0 ? 0 : size * lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

/**
 * Greedy wrapping against the same glyph estimate the quality gate budgets with.
 *
 * Using a different measure here would let text pass the gate and overflow on screen —
 * the exact failure the shared `charBudget` exists to prevent. Real shaping needs a font
 * and a platform, which is why the estimate lives in the engine and both sides use it.
 */
function wrap(text: string, width: number, size: number, profiles: PainterProps['profiles']): string[] {
  const metrics = profiles.speech.byScript[profiles.speech.defaultScript]
  const perLine = Math.max(1, Math.floor(width / (size * (metrics?.glyphWidth ?? 0.52))))

  const lines: string[] = []
  let current = ''

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current === '' ? word : `${current} ${word}`
    if (candidate.length <= perLine) {
      current = candidate
      continue
    }
    if (current !== '') lines.push(current)
    current = word
  }

  if (current !== '') lines.push(current)
  return lines.length === 0 ? [text] : lines
}

function ShapePainter({ item }: PainterProps): JSX.Element {
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

/**
 * Images are addressed by a storage reference, never a URL (R16), so the host resolves it.
 *
 * Without a resolver the painter draws a placeholder rather than a broken image: the
 * keyless path (R9) has no media store, and a lesson should still be legible there.
 */
function ImagePainter({ item, strings }: PainterProps): JSX.Element {
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

export function createBuiltInPainters(): PainterRegistry {
  const registry = createPainterRegistry()

  registerPainter(registry, { id: 'text', label: 'Text' }, TextPainter)
  registerPainter(registry, { id: 'shape', label: 'Shape' }, ShapePainter)
  registerPainter(registry, { id: 'image', label: 'Image' }, ImagePainter)

  return registry
}

export { ImagePainter, ShapePainter, TextPainter }
