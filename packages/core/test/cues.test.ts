// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { captionText, cueNames, stripCues } from '../src/index.js'

describe('stripCues', () => {
  it('removes a marker and leaves the words', () => {
    expect(stripCues('[[cue:c1]]Plants make food.')).toBe('Plants make food.')
  })

  it('removes every marker in a line', () => {
    expect(stripCues('[[cue:a]]One [[cue:b]]two [[cue:c]]three')).toBe('One two three')
  })

  it('leaves a script with no markers untouched', () => {
    expect(stripCues('Nothing to strip here')).toBe('Nothing to strip here')
  })

  it('does not touch square brackets that are not markers', () => {
    // A lesson about notation may legitimately contain brackets.
    expect(stripCues('The set [1, 2, 3] and [[not a cue]]')).toBe('The set [1, 2, 3] and [[not a cue]]')
  })
})

describe('captionText', () => {
  it('collapses the gap a stripped marker leaves behind', () => {
    // Stripping alone leaves doubled spaces at every beat, which a viewer sees.
    expect(captionText('[[cue:c1]]One [[cue:c2]] two')).toBe('One two')
  })

  it('trims the ends', () => {
    expect(captionText('  [[cue:c1]] Hello  ')).toBe('Hello')
  })
})

describe('cueNames', () => {
  it('lists the cues a script declares, in order', () => {
    expect(cueNames('[[cue:intro]]Hi [[cue:point-1]]there')).toEqual(['intro', 'point-1'])
  })

  it('returns nothing for a script with no cues', () => {
    expect(cueNames('plain narration')).toEqual([])
  })
})

describe('pathological input', () => {
  // Regression: the marker body was [^\]]*, which could swallow a following `[[cue:`
  // sequence and forced quadratic backtracking. CodeQL flagged it as a polynomial ReDoS.
  //
  // A narration script is not trusted input — it can come from a model, from an imported
  // lesson, or from a hand-edited file — so a parser that can be stalled by one is a real
  // denial of service.
  //
  // The timeout is the assertion, for the same reason as the kernel's interpolation test:
  // measuring elapsed time needs a platform clock this package cannot see, and wall-clock
  // thresholds are flaky on shared runners. Measured here: ~1900ms on the old pattern,
  // under 2ms on the fixed one.
  const hostile = '[[cue:'.repeat(30_000)

  it('does not backtrack quadratically on repeated unterminated markers', () => {
    expect(stripCues(hostile)).toBe(hostile)
  }, 1500)

  it('stays linear when building a caption too', () => {
    expect(captionText(hostile)).toBe(hostile)
  }, 1500)

  it('stays linear when listing cue names', () => {
    expect(cueNames(hostile)).toEqual([])
  }, 1500)

  it('still handles a long well-formed script', () => {
    const long = '[[cue:c]]word '.repeat(5_000)
    expect(cueNames(long)).toHaveLength(5_000)
  }, 1500)
})
