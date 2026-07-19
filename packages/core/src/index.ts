// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The Explainer Studio engine: the `explainer/v1` document format and the profiles that
 * decide how it renders.
 *
 * Pure — no platform, no I/O, no clock, no randomness (R7). Everything it needs arrives as
 * an argument, which is what makes `frame(program, t)` reproducible and the whole engine
 * testable without a browser.
 */

export {
  DOCUMENT_VERSION,
  beat,
  documentMeta,
  element,
  explainerDocument,
  gate,
  layoutSpec,
  narrationSlot,
  provenance,
  scene,
  visualAction,
  type Beat,
  type Element,
  type ExplainerDocument,
  type Gate,
  type LayoutSpec,
  type Scene,
  type VisualAction,
  type VisualVerb,
} from './schema/document.js'

export {
  cueMark,
  localeBundle,
  narration,
  wordTiming,
  type LocaleBundle,
  type Narration,
} from './schema/locale.js'

export {
  BASE_POSE,
  aspect,
  elementId,
  flow,
  locale,
  pose,
  registryKey,
  sceneId,
  stringKey,
  styleTokens,
  type Flow,
  type Pose,
  type StyleTokens,
} from './schema/primitives.js'

export {
  assertBundle,
  assertDocument,
  formatIssues,
  parseBundle,
  parseDocument,
  type ParseIssue,
  type ParseResult,
} from './schema/parse.js'

export {
  builtInProfiles,
  defaultLayout,
  defaultPins,
  defaultSpeech,
  defaultType,
  houseTiming,
} from './profiles/defaults.js'

export {
  createProfileRegistry,
  getProfile,
  listProfiles,
  profileDescriptor,
  registerProfile,
  resolveProfiles,
  type CreateProfileRegistryOptions,
  type ProfileDescriptor,
  type ProfileRegistry,
  type ResolvedProfiles,
} from './profiles/registry.js'

export {
  anyProfile,
  formatProfileRef,
  layoutProfile,
  parseProfileRef,
  profilePins,
  profileRef,
  speechProfile,
  timingProfile,
  typeProfile,
  type AnyProfile,
  type Easing,
  type LayoutProfile,
  type ProfileKind,
  type ProfilePins,
  type ProfileRef,
  type SpeechMetrics,
  type SpeechProfile,
  type TimingProfile,
  type TypeProfile,
} from './profiles/schema.js'

export {
  createTemplateRegistry,
  registerTemplate,
  builtInTemplates,
  slotDefinition,
  templateDescriptor,
  type SlotDefinition,
  type TemplateDescriptor,
  type TemplateRegistry,
} from './layout/template.js'

export {
  resolveLayout,
  type LayoutIssue,
  type LayoutIssueCode,
  type PlacedElement,
  type Rect,
  type ResolveLayoutOptions,
  type ResolvedLayout,
} from './layout/resolve.js'

export {
  charBudget,
  glyphWidthFor,
  resolveFontSize,
  spokenSeconds,
  type CharBudgetOptions,
  type FontSize,
} from './layout/type-scale.js'

export { LINEAR, clamp01, ease } from './motion/easing.js'

export { composePose, hiddenPose, lerp, lerpPose, restingPose } from './motion/pose.js'

export {
  builtInEmphasis,
  createEmphasisRegistry,
  emphasisAt,
  emphasisDescriptor,
  type EmphasisDescriptor,
  type EmphasisRegistry,
  type Keyframe,
} from './motion/emphasis.js'

export {
  compileScene,
  type CompileSceneOptions,
  type SceneTimeline,
  type SoundCue,
} from './motion/choreograph.js'
