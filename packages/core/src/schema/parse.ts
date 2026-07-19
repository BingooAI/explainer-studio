// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { KernelError } from '@bingoo.ai/explainer-kernel'
import type { ZodType } from 'zod'
import { DOCUMENT_VERSION, explainerDocument, type ExplainerDocument } from './document.js'
import { localeBundle, type LocaleBundle } from './locale.js'

/**
 * Parsing returns a result rather than throwing, because the common caller is the
 * generation pipeline, where a validation failure is not exceptional — it is the signal
 * that drives the repair loop. Every issue is fed back to the model as an instruction, so
 * losing all but the first would make repair guesswork.
 *
 * `assert*` variants exist for callers that genuinely cannot continue.
 */

export interface ParseIssue {
  /** Dotted path into the document: `scenes.2.elements.0.region`. */
  readonly path: string
  readonly message: string
}

export type ParseResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly ParseIssue[] }

function run<T>(schema: ZodType<T>, input: unknown): ParseResult<T> {
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, value: parsed.data }
  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  }
}

/**
 * Checked before schema validation so a version mismatch reports itself as one.
 *
 * Without this, a `explainer/v2` document handed to a v1 reader fails with a pile of
 * confusing field errors instead of the one sentence that actually explains the problem —
 * and this is precisely the case a version field exists to catch.
 */
function versionIssue(input: unknown, expected: string, field = 'version'): ParseIssue | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const found: unknown = (input as Record<string, unknown>)[field]
  if (found === expected) return undefined
  if (typeof found !== 'string') {
    return { path: field, message: `missing; expected "${expected}"` }
  }
  return {
    path: field,
    message: `this is "${found}" but this build reads "${expected}". A converter must run first.`,
  }
}

export function parseDocument(input: unknown): ParseResult<ExplainerDocument> {
  const mismatch = versionIssue(input, DOCUMENT_VERSION)
  if (mismatch) return { ok: false, issues: [mismatch] }
  return run(explainerDocument, input)
}

export function parseBundle(input: unknown): ParseResult<LocaleBundle> {
  const mismatch = versionIssue(input, 'explainer-bundle/v1')
  if (mismatch) return { ok: false, issues: [mismatch] }
  return run(localeBundle, input)
}

export function assertDocument(input: unknown): ExplainerDocument {
  const result = parseDocument(input)
  if (result.ok) return result.value
  throw new KernelError('CONFIG_INVALID', 'This is not a valid explainer document.', {
    hint: formatIssues(result.issues),
  })
}

export function assertBundle(input: unknown): LocaleBundle {
  const result = parseBundle(input)
  if (result.ok) return result.value
  throw new KernelError('CONFIG_INVALID', 'This is not a valid locale bundle.', {
    hint: formatIssues(result.issues),
  })
}

/** Caps the list because a wholly malformed document produces hundreds of issues, and a
 *  wall of them is read by nobody. The count tells you it was truncated. */
export function formatIssues(issues: readonly ParseIssue[], limit = 10): string {
  const shown = issues.slice(0, limit).map((i) => `${i.path}: ${i.message}`)
  const rest = issues.length - shown.length
  return rest > 0 ? `${shown.join('; ')} (and ${rest} more)` : shown.join('; ')
}
