// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { KernelError } from '@bingoo.ai/explainer-kernel'
import { createContext, useContext, useSyncExternalStore, type JSX, type ReactNode } from 'react'
import type { EditorSnapshot, EditorStore } from './store.js'

/**
 * Context is how the panels reach the store, so the layout can be rearranged without
 * threading a document through every intermediate component. The store itself is passed in
 * by the host — never created here as module state, so two editors on one page do not share
 * a history (R16).
 */

const StoreContext = createContext<EditorStore | null>(null)

export function EditorProvider({
  store,
  children,
}: {
  readonly store: EditorStore
  readonly children: ReactNode
}): JSX.Element {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): EditorStore {
  const store = useContext(StoreContext)
  if (!store) {
    throw new KernelError('CONFIG_INVALID', 'This component must be rendered inside an EditorProvider.', {
      at: 'useStore',
      hint: 'Wrap it in <EditorProvider store={createEditorStore(...)}>, or render <ExplainerStudio> which does that for you.',
    })
  }
  return store
}

/** The current state, re-rendering the caller when it changes. */
export function useEditor(): EditorSnapshot {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

/** The scene being edited, and where it sits in the document. */
export function useActiveScene(): {
  readonly index: number
  readonly scene: EditorSnapshot['document']['scenes'][number] | undefined
} {
  const { document, ui } = useEditor()
  const index = document.scenes.findIndex((scene) => scene.id === ui.activeSceneId)
  const resolved = index === -1 ? 0 : index
  return { index: resolved, scene: document.scenes[resolved] }
}
