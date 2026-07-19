// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { KernelError, createRegistry, type Registry } from '@bingoo.ai/explainer-kernel'
import { z } from 'zod'
import { registryKey } from '../schema/primitives.js'

/**
 * A template is a **teaching move**, not a shape: `teach`, `compare`, `worked-example`.
 *
 * Naming them after intent rather than geometry is what keeps the authoring contract
 * describable to a model. "Put the definition on the left and the example on the right" is
 * a layout decision we can make once and reuse; asking a model to make it every time is
 * asking for a different answer every time.
 */

const fraction = z.number().min(0).max(1)

/**
 * A named region of the canvas, in fractions so one definition serves any resolution.
 *
 * Children flow within it — there is no way to place one *at* a point, which is the same
 * constraint elements have (R6) applied one level up.
 */
export const slotDefinition = z.object({
  name: z.string().min(1).max(64),
  x: fraction,
  y: fraction,
  width: fraction,
  height: fraction,
  /** How children are arranged within the slot. */
  direction: z.enum(['row', 'column']).default('column'),
  /** Space between children, as a fraction of the slot's main-axis length. */
  gap: fraction.default(0.02),
})

export type SlotDefinition = z.infer<typeof slotDefinition>

export const templateDescriptor = z.object({
  id: registryKey,
  /**
   * Slots per aspect. Both aspects are defined explicitly rather than derived, because a
   * layout that works in landscape rarely works in portrait by scaling — a two-column
   * comparison becomes two rows, not two narrow columns.
   */
  slots: z.record(z.string(), z.array(slotDefinition).min(1)),
})

export type TemplateDescriptor = z.infer<typeof templateDescriptor>
export type TemplateRegistry = Registry<TemplateDescriptor, TemplateDescriptor>

export function createTemplateRegistry(options: { includeBuiltIns?: boolean } = {}): TemplateRegistry {
  const registry = createRegistry<TemplateDescriptor, TemplateDescriptor>({
    kind: 'layout template',
    schema: templateDescriptor,
  })

  if (options.includeBuiltIns !== false) {
    for (const template of builtInTemplates) registerTemplate(registry, template)
  }

  return registry
}

/**
 * Registers a template after checking that its slots do not overlap.
 *
 * This is where collision detection belongs, and it is the reason the layout algorithm
 * needs none: slots cannot overlap, and children flow sequentially within a slot, so two
 * elements can never be given the same space. Checking once at registration beats checking
 * every scene of every lesson forever.
 */
export function registerTemplate(registry: TemplateRegistry, template: TemplateDescriptor): void {
  const validated = templateDescriptor.parse(template)

  for (const [aspect, slots] of Object.entries(validated.slots)) {
    assertSlotsFit(validated.id, aspect, slots)
    assertNoOverlap(validated.id, aspect, slots)
    assertUniqueNames(validated.id, aspect, slots)
  }

  registry.register({ descriptor: validated, create: () => validated })
}

function assertSlotsFit(id: string, aspect: string, slots: readonly SlotDefinition[]): void {
  for (const slot of slots) {
    if (slot.x + slot.width > 1 + EPSILON || slot.y + slot.height > 1 + EPSILON) {
      throw new KernelError('REGISTRY_INVALID_DESCRIPTOR', 'A slot extends past the canvas.', {
        at: `${id}/${aspect}/${slot.name}`,
        hint: `x + width is ${round(slot.x + slot.width)} and y + height is ${round(slot.y + slot.height)}; both must be at most 1.`,
      })
    }
  }
}

function assertNoOverlap(id: string, aspect: string, slots: readonly SlotDefinition[]): void {
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i]!
      const b = slots[j]!
      if (overlaps(a, b)) {
        throw new KernelError('REGISTRY_INVALID_DESCRIPTOR', 'Two slots overlap.', {
          at: `${id}/${aspect}`,
          hint: `"${a.name}" and "${b.name}" share space. Slots must be disjoint — that is what makes it impossible for two elements to be placed on top of each other.`,
        })
      }
    }
  }
}

