// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { cueNames, type ExplainerDocument, type LocaleBundle, type Scene } from '@bingoo.ai/explainer-core'
import type { Finding } from './finding.js'
import { result, type GateResult } from './finding.js'

/**
 * Structural integrity: the checks that need the document and its bundles together.
 *
 * These are the failures the schema cannot see. Zod validates that a beat has a `cue`
 * string; only this knows whether any narration actually contains that cue. A document can
 * be perfectly valid and still be a lesson where nothing happens when the voice speaks.
 *
 * Pure and deterministic. **No gate may call a model** (R2) — the trustworthiness of the
 * whole product rests on these being code, so a weaker model produces a worse lesson and
 * never an invalid one.
 */

export interface LintOptions {
  /** Every locale bundle for this document, so coverage can be checked across all of them. */
  readonly bundles: readonly LocaleBundle[]
}

export function lintDocument(document: ExplainerDocument, options: LintOptions): GateResult {
  const findings: Finding[] = []

  checkUniqueIds(document, findings)
  checkBundleCoverage(document, options.bundles, findings)

  for (const [index, scene] of document.scenes.entries()) {
    const at = `scenes.${index}`
    checkSceneReferences(scene, at, findings)
    checkCueIntegrity(scene, at, options.bundles, findings)
  }

  return result(findings)
}

function checkUniqueIds(document: ExplainerDocument, findings: Finding[]): void {
  const seenScenes = new Set<string>()

  for (const [index, scene] of document.scenes.entries()) {
    if (seenScenes.has(scene.id)) {
      findings.push({
        code: 'DUPLICATE_SCENE_ID',
        severity: 'error',
        at: `scenes.${index}`,
        message: `Two scenes share the id "${scene.id}".`,
        fix: `Rename this scene to something unique, for example "${scene.id}-2".`,
      })
    }
    seenScenes.add(scene.id)

    const seenElements = new Set<string>()
    for (const element of scene.elements) {
      if (seenElements.has(element.id)) {
        // Duplicate ids make every beat targeting them ambiguous, and the ambiguity
        // resolves differently in layout and in timing.
        findings.push({
          code: 'DUPLICATE_ELEMENT_ID',
          severity: 'error',
          at: `scenes.${index}.elements.${element.id}`,
          message: `Scene "${scene.id}" has two elements with the id "${element.id}".`,
          fix: `Rename one of them, for example to "${element.id}-2", and update any beat that targets it.`,
        })
      }
      seenElements.add(element.id)
    }

    const seenBeats = new Set<string>()
    for (const beat of scene.beats) {
      if (seenBeats.has(beat.id)) {
        findings.push({
          code: 'DUPLICATE_BEAT_ID',
          severity: 'error',
          at: `scenes.${index}.beats.${beat.id}`,
          message: `Scene "${scene.id}" has two beats with the id "${beat.id}".`,
          fix: `Rename one of them, for example to "${beat.id}-2".`,
        })
      }
      seenBeats.add(beat.id)
    }
  }
}

/** Beat targets and pose names must resolve, or the action silently does nothing. */
function checkSceneReferences(scene: Scene, at: string, findings: Finding[]): void {
  const elements = new Map(scene.elements.map((e) => [e.id, e]))

  for (const beat of scene.beats) {
    for (const action of beat.actions) {
      if (action.verb === 'sfx') continue

      const targets = action.verb === 'connect' ? [action.from, action.to] : [action.target]

      for (const target of targets) {
        if (!elements.has(target)) {
          findings.push({
            code: 'UNKNOWN_TARGET',
            severity: 'error',
            at: `${at}.beats.${beat.id}`,
            message: `Beat "${beat.id}" acts on "${target}", which scene "${scene.id}" does not define.`,
            fix: `Add an element with id "${target}" to this scene, or change the action to target one of: ${[...elements.keys()].join(', ') || 'none exist'}.`,
          })
        }
      }

      if (action.verb === 'move' && action.to !== 'base') {
        const element = elements.get(action.target)
        if (element && !(action.to in element.poses)) {
          // Falls back to rest at runtime, so the lesson plays and the move simply does
          // nothing — invisible unless somebody watches for it.
          findings.push({
            code: 'UNKNOWN_POSE',
            severity: 'error',
            at: `${at}.beats.${beat.id}`,
            message: `Beat "${beat.id}" moves "${action.target}" to the pose "${action.to}", which it does not define.`,
            fix: `Add a pose named "${action.to}" to element "${action.target}", or move to one of: ${Object.keys(element.poses).join(', ') || 'base'}.`,
          })
        }
      }
    }
  }
}

