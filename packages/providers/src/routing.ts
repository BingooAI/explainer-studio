// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { KernelError, createRegistry, type Registry } from '@bingoo.ai/explainer-kernel'
import { providerDescriptor, type Capability, type Provider, type ProviderDescriptor } from './ports.js'

/**
 * Provider registry and routing.
 *
 * Routing is an **ordered list from configuration**, not an `if` chain (ARCHITECTURE §2.2).
 * That is what lets a deployment put a local model first and a hosted one behind it, or the
 * reverse, without anyone editing code — and it is what makes failover a property of the
 * configuration rather than a special case somebody remembered to write.
 */

export type ProviderRegistry<P extends Provider> = Registry<ProviderDescriptor, P>

export function createProviderRegistry<P extends Provider>(kind: string): ProviderRegistry<P> {
  return createRegistry<ProviderDescriptor, P>({ kind: `${kind} provider`, schema: providerDescriptor })
}

export interface RoutingOptions {
  /** Provider ids, most preferred first. */
  readonly order: readonly string[]
  /** Skip providers that cannot serve the request. */
  readonly requires?: readonly Capability[]
}

/**
 * The providers to try, in order, that are available and capable.
 *
 * Returns a list rather than one provider because the caller needs the rest to fall back
 * onto (R15): a key that expires mid-lesson should drop to the next provider and say so,
 * never stop the work.
 */
export function route<P extends Provider>(registry: ProviderRegistry<P>, options: RoutingOptions): P[] {
  const chain: P[] = []

  for (const id of options.order) {
    if (!registry.has(id)) continue

    const provider = registry.get(id)
    if (!provider.available()) continue

    if (options.requires?.length) {
      const declared = new Set(provider.descriptor().capabilities)
      // Capability is asked of the descriptor, never inferred from the id. The moment one
      // feature branches on a provider name, adding the next provider means editing that
      // branch, and R1 is gone.
      if (!options.requires.every((capability) => declared.has(capability))) continue
    }

    chain.push(provider)
  }

  return chain
}

export interface AttemptFailure {
  readonly providerId: string
  readonly error: unknown
}

export interface RunResult<T> {
  readonly value: T
  readonly providerId: string
  /** Providers that were tried and failed first. Surfaced so a UI can explain the fallback. */
  readonly failures: readonly AttemptFailure[]
}

/**
 * Runs `attempt` down the chain until one succeeds.
 *
 * Failures are collected rather than swallowed. A lesson that quietly used the browser
 * voice because a paid key had expired is a support ticket nobody can diagnose; the same
 * lesson that says so is a setting somebody fixes in a minute.
 */
export async function runWithFallback<P extends Provider, T>(
  chain: readonly P[],
  attempt: (provider: P) => Promise<T>,
): Promise<RunResult<T>> {
  const failures: AttemptFailure[] = []

  for (const provider of chain) {
    const id = provider.descriptor().id
    try {
      return { value: await attempt(provider), providerId: id, failures }
    } catch (error) {
      failures.push({ providerId: id, error })
    }
  }

  throw new KernelError('REGISTRY_FACTORY_FAILED', 'No provider could handle this request.', {
    hint:
      failures.length === 0
        ? 'None were configured, available, or capable of it. Check the provider settings.'
        : `Tried ${failures.length}: ${failures.map((f) => `${f.providerId} (${describe(f.error)})`).join(', ')}.`,
  })
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * What a settings UI shows: every registered provider, whether it is usable, and what it
 * unlocks. Built from descriptors so the list reflects the deployment rather than a
 * hardcoded catalogue we would stop updating (§12).
 */
export function describeAvailable<P extends Provider>(
  registry: ProviderRegistry<P>,
): Array<ProviderDescriptor & { available: boolean }> {
  return registry.list().map((descriptor) => ({
    ...descriptor,
    available: registry.get(descriptor.id).available(),
  }))
}
