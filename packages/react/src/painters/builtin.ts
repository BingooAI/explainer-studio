// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { createPainterRegistry, registerPainter, type PainterRegistry } from './registry.js'
import { TextPainter } from './text.js'
import { ShapePainter } from './shape.js'
import { ImagePainter } from './image.js'
import { StrokePainter } from './stroke.js'
import { ListPainter } from './list.js'
import { TablePainter } from './table.js'
import { ChartPainter } from './chart/index.js'
import { StatPainter } from './stat.js'
import { QuotePainter } from './quote.js'

/**
 * The built-in painters.
 *
 * Registration is the only thing this file does. Every painter is a separate module, so
 * adding one changes nothing that already works — which is the same property a plugin gets
 * (R1), rather than a privilege the built-ins have and contributors do not.
 */
export function createBuiltInPainters(): PainterRegistry {
  const registry = createPainterRegistry()

  registerPainter(registry, { id: 'text', label: 'Text' }, TextPainter)
  registerPainter(registry, { id: 'stroke', label: 'Drawn stroke' }, StrokePainter)
  registerPainter(registry, { id: 'shape', label: 'Shape' }, ShapePainter)
  registerPainter(registry, { id: 'image', label: 'Image' }, ImagePainter)
  registerPainter(registry, { id: 'list', label: 'List' }, ListPainter)
  registerPainter(registry, { id: 'table', label: 'Table' }, TablePainter)
  registerPainter(registry, { id: 'chart', label: 'Chart' }, ChartPainter)
  registerPainter(registry, { id: 'stat', label: 'Statistic' }, StatPainter)
  registerPainter(registry, { id: 'quote', label: 'Quotation' }, QuotePainter)

  return registry
}

export {
  ChartPainter,
  ImagePainter,
  ListPainter,
  QuotePainter,
  ShapePainter,
  StatPainter,
  StrokePainter,
  TablePainter,
  TextPainter,
}
