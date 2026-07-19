// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { ZodType } from 'zod'
import { KernelError } from './errors.js'

/**
 * The registry is the mechanism behind R1: providers, layout templates, themes, locale
 * packs, question kinds, kits and exporters are all registries rather than switch
 * statements, so extending the product never means editing core.
 *
 * Two properties are load-bearing and easy to lose later:
 *
 * 1. A registry is an INSTANCE, never module-level state (R16). Two lessons with different
 *    kit sets must coexist in one process, and a multi-tenant host must never leak
 *    configuration between tenants. A module-level `Map` would make these packages
 *    un-embeddable, and that is not something you can retrofit.
 *
 * 2. Registration validates and fails LOUDLY, at startup. A malformed descriptor that
 *    surfaces as a blank scene halfway through a lesson is far more expensive to diagnose
 *    than one that refuses to start.
 */

/** Every registry entry is addressed by a stable id. */
export interface Descriptor {
  readonly id: string
}

/**
 * An entry is data plus a factory. The descriptor is inert and queryable — it is what a UI
 * lists, what the authoring contract is generated from, and what capability checks read.
 * The factory produces the working value, and only when something asks for it.
 */
export interface RegistryEntry<D extends Descriptor, V> {
  readonly descriptor: D
  readonly create: () => V
}

export interface RegistryOptions<D extends Descriptor> {
  /** Names the thing being registered. Appears in every error: "provider", "template". */
  readonly kind: string
  /** Validates descriptors at registration. This is what makes failure loud and early. */
  readonly schema: ZodType<D>
}

export interface Registry<D extends Descriptor, V> {
  readonly kind: string
  /** Throws on a duplicate id or an invalid descriptor. */
  register(entry: RegistryEntry<D, V>): void
  registerAll(entries: readonly RegistryEntry<D, V>[]): void
  has(id: string): boolean
  /** Throws if the id is unknown, naming the ids that do exist. */
  get(id: string): V
  /** Throws if the id is unknown. Cheap — never runs the factory. */
  descriptorOf(id: string): D
  /** All descriptors, in registration order. This is what a UI renders. */
  list(): readonly D[]
  ids(): readonly string[]
  readonly size: number
}

interface Slot<D extends Descriptor, V> {
  readonly descriptor: D
  readonly create: () => V
  value?: V
  created: boolean
}

export function createRegistry<D extends Descriptor, V>(options: RegistryOptions<D>): Registry<D, V> {
  const { kind, schema } = options
  const slots = new Map<string, Slot<D, V>>()

  const known = (): string => (slots.size === 0 ? 'none are registered' : [...slots.keys()].join(', '))

  const register = (entry: RegistryEntry<D, V>): void => {
    const parsed = schema.safeParse(entry.descriptor)
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ')
      throw new KernelError('REGISTRY_INVALID_DESCRIPTOR', `Invalid ${kind} descriptor.`, {
        at: readIdLoosely(entry.descriptor) ?? `${kind}(unknown id)`,
        hint: issues,
      })
    }

    const descriptor = parsed.data
    if (slots.has(descriptor.id)) {
      throw new KernelError('REGISTRY_DUPLICATE_ID', `A ${kind} with this id is already registered.`, {
        at: descriptor.id,
        hint: 'Ids must be unique within a registry. Rename one, or register it on a separate registry instance.',
      })
    }

    slots.set(descriptor.id, { descriptor, create: entry.create, created: false })
  }

  const slotOf = (id: string): Slot<D, V> => {
    const slot = slots.get(id)
    if (!slot) {
      throw new KernelError('REGISTRY_UNKNOWN_ID', `No ${kind} is registered under this id.`, {
        at: id,
        hint: `Registered ${kind}s: ${known()}.`,
      })
    }
    return slot
  }

  return {
    kind,
    register,

    registerAll(entries) {
      for (const entry of entries) register(entry)
    },

    has(id) {
      return slots.has(id)
    },

    get(id) {
      const slot = slotOf(id)
      // Created once per registry instance and reused. Scoping the cache to the instance is
      // what keeps this safe: "one instance" means one per registry, not one per process.
      if (!slot.created) {
        try {
          slot.value = slot.create()
        } catch (cause) {
          throw new KernelError('REGISTRY_FACTORY_FAILED', `Could not create this ${kind}.`, {
            at: id,
            hint: cause instanceof Error ? cause.message : String(cause),
            cause,
          })
        }
        slot.created = true
      }
      return slot.value as V
    },

    descriptorOf(id) {
      return slotOf(id).descriptor
    },

    list() {
      return [...slots.values()].map((s) => s.descriptor)
    },

    ids() {
      return [...slots.keys()]
    },

    get size() {
      return slots.size
    },
  }
}

/**
 * Best-effort id for the error message when validation itself failed — at that point the
 * descriptor is `unknown` and may not have an id at all. Naming the offending entry is the
 * difference between a fixable error and a scavenger hunt.
 */
function readIdLoosely(descriptor: unknown): string | undefined {
  if (typeof descriptor !== 'object' || descriptor === null) return undefined
  const id: unknown = (descriptor as Record<string, unknown>)['id']
  return typeof id === 'string' && id.length > 0 ? id : undefined
}
