// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

/**
 * Shared building blocks of the `explainer/v1` document.
 *
 * Two rules shape everything here, and both are enforced by what the schema makes
 * *impossible* rather than by what it validates:
 *
 * - **No coordinates** (R6). An element names a region; the layout computes rectangles.
 *   There is no `x` to author, so a generated lesson cannot overlap its own content — not
 *   because we check for it, but because the vocabulary to express it does not exist.
 * - **No language** (R4). Every human-readable string is a key into a `LocaleBundle`. The
 *   document is structure; a bundle is one language's words.
 */

/** Stable within a document. Used in beats, layout regions and gate answers. */
export const elementId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'may contain letters, digits, hyphens and underscores')

export const sceneId = elementId
export const beatId = elementId

/**
 * A key into the locale bundle's `strings`, never the text itself.
 *
 * Bingoo enforced this by convention and leaked Vietnamese into components anyway. Making
 * it a distinct branded-looking type does not stop a determined mistake, but it does make
 * every leak visible in review: a literal sentence where a key belongs reads wrong.
 */
export const stringKey = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_.-]+$/, 'is a key into the locale bundle, not the text itself')

export const narrationId = stringKey

/**
 * Registry keys, not frozen enums (ARCHITECTURE §4). The schema checks the shape; the
 * registry decides what exists. This is what lets a plugin add an element type or a gate
 * kind without a core release.
 */
export const registryKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9-]*$/, 'is a lowercase registry key, e.g. "fraction-bar"')

/** BCP-47. Kept loose on purpose: validating the full grammar rejects valid rare tags. */
export const locale = z
  .string()
  .min(2)
  .max(35)
  .regex(/^[A-Za-z0-9-]+$/)

export const aspect = z.string().regex(/^\d+:\d+$/, 'is a ratio like "16:9"')

/**
 * Where an element sits *within* its region, not on the canvas.
 *
 * `order` sequences siblings; `grow` lets one element take the slack so a caption under a
 * diagram does not get equal share. Neither can express a position, which is the point.
 */
export const flow = z.object({
  order: z.number().int().min(0).default(0),
  grow: z.number().min(0).max(10).default(0),
  align: z.enum(['start', 'center', 'end', 'stretch']).default('center'),
})

export type Flow = z.infer<typeof flow>

/**
 * A named, discrete visual state — not a keyframe.
 *
 * Offsets are **relative to where layout placed the element**, expressed as fractions of
 * its own size, so motion cannot smuggle absolute positioning back in through the animation
 * system. `"base"` is the resting state every element has implicitly.
 */
export const pose = z.object({
  visible: z.boolean().default(true),
  /** Horizontal offset, as a fraction of the element's own width. */
  dx: z.number().min(-4).max(4).default(0),
  /** Vertical offset, as a fraction of the element's own height. */
  dy: z.number().min(-4).max(4).default(0),
  scale: z.number().positive().max(8).default(1),
  opacity: z.number().min(0).max(1).default(1),
  /** Degrees. */
  rotate: z.number().min(-360).max(360).default(0),
  /** How far a stroke has drawn itself: 0 is nothing, 1 is complete. */
  drawProgress: z.number().min(0).max(1).default(1),
})

export type Pose = z.infer<typeof pose>

export const BASE_POSE = 'base'

/**
 * Style is semantic tokens, never literal values (the same discipline as Bingoo's token
 * layer). A component asking for `bg-primary` keeps working when a theme changes; one
 * asking for `#2563eb` does not, and it breaks in dark mode without anyone noticing.
 */
export const styleTokens = z.object({
  color: registryKey.optional(),
  background: registryKey.optional(),
  border: registryKey.optional(),
  rung: registryKey.optional(),
  weight: z.enum(['regular', 'medium', 'bold']).optional(),
  emphasis: registryKey.optional(),
})

export type StyleTokens = z.infer<typeof styleTokens>
