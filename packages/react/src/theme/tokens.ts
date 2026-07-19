// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { createRegistry, type Registry } from '@bingoo.ai/explainer-kernel'
import { z } from 'zod'

/**
 * Themes are a registry (R1), so a school swaps the palette without touching a painter.
 *
 * Painters ask for a **semantic** token — `ink`, `accent`, `faint` — never a hex value.
 * A painter that reaches for `#2b2724` keeps working until someone adds a dark theme, and
 * then it is invisible on its own background with nothing to point at.
 */

export const themeDescriptor = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  colors: z.record(z.string(), z.string()),
  /**
   * Two faces, used for different jobs.
   *
   * `display` carries headings and prose — it is allowed personality. `sans` carries data:
   * tables, axes, numbers. Setting a table in a display face is how a chart stops being
   * readable at the back of a room, and setting a heading in the data face is how a lesson
   * ends up looking like a spreadsheet.
   */
  fonts: z.object({ display: z.string(), sans: z.string() }),
})

export type ThemeTokens = z.infer<typeof themeDescriptor>
export type ThemeRegistry = Registry<ThemeTokens, ThemeTokens>

/**
 * `ink` for primary text, `inkSoft` for secondary, `faint` for rules and fills, `accent`
 * for the thing being pointed at, `paper` for surfaces that sit above the backdrop.
 *
 * The chart palette is separate and ordered: charts cycle through it by series index, so
 * the names have to stay stable even when the semantic ones change.
 */
export const defaultTheme: ThemeTokens = {
  id: 'default',
  label: 'Paper',
  colors: {
    // Warm paper rather than white. A lesson is looked at for minutes at a time, often on a
    // projector that already pushes the whites, and pure white is where that becomes glare.
    surface: '#fdfaf5',
    paper: '#ffffff',
    ink: '#1f1b17',
    inkSoft: '#6b6259',
    faint: '#e6ded1',
    hairline: '#efe8dc',
    // One accent, used only for the thing being pointed at. A palette where three colours
    // all mean "look here" points at nothing.
    accent: '#d96a2c',
    accent2: '#3d7ea6',
    good: '#3f8f5c',
    warn: '#c9962e',
    deep: '#2c5f6f',
  },
  fonts: {
    display:
      '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Noto Serif", "Times New Roman", serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  },
}

export function createThemeRegistry(options: { includeBuiltIns?: boolean } = {}): ThemeRegistry {
  const registry = createRegistry<ThemeTokens, ThemeTokens>({ kind: 'theme', schema: themeDescriptor })

  if (options.includeBuiltIns !== false) {
    registry.register({ descriptor: defaultTheme, create: () => defaultTheme })
  }

  return registry
}

/**
 * Resolves a token id to a colour.
 *
 * An unknown id passes through unchanged, so a document may carry a literal colour where
 * it genuinely has to — a publisher's brand red in one lesson. It is an escape hatch, not
 * the normal path, and it is visible in review because it does not look like a token.
 */
export function color(theme: ThemeTokens, id: string | undefined, fallback = 'ink'): string {
  if (id === undefined || id === '') return theme.colors[fallback] ?? '#2b2724'
  if (id === 'none') return 'none'
  return theme.colors[id] ?? id
}

/** Ordered so a chart's colours stay put when a series is added. */
export const CHART_PALETTE = ['accent', 'accent2', 'good', 'warn', 'deep', 'inkSoft'] as const