/**
 * Cue integrity, in both directions.
 *
 * A beat whose cue is never spoken never fires — the element stays hidden and the lesson
 * plays on without it. A cue spoken with no beat is a silent gap where the author intended
 * something. Neither shows up as an error at runtime; both make a worse lesson.
 */
function checkCueIntegrity(
  scene: Scene,
  at: string,
  bundles: readonly LocaleBundle[],
  findings: Finding[],
): void {
  if (scene.beats.length === 0) return

  const beatCues = new Set(scene.beats.map((b) => b.cue))

  for (const bundle of bundles) {
    const spoken = new Set<string>()

    for (const slot of scene.narrations) {
      const narration = bundle.narration[slot.ref]
      if (!narration) continue
      for (const cue of cueNames(narration.script)) spoken.add(cue)
    }

    // Only checked when the scene actually has narration: a silent scene has nothing to
    // sync against, and its beats fall back to even spacing by design.
    if (spoken.size === 0) continue

    for (const beat of scene.beats) {
      if (!spoken.has(beat.cue)) {
        findings.push({
          code: 'CUE_NEVER_SPOKEN',
          severity: 'error',
          at: `${at}.beats.${beat.id}`,
          message: `Beat "${beat.id}" waits for cue "${beat.cue}", which the ${bundle.locale} narration never says.`,
          fix: `Add [[cue:${beat.cue}]] to the narration of scene "${scene.id}" in ${bundle.locale}, at the moment this beat should fire.`,
        })
      }
    }

    for (const cue of spoken) {
      if (!beatCues.has(cue)) {
        findings.push({
          code: 'CUE_WITHOUT_BEAT',
          severity: 'warn',
          at: `${at}.narration`,
          message: `The ${bundle.locale} narration marks cue "${cue}", but no beat responds to it.`,
          fix: `Add a beat with cue "${cue}" to scene "${scene.id}", or remove [[cue:${cue}]] from the narration.`,
        })
      }
    }
  }
}

/**
 * Every key a document references must exist in every locale it declares.
 *
 * A missing key is not a crash — it renders as a blank or as the raw key, which is exactly
 * the kind of defect that ships. It also tends to affect only the locale nobody on the team
 * reads.
 */
function checkBundleCoverage(
  document: ExplainerDocument,
  bundles: readonly LocaleBundle[],
  findings: Finding[],
): void {
  const byLocale = new Map(bundles.map((b) => [b.locale, b]))

  for (const locale of document.locales) {
    const bundle = byLocale.get(locale)
    if (!bundle) {
      findings.push({
        code: 'MISSING_BUNDLE',
        severity: 'error',
        at: `locales.${locale}`,
        message: `The document declares the locale "${locale}" but no bundle was supplied for it.`,
        fix: `Provide a bundle for "${locale}", or remove it from the document's locales.`,
      })
      continue
    }

    for (const key of collectStringKeys(document)) {
      if (!(key in bundle.strings)) {
        findings.push({
          code: 'MISSING_STRING',
          severity: 'error',
          at: `strings.${key}`,
          message: `The ${locale} bundle has no text for "${key}".`,
          fix: `Add a "${key}" entry to the ${locale} bundle's strings.`,
        })
      }
    }

    for (const [sceneIndex, scene] of document.scenes.entries()) {
      for (const slot of scene.narrations) {
        if (!(slot.ref in bundle.narration)) {
          findings.push({
            code: 'MISSING_NARRATION',
            severity: 'error',
            at: `scenes.${sceneIndex}.narrations.${slot.ref}`,
            message: `The ${locale} bundle has no narration "${slot.ref}".`,
            fix: `Add a "${slot.ref}" entry to the ${locale} bundle's narration, or remove it from scene "${scene.id}".`,
          })
        }
      }
    }
  }
}

/**
 * Every string key a document references.
 *
 * Element content is `unknown` by design — its shape belongs to the registered element type
 * — so this walks for the `key` convention rather than knowing each content schema. That is
 * an honest limit: a plugin using a different field for its text will not have its keys
 * checked here, and should validate them in its own registration.
 */
export function collectStringKeys(document: ExplainerDocument): Set<string> {
  const keys = new Set<string>([document.meta.title])

  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (typeof value !== 'object' || value === null) return

    const record = value as Record<string, unknown>
    if (typeof record['key'] === 'string') keys.add(record['key'])
    for (const nested of Object.values(record)) walk(nested)
  }

  for (const scene of document.scenes) {
    for (const element of scene.elements) walk(element.content)
    if (scene.gate) {
      keys.add(scene.gate.prompt)
      if (scene.gate.feedback.correct) keys.add(scene.gate.feedback.correct)
      if (scene.gate.feedback.incorrect) keys.add(scene.gate.feedback.incorrect)
      walk(scene.gate.question)
    }
  }

  return keys
}
