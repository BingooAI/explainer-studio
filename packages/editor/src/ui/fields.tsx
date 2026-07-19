// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { useId, type JSX, type ReactNode } from 'react'

/**
 * The inspector's building blocks.
 *
 * Small on purpose. An inspector grows a field every time the schema does, and the way that
 * ends up as a two-thousand-line file is one component holding every field inline. Here a
 * field is a label bound to a control, and a panel is a list of them — so adding one is
 * adding a line, not extending a switch.
 *
 * Every control is labelled and focusable. An editor is used with a keyboard by people who
 * are looking at the stage rather than at the panel.
 */

export function Field({
  label,
  hint,
  children,
}: {
  readonly label: string
  readonly hint?: string
  readonly children: (id: string) => ReactNode
}): JSX.Element {
  const id = useId()

  return (
    <>
      <label className="xse-field" htmlFor={id}>
        <span>{label}</span>
        {children(id)}
      </label>
      {hint === undefined ? null : <p className="xse-hint">{hint}</p>}
    </>
  )
}

export function TextField({
  label,
  value,
  onChange,
  onCommit,
  placeholder,
  multiline = false,
  hint,
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  /** Called when editing stops, so the store can end a coalescing run. */
  readonly onCommit?: () => void
  readonly placeholder?: string
  readonly multiline?: boolean
  readonly hint?: string
}): JSX.Element {
  return (
    <Field label={label} {...(hint === undefined ? {} : { hint })}>
      {(id) =>
        multiline ? (
          <textarea
            id={id}
            className="xse-textarea"
            value={value}
            placeholder={placeholder ?? ''}
            onChange={(event) => {
              onChange(event.target.value)
            }}
            onBlur={onCommit ?? undefined}
          />
        ) : (
          <input
            id={id}
            className="xse-input"
            value={value}
            placeholder={placeholder ?? ''}
            onChange={(event) => {
              onChange(event.target.value)
            }}
            onBlur={onCommit ?? undefined}
          />
        )
      }
    </Field>
  )
}

export interface Choice {
  readonly value: string
  readonly label: string
}

export function SelectField({
  label,
  value,
  choices,
  onChange,
  hint,
  allowEmpty,
}: {
  readonly label: string
  readonly value: string
  readonly choices: readonly Choice[]
  readonly onChange: (value: string) => void
  readonly hint?: string
  /** Offers a blank option, for a setting whose absence means something. */
  readonly allowEmpty?: string
}): JSX.Element {
  return (
    <Field label={label} {...(hint === undefined ? {} : { hint })}>
      {(id) => (
        <select
          id={id}
          className="xse-input"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        >
          {allowEmpty === undefined ? null : <option value="">{allowEmpty}</option>}
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
}: {
  readonly label: string
  readonly value: number
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly onChange: (value: number) => void
  readonly hint?: string
}): JSX.Element {
  return (
    <Field label={label} {...(hint === undefined ? {} : { hint })}>
      {(id) => (
        <input
          id={id}
          type="number"
          className="xse-input"
          value={value}
          min={min ?? undefined}
          max={max ?? undefined}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value)
            // An empty box parses as NaN, which would be written straight into the document
            // and fail validation on save with an error naming a field the author never
            // typed in. Ignoring it leaves the last good value in place.
            if (!Number.isNaN(next)) onChange(next)
          }}
        />
      )}
    </Field>
  )
}

export function Segmented({
  label,
  value,
  choices,
  onChange,
}: {
  readonly label: string
  readonly value: string
  readonly choices: readonly Choice[]
  readonly onChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="xse-field">
      <span>{label}</span>
      <div className="xse-seg" role="group" aria-label={label}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={choice.value === value}
            onClick={() => {
              onChange(choice.value)
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  )
}
