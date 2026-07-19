// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

/**
 * The ports. Interfaces only — no vendor is named anywhere in this package (R8).
 *
 * The rule that makes model-agnosticism real rather than aspirational is in the descriptor:
 * **capabilities are declared, not assumed**. Code asks *"does this support word timings?"*
 * and never *"is this OpenAI?"* The moment one feature branches on a provider id, adding
 * the next provider means editing that branch, and R1 is gone.
 */

export const capability = z.enum([
  /** Returns per-word start and end times. Without it, cue sync falls back to an estimate. */
  'word-timings',
  /** Extended reasoning. Used when present, never required — no stage may need it (R17). */
  'thinking',
  'streaming',
  'json-mode',
  'vision',
  'image-generation',
  'embeddings',
  'moderation',
])

export type Capability = z.infer<typeof capability>

export const providerKind = z.enum([
  'llm',
  'voice',
  'image',
  'search',
  'translation',
  'sfx',
  'moderation',
  'storage',
])

export type ProviderKind = z.infer<typeof providerKind>

/**
 * Cancellation, structurally.
 *
 * A real `AbortSignal` satisfies this, so callers pass one directly — but naming the DOM
 * type here would mean widening `lib` to pull in every browser global, and a pure package
 * that can see `document` is one commit away from using it (R7). Declaring the shape we
 * actually depend on keeps the boundary honest and costs a caller nothing.
 *
 * Cancellation is not optional polish: every agent loop is hard-bounded by wall-clock and
 * budget (R17), and a request that cannot be stopped cannot be bounded.
 */
export interface CancelSignal {
  readonly aborted: boolean
  addEventListener?(type: 'abort', listener: () => void): void
}

export const providerDescriptor = z.object({
  id: z.string().min(1).max(64),
  kind: providerKind,
  /** Shown in the settings UI. Written for a teacher, not an engineer (R15). */
  label: z.string().min(1).max(128),
  capabilities: z.array(capability).default([]),
  /**
   * Models this provider offers, when it can say. A provider that can enumerate its own
   * (an OpenAI-compatible `/v1/models`, an Ollama tag list) reports them here so the UI
   * lists what is actually installed rather than a list we hardcoded and stopped updating.
   */
  models: z.array(z.string().max(128)).optional(),
  /** Rough cost per million tokens or per minute, for the spend estimate (§12). */
  costHint: z.number().nonnegative().optional(),
  /** True when nothing leaves the machine. The keyless local path depends on knowing this. */
  local: z.boolean().default(false),
})

export type ProviderDescriptor = z.infer<typeof providerDescriptor>

export interface Provider {
  descriptor(): ProviderDescriptor
  /**
   * Whether this provider can be used right now — a key is present, a local server is
   * reachable. Cheap and synchronous: routing consults it on every call, so it reads
   * configuration rather than probing the network.
   */
  available(): boolean
}

// --- LLM ---------------------------------------------------------------------------

export interface LlmMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

export interface LlmRequest {
  readonly messages: readonly LlmMessage[]
  readonly maxTokens?: number
  readonly temperature?: number
  /** Honoured only where the descriptor declares `thinking`; ignored elsewhere. */
  readonly thinking?: boolean
  readonly signal?: CancelSignal
}

export interface LlmResponse {
  readonly text: string
  /** For provenance (R11) — a run must be auditable and re-runnable. */
  readonly model: string
  readonly inputTokens?: number
  readonly outputTokens?: number
}

export interface LlmProvider extends Provider {
  complete(request: LlmRequest): Promise<LlmResponse>
}

// --- Voice -------------------------------------------------------------------------

export interface WordTiming {
  readonly word: string
  readonly start: number
  readonly end: number
}

export interface VoiceRequest {
  /** Cue markers already removed. The provider speaks words, not instructions. */
  readonly text: string
  readonly voice?: string
  readonly locale: string
  readonly signal?: CancelSignal
}

export interface VoiceResult {
  readonly audio: Uint8Array
  readonly mimeType: string
  readonly durationSeconds: number
  /** Present only where the descriptor declares `word-timings`. */
  readonly words?: readonly WordTiming[]
}

export interface VoiceProvider extends Provider {
  speak(request: VoiceRequest): Promise<VoiceResult>
}

// --- Image -------------------------------------------------------------------------

export interface ImageRequest {
  readonly prompt: string
  readonly width: number
  readonly height: number
  readonly signal?: CancelSignal
}

export interface ImageResult {
  readonly image: Uint8Array
  readonly mimeType: string
}

export interface ImageProvider extends Provider {
  generate(request: ImageRequest): Promise<ImageResult>
}

// --- Media search ------------------------------------------------------------------

export interface MediaHit {
  /** A storage reference, never a bucket URL — a lesson must survive a storage move (R16). */
  readonly ref: string
  readonly score: number
  readonly width?: number
  readonly height?: number
}

export interface MediaSearchProvider extends Provider {
  search(query: string, limit: number): Promise<readonly MediaHit[]>
}

// --- Translation -------------------------------------------------------------------

export interface TranslationProvider extends Provider {
  translate(text: string, from: string, to: string): Promise<string>
}

// --- Moderation --------------------------------------------------------------------

export type ModerationVerdict = 'allow' | 'flag' | 'block'

export interface ModerationResult {
  readonly verdict: ModerationVerdict
  /** Why, in language a teacher can act on (R15). */
  readonly reason?: string
  readonly categories?: readonly string[]
}

export interface ModerationProvider extends Provider {
  check(text: string, locale: string): Promise<ModerationResult>
}

// --- Storage -----------------------------------------------------------------------

export interface StoredMedia {
  readonly ref: string
  readonly bytes: number
}

export interface MediaStore extends Provider {
  /**
   * Stores bytes under a content-addressed key, so the same narration line is never paid
   * for or stored twice, and two lessons can share an image without either owning it.
   */
  put(key: string, data: Uint8Array, mimeType: string): Promise<StoredMedia>
  /**
   * A time-limited URL for the browser to fetch directly. Proxying every image through the
   * app is what makes a self-hosted install fall over on a class of thirty.
   */
  urlFor(ref: string, expiresInSeconds: number): Promise<string>
  has(ref: string): Promise<boolean>
}

/** Anything that satisfies a port. Used by the registry, which does not care which. */
export type AnyProvider =
  | LlmProvider
  | VoiceProvider
  | ImageProvider
  | MediaSearchProvider
  | TranslationProvider
  | ModerationProvider
  | MediaStore
