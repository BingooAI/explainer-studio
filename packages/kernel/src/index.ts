// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * Registry and configuration primitives shared by every Explainer Studio package.
 *
 * Pure, with zod as its only runtime dependency. See docs/adr/0002 for why this is a
 * separate package rather than part of `core`.
 */

export { KernelError, isKernelError, type KernelErrorCode, type KernelErrorOptions } from './errors.js'

export {
  createRegistry,
  type Descriptor,
  type Registry,
  type RegistryEntry,
  type RegistryOptions,
} from './registry.js'

export { resolveConfig, type ConfigLayer, type ResolveConfigOptions, type ResolvedConfig } from './config.js'

export {
  interpolateDeep,
  interpolateString,
  isPlainObject,
  type EnvSource,
  type InterpolateOptions,
} from './interpolate.js'
