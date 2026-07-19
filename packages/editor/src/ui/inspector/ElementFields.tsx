// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Element, Scene } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import { useEditor, useStore } from '../context.js'
import { NumberField, SelectField, Segmented, TextField } from '../fields.js'
import { useRender } from '../render.js'

/**
 * Properties of the selected element.
 *
 * Two groups, in the order an author thinks in: what it says, then where it sits. Position
 * is expressed as region, order and alignment — never as coordinates (R6), because a lesson
 * has to lay itself out again at every aspect and a number typed into an x field cannot.
 */

export function ElementFields({
  scene,
  element,
}: {
  readonly scene: Scene
  readonly element: Element
}): JSX.Element {
  const store = useStore()
  const { ui, bundles } = useEditor()
  const { templates } = useRender()

  const bundle = bundles[ui.locale]
  const contentKey = (element.content as { key?: string }).key
  const phrase = contentKey === undefined ? undefined : (bundle?.strings[contentKey] ?? '')

  // Regions come from the template's slots for the aspect being edited, falling back to
  // whatever the scene already uses — a document may name a template this deployment has not
  // registered, and an inspector that threw would make that document uneditable.
  const regions = templates.has(scene.layout.template)
    ? (templates.descriptorOf(scene.layout.template).slots[ui.aspect] ?? []).map((slot) => slot.name)
    : Object.keys(scene.layout.regions)
  const currentRegion =
    Object.entries(scene.layout.regions).find(([, ids]) => ids.includes(element.id))?.[0] ?? element.region

  const setFlow = (patch: Partial<Element['flow']>): void => {
    store.dispatch({
      kind: 'element.setFlow',
      sceneId: scene.id,
      id: element.id,
      flow: { ...element.flow, ...patch },
    })
  }

  const setStyle = (patch: Partial<Element['style']>): void => {
    store.dispatch({
      kind: 'element.setStyle',
      sceneId: scene.id,
      id: element.id,
      style: pruned({ ...element.style, ...patch }),
    })
  }

  return (
    <>
      {contentKey !== undefined && phrase !== undefined ? (
        <TextField
          label="Words"
          value={phrase}
          multiline
          placeholder="What this element says"
          hint={`Stored in ${ui.locale.toUpperCase()}. Other languages keep their own wording.`}
          onChange={(text) => {
            // Coalesced on the key, so a sentence typed out is one undo step rather than
            // forty. `endCoalesce` on blur closes the run.
            store.dispatch(
              { kind: 'text.set', locale: ui.locale, key: contentKey, text },
              `text:${contentKey}`,
            )
          }}
          onCommit={() => {
            store.endCoalesce()
          }}
        />
      ) : (
        <p className="xse-hint">This element type has no words to edit here.</p>
      )}

      <SelectField
        label="Region"
        value={currentRegion}
        choices={regions.map((region) => ({ value: region, label: region }))}
        onChange={(region) => {
          store.dispatch({ kind: 'element.move', sceneId: scene.id, id: element.id, region })
        }}
        hint="Which part of the template it sits in. The template decides where that is at each aspect."
      />

      <Segmented
        label="Align"
        value={element.flow.align}
        choices={ALIGNMENTS}
        onChange={(align) => {
          setFlow({ align: align as Element['flow']['align'] })
        }}
      />

      <div className="xse-row">
        <NumberField
          label="Order"
          value={element.flow.order}
          min={0}
          onChange={(order) => {
            setFlow({ order })
          }}
        />
        <NumberField
          label="Grow"
          value={element.flow.grow}
          min={0}
          max={10}
          onChange={(grow) => {
            setFlow({ grow })
          }}
        />
      </div>
      <p className="xse-hint">Order sorts within the region; grow shares out the space left over.</p>

      <SelectField
        label="Colour"
        value={element.style.color ?? ''}
        allowEmpty="Theme default"
        choices={COLOUR_TOKENS}
        onChange={(color) => {
          setStyle({ color: color === '' ? undefined : color })
        }}
        hint="A theme token, not a hex value — so a lesson restyles with its theme."
      />

      <Segmented
        label="Weight"
        value={element.style.weight ?? 'regular'}
        choices={WEIGHTS}
        onChange={(weight) => {
          setStyle({ weight: weight as Element['style']['weight'] })
        }}
      />

      <button
        type="button"
        className="xse-btn is-danger"
        onClick={() => {
          store.dispatch({ kind: 'element.remove', sceneId: scene.id, id: element.id })
        }}
      >
        Delete element
      </button>
    </>
  )
}

const ALIGNMENTS = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Centre' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Fill' },
] as const

const WEIGHTS = [
  { value: 'regular', label: 'Regular' },
  { value: 'medium', label: 'Medium' },
  { value: 'bold', label: 'Bold' },
] as const

/**
 * Theme tokens an author can pick from.
 *
 * Names, not colours: a lesson that hard-codes `#2563eb` looks wrong the moment it is opened
 * under a different theme or in high contrast (R8). A theme that adds a token can extend
 * this by passing its own list — the field is driven by data, not by a switch.
 */
const COLOUR_TOKENS = [
  { value: 'ink', label: 'Ink' },
  { value: 'muted', label: 'Muted' },
  { value: 'accent', label: 'Accent' },
  { value: 'positive', label: 'Positive' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
] as const

/**
 * Drops keys set back to "no opinion".
 *
 * `{ color: undefined }` and `{}` mean the same thing to the renderer and different things
 * to a deep-equality check — which is what the undo round-trip test uses. Leaving the key in
 * makes an inverse that restores something equivalent but not equal, and the test that
 * guards undo would fail for a reason that has nothing to do with undo.
 */
function pruned(style: Element['style']): Element['style'] {
  return Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined))
}