function assertUniqueNames(id: string, aspect: string, slots: readonly SlotDefinition[]): void {
  const seen = new Set<string>()
  for (const slot of slots) {
    if (seen.has(slot.name)) {
      throw new KernelError('REGISTRY_INVALID_DESCRIPTOR', 'Two slots share a name.', {
        at: `${id}/${aspect}/${slot.name}`,
        hint: 'A scene addresses slots by name, so duplicates make the reference ambiguous.',
      })
    }
    seen.add(slot.name)
  }
}

/** Touching edges are not an overlap — adjacent slots are the normal case. */
const EPSILON = 1e-9

function overlaps(a: SlotDefinition, b: SlotDefinition): boolean {
  return (
    a.x < b.x + b.width - EPSILON &&
    b.x < a.x + a.width - EPSILON &&
    a.y < b.y + b.height - EPSILON &&
    b.y < a.y + a.height - EPSILON
  )
}

function round(n: number): string {
  return (Math.round(n * 1000) / 1000).toString()
}

/**
 * A deliberately small starting set. Templates are cheap to add and expensive to get wrong:
 * every one becomes part of the authoring contract the model is told about, so a mediocre
 * template is a mediocre lesson shape reproduced at scale.
 *
 * Each defines both aspects. Note how portrait is not landscape scaled — `two-col` becomes
 * two stacked rows, because narrow columns are unreadable on a phone.
 */
export const builtInTemplates: readonly TemplateDescriptor[] = [
  {
    id: 'title-card',
    slots: {
      '16:9': [{ name: 'headline', x: 0.1, y: 0.3, width: 0.8, height: 0.4, direction: 'column', gap: 0.04 }],
      '9:16': [
        { name: 'headline', x: 0.08, y: 0.32, width: 0.84, height: 0.36, direction: 'column', gap: 0.04 },
      ],
    },
  },
  {
    id: 'teach',
    slots: {
      '16:9': [
        { name: 'headline', x: 0.06, y: 0.06, width: 0.88, height: 0.16, direction: 'column', gap: 0.02 },
        { name: 'stage', x: 0.06, y: 0.24, width: 0.88, height: 0.62, direction: 'row', gap: 0.03 },
      ],
      '9:16': [
        { name: 'headline', x: 0.06, y: 0.08, width: 0.88, height: 0.12, direction: 'column', gap: 0.02 },
        { name: 'stage', x: 0.06, y: 0.22, width: 0.88, height: 0.66, direction: 'column', gap: 0.03 },
      ],
    },
  },
  {
    id: 'two-col',
    slots: {
      '16:9': [
        { name: 'headline', x: 0.06, y: 0.06, width: 0.88, height: 0.14, direction: 'column', gap: 0.02 },
        { name: 'left', x: 0.06, y: 0.24, width: 0.42, height: 0.62, direction: 'column', gap: 0.03 },
        { name: 'right', x: 0.52, y: 0.24, width: 0.42, height: 0.62, direction: 'column', gap: 0.03 },
      ],
      // Two narrow columns are unreadable on a phone, so portrait stacks them.
      '9:16': [
        { name: 'headline', x: 0.06, y: 0.06, width: 0.88, height: 0.1, direction: 'column', gap: 0.02 },
        { name: 'left', x: 0.06, y: 0.19, width: 0.88, height: 0.36, direction: 'column', gap: 0.03 },
        { name: 'right', x: 0.06, y: 0.58, width: 0.88, height: 0.36, direction: 'column', gap: 0.03 },
      ],
    },
  },
  {
    id: 'bullets',
    slots: {
      '16:9': [
        { name: 'headline', x: 0.08, y: 0.1, width: 0.84, height: 0.16, direction: 'column', gap: 0.02 },
        { name: 'points', x: 0.08, y: 0.3, width: 0.84, height: 0.56, direction: 'column', gap: 0.04 },
      ],
      '9:16': [
        { name: 'headline', x: 0.07, y: 0.1, width: 0.86, height: 0.12, direction: 'column', gap: 0.02 },
        { name: 'points', x: 0.07, y: 0.26, width: 0.86, height: 0.62, direction: 'column', gap: 0.04 },
      ],
    },
  },
]
