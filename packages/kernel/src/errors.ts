// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * Errors carry a stable machine code alongside a message written for whoever reads it
 * (R15). The code is what callers branch on and what a UI translates; the message is what
 * a person sees when nothing translated it. Neither is optional: a code with no readable
 * message reaches a teacher as a mystery, and a message with no code forces callers to
 * match on prose.
 */
export type KernelErrorCode =
  | 'REGISTRY_DUPLICATE_ID'
  | 'REGISTRY_UNKNOWN_ID'
  | 'REGISTRY_INVALID_DESCRIPTOR'
  | 'REGISTRY_FACTORY_FAILED'
  | 'CONFIG_INVALID'
  | 'CONFIG_UNRESOLVED_VARIABLE'

export interface KernelErrorOptions {
  /** Where the problem is: a config path, a registry id, a layer name. */
  readonly at?: string | undefined
  /** What the caller could do instead — ids that do exist, values that are accepted. */
  readonly hint?: string | undefined
  readonly cause?: unknown
}

export class KernelError extends Error {
  readonly code: KernelErrorCode
  readonly at: string | undefined
  readonly hint: string | undefined

  constructor(code: KernelErrorCode, message: string, options: KernelErrorOptions = {}) {
    // `at` and `hint` are folded into the message rather than kept only as properties.
    // `.message` is what appears in a stack trace and in nearly every logger, so a hint
    // that lives outside it is a hint most readers never see — which defeats the point of
    // writing one. The structured parts remain available for callers that want them.
    super(compose(message, options), { cause: options.cause })
    this.name = 'KernelError'
    this.code = code
    this.at = options.at
    this.hint = options.hint
  }
}

function compose(message: string, options: KernelErrorOptions): string {
  const located = options.at ? `${message} (at ${options.at})` : message
  return options.hint ? `${located} ${options.hint}` : located
}

export function isKernelError(value: unknown): value is KernelError {
  return value instanceof KernelError
}
