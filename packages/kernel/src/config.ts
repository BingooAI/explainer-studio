// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ZodType } from 'zod'
import { KernelError } from './errors.js'
import { interpolateDeep, isPlainObject, type EnvSource, type InterpolateOptions } from './interpolate.js'

/**
 * The layered configuration resolver of ARCHITECTURE §2.4:
 *
 *   built-in defaults → config file → environment → workspace settings → runtime UI settings
 *
 * One resolver, one validated shape, one place to read it. The precedence order exists so
 * that a Settings UI can always win for the person sitting in front of it (R14) — a teacher
 * will never edit YAML, and a setting reachable only by editing a file may as well not
 * exist for them.
 *
 * Reading files and the environment is the application's job. This function receives layers
 * that are already loaded, because a pure package does no I/O (R7) — and because a resolver
 * that cannot be tested without a filesystem does not get tested properly.
 */

export interface ConfigLayer {
  /** Names the source, so a bad value can be traced back to the file or UI that set it. */
  readonly name: string
  readonly values: unknown
}

export interface ResolveConfigOptions<T> {
  readonly schema: ZodType<T>
  /** Lowest precedence first. Later layers override earlier ones. */
  readonly layers: readonly ConfigLayer[]
  /** When present, `${VAR}` references are resolved before validation. */
  readonly env?: EnvSource
  readonly interpolate?: InterpolateOptions
}

export interface ResolvedConfig<T> {
  readonly value: T
  /** Which layers contributed, lowest precedence first. Useful in a settings UI and in support. */
  readonly sources: readonly string[]
}

export function resolveConfig<T>(options: ResolveConfigOptions<T>): ResolvedConfig<T> {
  const { schema, layers, env, interpolate } = options

  const contributing = layers.filter((layer) => layer.values !== undefined && layer.values !== null)

  let merged: unknown = {}
  for (const layer of contributing) {
    merged = mergeLayer(merged, layer.values)
  }

  if (env) {
    merged = interpolateDeep(merged, env, interpolate)
  }

  const parsed = schema.safeParse(merged)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    throw new KernelError('CONFIG_INVALID', 'The configuration is not valid.', {
      hint: `${issues.join('; ')}. Layers applied, lowest precedence first: ${
        contributing.map((l) => l.name).join(' → ') || 'none'
      }.`,
    })
  }

  return { value: parsed.data, sources: contributing.map((l) => l.name) }
}

/**
 * Objects merge key by key; everything else replaces wholesale.
 *
 * Arrays replace rather than concatenate, and that is a deliberate choice worth keeping.
 * Concatenation makes it impossible to *remove* an entry from a lower layer — a deployment
 * could add a provider to the routing chain but never drop the default one. Replacement is
 * predictable: what you write is what you get.
 */
function mergeLayer(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) return override

  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    // An explicit `undefined` means "say nothing", not "unset". A layer that wants to clear
    // a value states it: `null`, or the empty form the schema defines.
    if (value === undefined) continue
    out[key] = key in base ? mergeLayer(base[key], value) : value
  }
  return out
}
