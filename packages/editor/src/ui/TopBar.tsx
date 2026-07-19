// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX, ReactNode } from 'react'
import { useEditor, useStore } from './context.js'
import { useRender } from './render.js'

/**
 * The top bar: what this lesson is, and the actions that apply to all of it.
 *
 * Undo and redo sit here rather than in a menu because they are pressed more than anything
 * else in an editor, and because their being visible is what makes the rest of the tool safe
 * to explore.
 *
 * Save is the host's business. This bar shows the state the host reports and calls back when
 * asked; it does not know where a lesson goes (R8).
 */

export interface SaveState {
  readonly label: string
  readonly tone: 'idle' | 'saving' | 'saved' | 'error'
}

export interface TopBarProps {
  readonly saveState?: SaveState
  readonly onSave?: () => void
  /** Aspects offered. A deployment that only ever ships portrait should say so. */
  readonly aspects?: readonly string[]
  /** Host actions — preview, export, publish. Rendered at the end of the bar. */
  readonly actions?: ReactNode
}

export const DEFAULT_ASPECTS = ['16:9', '9:16'] as const

export function TopBar({ saveState, onSave, aspects = DEFAULT_ASPECTS, actions }: TopBarProps): JSX.Element {
  const store = useStore()
  const { document, ui, canUndo, canRedo } = useEditor()
  const { program } = useRender()

  const issueCount = program.issues.reduce((total, entry) => total + entry.issues.length, 0)

  return (
    <header className="xse-top">
      <input
        className="xse-title"
        value={document.meta.title}
        aria-label="Lesson title"
        onChange={(event) => {
          store.dispatch({ kind: 'meta.setTitle', title: event.target.value }, 'meta.title')
        }}
        onBlur={() => {
          store.endCoalesce()
        }}
      />

      {onSave ? (
        <button
          type="button"
          className="xse-btn is-primary"
          onClick={onSave}
          disabled={saveState?.tone === 'saving'}
        >
          Save
        </button>
      ) : null}

      {saveState ? (
        <span
          className={`xse-pill${saveState.tone === 'saved' ? ' is-ok' : saveState.tone === 'error' ? ' is-error' : ''}`}
        >
          {saveState.label}
        </span>
      ) : null}

      <span className="xse-spacer" />

      <button
        type="button"
        className="xse-btn is-icon"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => {
          store.undo()
        }}
      >
        ↶
      </button>
      <button
        type="button"
        className="xse-btn is-icon"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => {
          store.redo()
        }}
      >
        ↷
      </button>

      <div className="xse-seg" role="group" aria-label="Aspect">
        {aspects.map((aspect) => (
          <button
            key={aspect}
            type="button"
            aria-pressed={ui.aspect === aspect}
            onClick={() => {
              store.setUI({ aspect })
            }}
          >
            {aspect}
          </button>
        ))}
      </div>

      <select
        className="xse-select"
        value={ui.locale}
        aria-label="Language being edited"
        onChange={(event) => {
          store.setUI({ locale: event.target.value })
        }}
      >
        {document.locales.map((locale) => (
          <option key={locale} value={locale}>
            {locale.toUpperCase()}
          </option>
        ))}
      </select>

      {/* Layout problems, counted. A number that is usually zero is a thing people notice
          when it stops being zero — which is the entire point of showing it. */}
      <span
        className={`xse-pill${issueCount === 0 ? ' is-ok' : ' is-error'}`}
        title="Layout problems in this lesson"
      >
        {issueCount === 0 ? '✓ Layout' : `${String(issueCount)} layout`}
      </span>

      {actions}
    </header>
  )
}
