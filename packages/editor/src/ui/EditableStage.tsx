// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { frame } from '@bingoo.ai/explainer-core'
import { Stage } from '@bingoo.ai/explainer-react'
import { useMemo, type JSX } from 'react'
import { useEditor, useStore } from './context.js'
import { useRender } from './render.js'

/**
 * The stage, with the selection layer over it.
 *
 * Selecting is done by clicking the thing itself. The alternative — a tree of element ids in
 * a side panel — is how an editor ends up requiring you to know what `el-7f3a` looks like
 * before you can change it.
 *
 * The hit targets come from the same `RenderModel` that drew the frame, so a box is exactly
 * where the element is at this instant. Anything derived separately drifts, and a box that
 * is close but not right is worse than none: you click a caption and select the diagram
 * behind it.
 */

export interface EditableStageProps {
  /** Playhead, in seconds from the start of the active scene. */
  readonly t: number
}

export function EditableStage({ t }: EditableStageProps): JSX.Element {
  const store = useStore()
  const { ui } = useEditor()
  const { program, profiles, painters, theme } = useRender()

  const slot = program.slots.find((candidate) => candidate.scene.id === ui.activeSceneId) ?? program.slots[0]
  const at = (slot?.start ?? 0) + t

  const model = useMemo(() => frame(program, at), [program, at])

  const aspectRatio =
    program.canvas.height === 0 ? '16 / 9' : `${program.canvas.width} / ${program.canvas.height}`

  return (
    <div className="xse-stagebox" style={{ ['--xse-aspect' as string]: aspectRatio }}>
      <Stage model={model} painters={painters} profiles={profiles} theme={theme} backdrop="paper" captions />

      {/* One button per element on screen. Rendered after the stage so it takes the clicks,
          and transparent so it takes nothing else. */}
      {model.items.map((item) => {
        const box = model.rects[item.id]
        if (!box) return null

        return (
          <button
            key={item.id}
            type="button"
            className="xse-hit"
            aria-pressed={ui.selection?.elementId === item.id}
            aria-label={`Select ${item.type}`}
            style={{
              left: `${((box.x / program.canvas.width) * 100).toFixed(3)}%`,
              top: `${((box.y / program.canvas.height) * 100).toFixed(3)}%`,
              width: `${((box.width / program.canvas.width) * 100).toFixed(3)}%`,
              height: `${((box.height / program.canvas.height) * 100).toFixed(3)}%`,
            }}
            onClick={() => {
              store.select({ sceneId: slot?.scene.id ?? '', elementId: item.id })
            }}
          />
        )
      })}
    </div>
  )
}
