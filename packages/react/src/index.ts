// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The React renderer.
 *
 * It paints `RenderModel` and owns no timing, layout or easing — those belong to the
 * engine, so this renderer and a headless MP4 render cannot disagree (R3).
 */

export { Stage, type StageProps } from './Stage.js'

export { ExplainerPlayer, type ExplainerPlayerProps } from './ExplainerPlayer.js'

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

export { ImagePainter, ShapePainter, TextPainter, createBuiltInPainters } from './painters/builtin.js'

export { anchorFor, transformFor } from './transform.js'
