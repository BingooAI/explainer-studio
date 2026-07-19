// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import {
  buildProgram,
  createEmphasisRegistry,
  createProfileRegistry,
  createTemplateRegistry,
  resolveProfiles,
  type EmphasisRegistry,
  type LocaleBundle,
  type Program,
  type ResolvedProfiles,
  type TemplateRegistry,
} from '@bingoo.ai/explainer-core'
import {
  createBuiltInPainters,
  defaultTheme,
  type PainterRegistry,
  type ThemeTokens,
} from '@bingoo.ai/explainer-react'
import { createContext, useContext, useMemo, type JSX, type ReactNode } from 'react'
import { buildProject, type Project } from '../clips.js'
import { useEditor } from './context.js'

/**
 * Everything needed to draw the document, in one place.
 *
 * The editor renders the lesson constantly — the stage, a thumbnail per scene, the clip
 * model behind the timeline — and every one of those needs the same registries. Building
 * them per component would mean four template registries with four sets of built-ins, and
 * a host that registered a custom template would find it worked in the stage and not in
 * the thumbnails.
 *
 * Registries are supplied by the host or defaulted here, never module state (R1, R16).
 */

export interface StudioRegistries {
  readonly templates?: TemplateRegistry
  readonly emphasis?: EmphasisRegistry
  readonly painters?: PainterRegistry
  readonly theme?: ThemeTokens
  readonly profiles?: ResolvedProfiles
}

export interface RenderContextValue {
  readonly program: Program
  readonly project: Project
  readonly profiles: ResolvedProfiles
  readonly painters: PainterRegistry
  readonly theme: ThemeTokens
  readonly templates: TemplateRegistry
  readonly emphasis: EmphasisRegistry
  readonly bundle: LocaleBundle
}

const RenderContext = createContext<RenderContextValue | null>(null)

export function RenderProvider({
  registries,
  children,
}: {
  readonly registries: StudioRegistries
  readonly children: ReactNode
}): JSX.Element {
  const { document, bundles, ui } = useEditor()

  // Registries are stable for the life of the editor. They hold built-ins and any host
  // extensions; rebuilding them on a document change would throw away a plugin's
  // registration on the first keystroke.
  const templates = useMemo(() => registries.templates ?? createTemplateRegistry(), [registries.templates])
  const emphasis = useMemo(() => registries.emphasis ?? createEmphasisRegistry(), [registries.emphasis])
  const painters = useMemo(() => registries.painters ?? createBuiltInPainters(), [registries.painters])
  const theme = registries.theme ?? defaultTheme

  const profiles = useMemo(
    () => registries.profiles ?? resolveProfiles(createProfileRegistry(), document.profiles),
    [registries.profiles, document.profiles],
  )

  const bundle = bundles[ui.locale] ?? bundles[document.locales[0] ?? ''] ?? EMPTY_BUNDLE

  const program = useMemo(
    () => buildProgram(document, bundle, { profiles, templates, emphasis, aspect: ui.aspect }),
    [document, bundle, profiles, templates, emphasis, ui.aspect],
  )

  const project = useMemo(() => buildProject(program), [program])

  const value = useMemo(
    () => ({ program, project, profiles, painters, theme, templates, emphasis, bundle }),
    [program, project, profiles, painters, theme, templates, emphasis, bundle],
  )

  return <RenderContext.Provider value={value}>{children}</RenderContext.Provider>
}

/**
 * A bundle for a locale the document declares but has no strings for yet.
 *
 * Every new locale starts here. Refusing to render would mean adding a language broke the
 * editor until every string was translated, which is the wrong order to work in.
 */
const EMPTY_BUNDLE: LocaleBundle = {
  version: 'explainer-bundle/v1',
  documentId: '',
  locale: 'en',
  strings: {},
  narration: {},
}

export function useRender(): RenderContextValue {
  const value = useContext(RenderContext)
  if (!value) throw new Error('useRender must be used inside a RenderProvider.')
  return value
}
