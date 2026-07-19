// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { JSX } from 'react'
import { useActiveScene, useEditor } from './context.js'
import { ElementFields } from './inspector/ElementFields.js'
import { SceneFields } from './inspector/SceneFields.js'

/**
 * The inspector: what the selection is, and how to change it.
 *
 * Selecting nothing shows the scene, because that is what you are looking at. An inspector
 * that goes blank when nothing is selected wastes a third of the window most of the time and
 * teaches people to click something before they can do anything.
 */

export function Inspector(): JSX.Element {
  const { ui } = useEditor()
  const { scene } = useActiveScene()

  const element =
    ui.selection?.elementId === undefined
      ? undefined
      : scene?.elements.find((candidate) => candidate.id === ui.selection?.elementId)

  return (
    <aside className="xse-panel" aria-label="Properties">
      <div className="xse-panel-head">{element ? `${element.type} · properties` : 'Scene'}</div>
      <div className="xse-panel-body">
        {!scene ? (
          <p className="xse-empty">This lesson has no scenes yet.</p>
        ) : element ? (
          <ElementFields scene={scene} element={element} />
        ) : (
          <SceneFields scene={scene} />
        )}
      </div>
    </aside>
  )
}
