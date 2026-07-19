// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * Ports and vendor-neutral orchestration.
 *
 * **No vendor is named anywhere in this package** (R8). Anthropic, OpenAI-compatible
 * endpoints and Ollama all satisfy the same interface, and the code never asks which one it
 * is holding — only what the descriptor says it can do. That is the difference between
 * model-agnostic and model-agnostic-until-somebody-adds-an-if.
 */

export {
  capability,
  providerDescriptor,
  providerKind,
  type AnyProvider,
  type CancelSignal,
  type Capability,
  type ImageProvider,
  type ImageRequest,
  type ImageResult,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type MediaHit,
  type MediaSearchProvider,
  type MediaStore,
  type ModerationProvider,
  type ModerationResult,
  type ModerationVerdict,
  type Provider,
  type ProviderDescriptor,
  type ProviderKind,
  type StoredMedia,
  type TranslationProvider,
  type VoiceProvider,
  type VoiceRequest,
  type VoiceResult,
  type WordTiming,
} from './ports.js'

export {
  charsToWords,
  cueMarksFrom,
  evenWords,
  type CharTiming,
  type CueMark,
  type CueSyncOptions,
} from './cue-sync.js'

export {
  createProviderRegistry,
  describeAvailable,
  route,
  runWithFallback,
  type AttemptFailure,
  type ProviderRegistry,
  type RoutingOptions,
  type RunResult,
} from './routing.js'
