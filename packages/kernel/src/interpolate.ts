// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { KernelError } from './errors.js'

/**
 * Environment interpolation for configuration values: `${VAR}` and `${VAR:-fallback}`.
 *
 * This is what lets a config file be committed safely (ARCHITECTURE §2.2) — the file names
 * the variable, the environment supplies the secret. The environment is passed in rather
 * than read, because a pure package never touches `process.env` (R7), and because that is
 * also what makes this testable without mutating global state.
 */

/**
 * `${NAME}` or `${NAME:-fallback}`.
 *
 * The fallback excludes `{` as well as `}`, which matters for more than tidiness: with
 * `[^}]*` the class could consume a following `${` sequence, so input like `${A:-` repeated
 * many times forced quadratic backtracking — a polynomial ReDoS, flagged by CodeQL. Barring
 * `{` means a nested `${` always terminates the class, so matching stays linear.
 *
 * The cost is that a fallback cannot itself contain `{`. That is an acceptable limit for a
 * configuration default, and a far better trade than a parser that can be stalled by a
 * hostile config file.
 */
const PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^{}]*))?\}/g

export type EnvSource = Readonly<Record<string, string | undefined>>

export interface InterpolateOptions {
  /**
   * What to do about a variable that is not set and has no fallback.
   * `throw` is the default and the right one for configuration: a silently empty API key
   * fails much later, at a point where the cause is no longer obvious.
   */
  readonly onMissing?: 'throw' | 'keep' | 'empty'
}

/** Interpolates a single string. Returns it unchanged if it contains no reference. */
export function interpolateString(input: string, env: EnvSource, options: InterpolateOptions = {}): string {
  const onMissing = options.onMissing ?? 'throw'

  return input.replace(PATTERN, (match, name: string, fallback: string | undefined) => {
    const value = env[name]
    if (value !== undefined) return value
    if (fallback !== undefined) return fallback

    switch (onMissing) {
      case 'keep':
        return match
      case 'empty':
        return ''
      case 'throw':
      default:
        throw new KernelError('CONFIG_UNRESOLVED_VARIABLE', `Environment variable ${name} is not set.`, {
          at: name,
          hint: `Set ${name}, or give it a default in the config with \${${name}:-value}.`,
        })
    }
  })
}

/**
 * Walks a loaded config tree and interpolates every string in it, leaving structure and
 * non-string values alone. Object keys are deliberately not interpolated — a variable
 * deciding a key name makes a config file unreadable to anyone auditing it.
 */
export function interpolateDeep<T>(value: T, env: EnvSource, options: InterpolateOptions = {}): T {
  if (typeof value === 'string') return interpolateString(value, env, options) as T
  if (Array.isArray(value)) return value.map((v: unknown) => interpolateDeep(v, env, options)) as T

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = interpolateDeep(v, env, options)
    return out as T
  }

  return value
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}
