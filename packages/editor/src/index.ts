// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The editor: the operation layer, and the panels built on it.
 *
 * Every panel here changes a lesson by dispatching an operation, never by mutating a
 * document. That is what makes undo, history and an audit trail work for edits nobody has
 * written yet — a kit that registers its own operation gets all three for free.
 *
 * A host that only needs the operations — a server applying an edit, a script running a
 * migration — should import `@bingoo.ai/explainer-editor/ops` instead. That entry point is
 * pure and pulls in no renderer.
 */

export * from './ops.js'

export { ExplainerStudio, type ExplainerStudioProps } from './ui/Studio.js'
export { TopBar, DEFAULT_ASPECTS, type SaveState, type TopBarProps } from './ui/TopBar.js'
export { SceneStrip } from './ui/SceneStrip.js'
export { TrackTimeline, CLIP_COLORS, type TrackTimelineProps } from './ui/TrackTimeline.js'
export { Inspector } from './ui/Inspector.js'
export { EditableStage, type EditableStageProps } from './ui/EditableStage.js'

export { EditorProvider, useActiveScene, useEditor, useStore } from './ui/context.js'
export { RenderProvider, useRender, type RenderContextValue, type StudioRegistries } from './ui/render.js'
export {
  createEditorStore,
  DEFAULT_ASPECT,
  type CreateStoreOptions,
  type EditorSnapshot,
  type EditorStore,
  type Selection,
  type UIState,
} from './ui/store.js'
export { useScenePlayback, type ScenePlayback } from './ui/useScenePlayback.js'
export { ensureEditorStyles, editorStyles, EDITOR_PREFIX } from './ui/styles.js'
export { generateId, stringKeyFor } from './ui/ids.js'

export { Field, NumberField, SelectField, Segmented, TextField, type Choice } from './ui/fields.js'
