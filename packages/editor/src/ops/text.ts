// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { LocaleBundle, Narration } from '@bingoo.ai/explainer-core'
import { KernelError } from '@bingoo.ai/explainer-kernel'
import { requireString, type EditOp, type OpRegistry, type Workspace } from '../op.js'

/**
 * Operations on words: the phrases elements display, and the lines the narrator speaks.
 *
 * These live in locale bundles rather than in the document, because structure and language
 * are orthogonal (R4) — one lesson, many languages, the same scenes. That separation is what
 * makes translation possible, and it is also why these operations exist: without them, the
 * commonest edit in the editor would be the one thing undo could not take back.
 *
 * Every operation names its locale. There is no "current language" here — a store has one,
 * an operation must not, or an edit replayed from a history file lands in whichever language
 * happened to be open.
 */

export function registerTextOps(registry: OpRegistry): void {
  registry.register('text.set', (workspace, op) => {
    const locale = requireString(op, 'locale')
    const key = requireString(op, 'key')
    const bundle = bundleFor(workspace, locale)
    const previous = bundle.strings[key]
    const text = typeof op['text'] === 'string' ? op['text'] : ''

    return {
      workspace: withBundle(workspace, locale, { ...bundle, strings: { ...bundle.strings, [key]: text } }),
      // A key that did not exist is restored by removing it, not by writing an empty string:
      // an empty string is a phrase the author chose, and the quality gate treats the two
      // differently.
      inverse:
        previous === undefined
          ? { kind: 'text.clear', locale, key }
          : { kind: 'text.set', locale, key, text: previous },
    }
  })

  registry.register('text.clear', (workspace, op) => {
    const locale = requireString(op, 'locale')
    const key = requireString(op, 'key')
    const bundle = bundleFor(workspace, locale)
    const previous = bundle.strings[key]

    const strings = { ...bundle.strings }
    delete strings[key]

    return {
      workspace: withBundle(workspace, locale, { ...bundle, strings }),
      inverse:
        previous === undefined
          ? { kind: 'text.clear', locale, key }
          : { kind: 'text.set', locale, key, text: previous },
    }
  })

  registry.register('narration.setScript', (workspace, op) => {
    const locale = requireString(op, 'locale')
    const ref = requireString(op, 'ref')
    const bundle = bundleFor(workspace, locale)
    const previous = bundle.narration[ref]
    const script = typeof op['script'] === 'string' ? op['script'] : ''

    // Rewriting the script invalidates the recording and the word timings that came from it.
    // Keeping them would leave visuals cued to words that are no longer spoken — the lesson
    // would play, out of step, with nothing to say it had gone wrong.
    const next: Narration = {
      ...(previous ?? EMPTY_NARRATION),
      script,
      marks: [],
      words: [],
    }
    delete (next as { audioUrl?: string }).audioUrl
    delete (next as { durationSeconds?: number }).durationSeconds

    return {
      workspace: withBundle(workspace, locale, {
        ...bundle,
        narration: { ...bundle.narration, [ref]: next },
      }),
      inverse:
        previous === undefined
          ? { kind: 'narration.remove', locale, ref }
          : { kind: 'narration.restore', locale, ref, narration: previous },
    }
  })

  /** Restores a whole narration, timings included. Only ever produced as an inverse. */
  registry.register('narration.restore', (workspace, op) => {
    const locale = requireString(op, 'locale')
    const ref = requireString(op, 'ref')
    const bundle = bundleFor(workspace, locale)
    const previous = bundle.narration[ref]
    const narration = op['narration'] as Narration

    return {
      workspace: withBundle(workspace, locale, {
        ...bundle,
        narration: { ...bundle.narration, [ref]: narration },
      }),
      inverse:
        previous === undefined
          ? { kind: 'narration.remove', locale, ref }
          : { kind: 'narration.restore', locale, ref, narration: previous },
    }
  })

  registry.register('narration.remove', (workspace, op) => {
    const locale = requireString(op, 'locale')
    const ref = requireString(op, 'ref')
    const bundle = bundleFor(workspace, locale)
    const previous = bundle.narration[ref]

    const narration = { ...bundle.narration }
    delete narration[ref]

    return {
      workspace: withBundle(workspace, locale, { ...bundle, narration }),
      inverse:
        previous === undefined
          ? { kind: 'narration.remove', locale, ref }
          : { kind: 'narration.restore', locale, ref, narration: previous },
    }
  })
}

const EMPTY_NARRATION: Narration = { script: '', marks: [], words: [] }

function bundleFor(workspace: Workspace, locale: string): LocaleBundle {
  const bundle = workspace.bundles[locale]
  if (!bundle) {
    throw new KernelError('REGISTRY_UNKNOWN_ID', 'This locale has no bundle to edit.', {
      at: locale,
      hint: `Loaded locales: ${Object.keys(workspace.bundles).join(', ') || 'none'}.`,
    })
  }
  return bundle
}

function withBundle(workspace: Workspace, locale: string, bundle: LocaleBundle): Workspace {
  return { ...workspace, bundles: { ...workspace.bundles, [locale]: bundle } }
}

export type { EditOp }
