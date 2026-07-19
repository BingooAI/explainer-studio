// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * What a gate reports.
 *
 * Every finding carries a **mechanical fix** — a specific instruction, not a description of
 * the problem. That is what makes the generation repair loop deterministic: the fix is fed
 * straight back to the model as the next instruction (ARCHITECTURE §7). "This scene is too
 * crowded" produces a different lesson every attempt; "move 2 elements out of the stage
 * region" produces the same one.
 *
 * A finding with a vague fix is worse than no finding, because it looks like progress.
 */

export type Severity = 'error' | 'warn'

export interface Finding {
  /** Stable machine code. Callers branch on this; a UI translates it. */
  readonly code: string
  readonly severity: Severity
  /** Where: `scenes.2`, an element id, a string key. */
  readonly at: string
  /** What is wrong, in a sentence a person can read. */
  readonly message: string
  /** What to do about it. Specific enough that following it literally works. */
  readonly fix: string
}

export interface GateResult {
  readonly findings: readonly Finding[]
  /** True when nothing is an error. Warnings do not block. */
  readonly ok: boolean
}

export function result(findings: readonly Finding[]): GateResult {
  return { findings, ok: !findings.some((f) => f.severity === 'error') }
}

export function errorsOf(findings: readonly Finding[]): readonly Finding[] {
  return findings.filter((f) => f.severity === 'error')
}

/**
 * The repair instructions, one per line.
 *
 * This is the exact text handed back to a model after a failed attempt. It is deliberately
 * the fixes and not the messages: the model does not need to be told it did badly, it needs
 * to be told what to change.
 */
export function repairInstructions(findings: readonly Finding[], limit = 20): string {
  const errors = errorsOf(findings)
  const shown = errors.slice(0, limit).map((f) => `- ${f.at}: ${f.fix}`)
  const rest = errors.length - shown.length

  return rest > 0 ? `${shown.join('\n')}\n- (and ${rest} more of the same kind)` : shown.join('\n')
}
