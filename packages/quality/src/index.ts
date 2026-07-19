// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The deterministic quality gates.
 *
 * This package is the reason the product can be trusted: the checker is code, never a
 * model (R2). A weaker model produces a worse lesson, never an invalid one — and that
 * property only holds because nothing in here asks a model anything.
 *
 * It also has a boundary worth stating plainly. These gates check that a lesson is
 * *structurally* sound: it fits, it syncs, it has the shape of a lesson. They do not check
 * whether anything it says is true. A false statement inside a structurally perfect lesson
 * passes every gate here.
 */

export {
  errorsOf,
  repairInstructions,
  result,
  type Finding,
  type GateResult,
  type Severity,
} from './finding.js'

export { collectStringKeys, lintDocument, type LintOptions } from './lint.js'

export { checkScene, type CheckSceneOptions } from './scene.js'

export {
  arcDescriptor,
  arcPhase,
  checkLesson,
  createArcRegistry,
  defaultArc,
  type ArcDescriptor,
  type ArcPhase,
  type ArcRegistry,
  type CheckLessonOptions,
} from './arc.js'
