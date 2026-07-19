// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The React renderer.
 *
 * It paints `RenderModel` and owns no timing, layout or easing — those belong to the
 * engine, so this renderer and a headless MP4 render cannot disagree (R3).
 */

export { Stage, type StageProps } from './Stage.js'
export { DEFAULT_SKIP_SECONDS, DEFAULT_SPEEDS, PlayerBar, type PlayerBarProps } from './chrome/PlayerBar.js'
export { ChapterMenu, type ChapterMenuProps } from './chrome/ChapterMenu.js'
export { ScrubPreview, type ScrubPreviewProps } from './chrome/ScrubPreview.js'
export { clock, sceneTitle } from './chrome/format.js'
export { Timeline, type TimelineProps } from './chrome/Timeline.js'
export { ensureStyles, styles, PREFIX } from './chrome/styles.js'
export { useSpeechClock, type SpeechOptions } from './speech.js'
export { Backdrop, type BackdropKind, type BackdropProps } from './chrome/Backdrop.js'
export { ExplainerPlayer, type ExplainerPlayerProps, type PlayerStatus } from './ExplainerPlayer.js'
export { usePlayer, type AudioClock, type Player, type UsePlayerOptions } from './usePlayer.js'

export {
  createPainterRegistry,
  painterDescriptor,
  registerPainter,
  type Painter,
  type PainterDescriptor,
  type PainterProps,
  type PainterRegistry,
} from './painters/registry.js'

export {
  ChartPainter,
  ConnectorPainter,
  DiagramPainter,
  ImagePainter,
  ListPainter,
  QuotePainter,
  ShapePainter,
  StatPainter,
  StickPainter,
  StrokePainter,
  TablePainter,
  TextPainter,
  createBuiltInPainters,
} from './painters/builtin.js'

export { centreOf, edgePoint, type Point } from './painters/connector.js'
export { type FaceExpression } from './painters/stick.js'
export { Marker, type MarkerProps, type MarkerStyle } from './painters/marker.js'
export { formatValue, niceMax, scaleOf, type ChartScale, type Series } from './painters/chart/scale.js'

export { CaptionBand, type CaptionBandProps } from './chrome/CaptionBand.js'
export { CARD_SLOTS, SlotCard, type SlotCardProps } from './chrome/SlotCard.js'

export {
  CHART_PALETTE,
  color,
  createThemeRegistry,
  defaultTheme,
  themeDescriptor,
  type ThemeRegistry,
  type ThemeTokens,
} from './theme/tokens.js'

export { charsPerLine, fitText, widthOf, wrapText, type FitResult, type Metrics } from './text/wrap.js'
export { anchorFor, transformFor } from './transform.js'
