// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { KernelError, createRegistry, type Registry } from '@bingoo.ai/explainer-kernel'
import { z } from 'zod'
import { builtInProfiles } from './defaults.js'
import {
  anyProfile,
  formatProfileRef,
  profileRef,
  type AnyProfile,
  type LayoutProfile,
  type ProfileKind,
  type ProfilePins,
  type ProfileRef,
  type SpeechProfile,
  type TimingProfile,
  type TypeProfile,
} from './schema.js'

/**
 * The descriptor is metadata, not the profile itself — which is what the registry contract
 * asks for: inert data a UI can list cheaply, plus a factory for the real value.
 *
 * The id is `name@version`, so two versions of one profile coexist and a document pinned to
 * the older keeps rendering the way it was authored. That is the entire reason the version
 * is inside the key rather than beside it.
 */
export const profileDescriptor = z.object({
  /** `house@1` */
  id: profileRef,
  kind: z.enum(['timing', 'layout', 'type', 'speech']),
  /** The bare name, without the version: `house`. */
  name: z.string().min(1),
  version: z.number().int().positive(),
})

export type ProfileDescriptor = z.infer<typeof profileDescriptor>

/**
 * One registry per kind, rather than one registry holding all four.
 *
 * This is not organisational neatness — a shared registry is actively wrong here. The
 * built-in layout, type and speech profiles are all named `default@1`, so a single map
 * would collide on the key and force an invented compound like `type:default@1`. Splitting
 * by kind keeps the id exactly what the document pins, and it makes the errors better:
 * an unknown timing pin can list the timing profiles that do exist rather than every
 * profile of every kind.
 */
export interface ProfileRegistry {
  readonly timing: Registry<ProfileDescriptor, TimingProfile>
  readonly layout: Registry<ProfileDescriptor, LayoutProfile>
  readonly type: Registry<ProfileDescriptor, TypeProfile>
  readonly speech: Registry<ProfileDescriptor, SpeechProfile>
}

export interface CreateProfileRegistryOptions {
  /** Registered first, so a deployment's own profiles can be added on top. */
  readonly includeBuiltIns?: boolean
}

export function createProfileRegistry(options: CreateProfileRegistryOptions = {}): ProfileRegistry {
  const of = <T>(kind: ProfileKind) =>
    createRegistry<ProfileDescriptor, T>({ kind: `${kind} profile`, schema: profileDescriptor })

  const registry: ProfileRegistry = {
    timing: of<TimingProfile>('timing'),
    layout: of<LayoutProfile>('layout'),
    type: of<TypeProfile>('type'),
    speech: of<SpeechProfile>('speech'),
  }

  if (options.includeBuiltIns !== false) {
    for (const profile of builtInProfiles) registerProfile(registry, profile)
  }

  return registry
}

/**
 * Registers a profile after checking the constraints zod cannot express — a profile that
 * names a default rung it does not define is structurally valid and functionally broken,
 * and it should fail here rather than as a missing text size mid-render.
 */
export function registerProfile(registry: ProfileRegistry, profile: AnyProfile): void {
  const validated = anyProfile.parse(profile)
  assertInternallyConsistent(validated)

  const entry = {
    descriptor: {
      id: formatProfileRef(validated),
      kind: validated.kind,
      name: validated.id,
      version: validated.version,
    },
    create: () => validated,
  }

  // The cast is confined to this one dispatch: each sub-registry is typed to its own
  // profile, and the discriminant has already been validated above.
  switch (validated.kind) {
    case 'timing':
      registry.timing.register({ ...entry, create: () => validated })
      break
    case 'layout':
      registry.layout.register({ ...entry, create: () => validated })
      break
    case 'type':
      registry.type.register({ ...entry, create: () => validated })
      break
    case 'speech':
      registry.speech.register({ ...entry, create: () => validated })
      break
  }
}

/** Every registered profile, across all kinds. What a settings UI lists. */
export function listProfiles(registry: ProfileRegistry): readonly ProfileDescriptor[] {
  return [
    ...registry.timing.list(),
    ...registry.layout.list(),
    ...registry.type.list(),
    ...registry.speech.list(),
  ]
}

function assertInternallyConsistent(profile: AnyProfile): void {
  const ref = formatProfileRef(profile)

  if (profile.kind === 'type' && !(profile.defaultRung in profile.rungs)) {
    throw new KernelError('REGISTRY_INVALID_DESCRIPTOR', 'The default rung is not defined in this profile.', {
      at: ref,
      hint: `defaultRung is "${profile.defaultRung}"; defined rungs are: ${Object.keys(profile.rungs).join(', ') || 'none'}.`,
    })
  }

  if (profile.kind === 'speech' && !(profile.defaultScript in profile.byScript)) {
    throw new KernelError(
      'REGISTRY_INVALID_DESCRIPTOR',
      'The default script has no metrics in this profile.',
      {
        at: ref,
        hint: `defaultScript is "${profile.defaultScript}"; scripts with metrics: ${Object.keys(profile.byScript).join(', ') || 'none'}.`,
      },
    )
  }

  if (profile.kind === 'layout' && Object.keys(profile.canvas).length === 0) {
    throw new KernelError('REGISTRY_INVALID_DESCRIPTOR', 'A layout profile defines no canvas.', {
      at: ref,
      hint: 'Define at least one aspect, for example "16:9": { width: 1600, height: 900 }.',
    })
  }
}

/**
 * The set of profiles a document renders against.
 *
 * Resolved once, up front, so a missing profile is an error before a lesson starts rather
 * than a blank scene partway through.
 */
export interface ResolvedProfiles {
  readonly timing: TimingProfile
  readonly layout: LayoutProfile
  readonly type: TypeProfile
  readonly speech: SpeechProfile
}

export function resolveProfiles(registry: ProfileRegistry, pins: ProfilePins): ResolvedProfiles {
  return {
    timing: registry.timing.get(pins.timing),
    layout: registry.layout.get(pins.layout),
    type: registry.type.get(pins.type),
    speech: registry.speech.get(pins.speech),
  }
}

/** Convenience for a caller holding a ref and a kind, e.g. a settings UI preview. */
export function getProfile<K extends ProfileKind>(
  registry: ProfileRegistry,
  kind: K,
  ref: ProfileRef,
): ResolvedProfiles[K] {
  return registry[kind].get(ref) as ResolvedProfiles[K]
}
