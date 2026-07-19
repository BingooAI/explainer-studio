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
  fonts: z.object({ sans: z.string(), hand: z.string() }),
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
    surface: '#fbf9f4',
    paper: '#f7f2e9',
    ink: '#2b2724',
    inkSoft: '#7d736a',
    faint: '#d8cfc2',
    accent: '#e07a42',
    accent2: '#4b8fc7',
    good: '#3f9d5a',
    warn: '#d9a441',
    deep: '#2f6f4f',
  },
  fonts: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    hand: '"Comic Sans MS", "Bradley Hand", cursive, system-ui',
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
