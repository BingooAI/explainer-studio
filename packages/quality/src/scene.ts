// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import {
  charBudget,
  resolveLayout,
  type ResolvedProfiles,
  type Scene,
  type TemplateRegistry,
} from '@bingoo.ai/explainer-core'
import type { Finding } from './finding.js'
import { result, type GateResult } from './finding.js'

/**
 * The layout gate: does this scene actually fit, in every aspect it will be shown at?
 *
 * It measures with `resolveLayout` — the same function the renderer calls, not a
 * reimplementation (ARCHITECTURE §5). That identity is the whole point. A gate with its own
 * idea of geometry approves layouts the renderer then breaks, and the disagreement is
 * invisible until someone watches the lesson.
 *
 * Both aspects are checked because a lesson is authored once and shown on both. Text that
 * fits comfortably in landscape routinely overflows in portrait, and nobody notices while
 * authoring on a laptop.
 */

export interface CheckSceneOptions {
  readonly profiles: ResolvedProfiles
  readonly templates: TemplateRegistry
  /** The locale's strings, so text length can actually be measured. */
  readonly strings: Readonly<Record<string, string>>
  /** Defaults to every aspect the layout profile defines. */
  readonly aspects?: readonly string[]
  /** For the speech metrics used in the character budget. */
  readonly script?: string | undefined
}

export function checkScene(scene: Scene, options: CheckSceneOptions): GateResult {
  const { profiles, templates, strings } = options
  const aspects = options.aspects ?? Object.keys(profiles.layout.canvas)
  const findings: Finding[] = []

  for (const aspect of aspects) {
    const layout = resolveLayout(scene, aspect, { templates, layout: profiles.layout })

    for (const issue of layout.issues) {
      findings.push({
        code: issue.code,
        // Geometry problems are errors: unlike a stylistic warning, they mean the lesson
        // is visibly wrong, and the fix is mechanical rather than a judgement call.
        severity: 'error',
        at: `${scene.id}/${aspect}/${issue.at}`,
        message: issue.message,
        fix: issue.fix,
      })
    }

    for (const placement of layout.placements) {
      const element = scene.elements.find((e) => e.id === placement.id)
      if (!element) continue

      const text = textOf(element.content, strings)
      if (text === undefined) continue

      const budget = charBudget(placement.rect, {
        type: profiles.type,
        speech: profiles.speech,
        canvas: layout.canvas,
        ...(element.style.rung ? { rung: element.style.rung } : {}),
        ...(options.script ? { script: options.script } : {}),
      })

      if (text.length > budget) {
        const over = text.length - budget
        findings.push({
          code: 'TEXT_OVERFLOWS',
          severity: 'error',
          at: `${scene.id}/${aspect}/${element.id}`,
          message: `"${element.id}" holds ${text.length} characters but only ${budget} fit in ${aspect}.`,
          // The number is what makes this repairable: "shorten it" produces a different
          // answer every attempt, "cut 34 characters" produces the same one.
          fix: `Shorten the text for "${element.id}" by at least ${over} characters (to ${budget} or fewer), or give it a smaller rung.`,
        })
      }
    }
  }

  return result(findings)
}

/**
 * The text an element will display, if it displays text at all.
 *
 * Content is `unknown` by design — its shape belongs to the registered element type — so
 * this recognises the `key` convention and nothing more. An element type storing its text
 * elsewhere is simply not budget-checked here, which is an honest limit rather than a
 * silent pass: a plugin that wants the check can validate in its own registration.
 */
function textOf(content: unknown, strings: Readonly<Record<string, string>>): string | undefined {
  if (typeof content !== 'object' || content === null) return undefined

  const key = (content as Record<string, unknown>)['key']
  if (typeof key !== 'string') return undefined

  // A key with no entry is reported by the lint gate; here it is simply unmeasurable.
  return strings[key]
}
