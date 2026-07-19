// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * Chart geometry, **derived from the values and never authored**.
 *
 * This is the point ARCHITECTURE §4 makes about charts: a model that could supply both the
 * numbers and the axis maximum could hand us bars that contradict its own data — a 40 drawn
 * taller than a 60 — and every structural check would pass, because both are valid numbers.
 * Computing the scale here makes that unrepresentable rather than merely unlikely.
 */

export interface Series {
  readonly label: string
  readonly value: number
  readonly color?: string
}

/**
 * The next round number at or above `peak`.
 *
 * Round axis maxima are not decoration: a gridline at 8.3 is a number the learner has to
 * decode before they can read the chart, and the chart was supposed to do that work.
 */
export function niceMax(peak: number): number {
  if (!(peak > 0) || !Number.isFinite(peak)) return 1

  const magnitude = 10 ** Math.floor(Math.log10(peak))
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= peak) return step * magnitude
  }
  return 10 * magnitude
}

export interface ChartScale {
  readonly max: number
  readonly total: number
}

export function scaleOf(series: readonly Series[]): ChartScale {
  const values = series.map((s) => (Number.isFinite(s.value) ? s.value : 0))
  return {
    max: niceMax(Math.max(0, ...values)),
    total: values.reduce((sum, value) => sum + value, 0),
  }
}

/** One decimal at most: a chart label is read at a glance, not audited. */
export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
}

export function readSeries(content: unknown, strings: Readonly<Record<string, string>>): Series[] {
  const raw = (content as { series?: unknown } | null)?.series
  if (!Array.isArray(raw)) return []

  return raw.flatMap((entry: unknown): Series[] => {
    if (typeof entry !== 'object' || entry === null) return []
    const record = entry as Record<string, unknown>
    const value = typeof record['value'] === 'number' ? record['value'] : Number.NaN
    if (!Number.isFinite(value)) return []

    const rawLabel = record['label']
    const label = typeof rawLabel === 'string' ? (strings[rawLabel] ?? rawLabel) : ''
    const colour = typeof record['color'] === 'string' ? record['color'] : undefined

    return [{ label, value, ...(colour ? { color: colour } : {}) }]
  })
}
