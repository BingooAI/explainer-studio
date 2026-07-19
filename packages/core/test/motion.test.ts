// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  LINEAR,
  compileScene,
  createEmphasisRegistry,
  ease,
  emphasisAt,
  houseTiming,
  lerpPose,
  restingPose,
  hiddenPose,
  type Easing,
  type Scene,
  type VisualAction,
} from '../src/index.js'

const emphasis = () => createEmphasisRegistry()

const element = (id: string, startVisible = false, poses: Scene['elements'][number]['poses'] = {}) =>
  ({
    id,
    type: 'text',
    region: 'stage',
    flow: { order: 0, grow: 0, align: 'center' as const },
    content: {},
    style: {},
    poses,
    startVisible,
    z: 0,
  }) as Scene['elements'][number]

const sceneOf = (
  elements: Scene['elements'],
  beats: Array<{ id: string; cue: string; actions: VisualAction[] }>,
): Scene => ({
  id: 's1',
  kind: 'exposition',
  layout: { template: 'teach', regions: {}, overrides: {} },
  elements,
  beats,
  narrations: [],
})

const compile = (scene: Scene, cueMarks?: Record<string, number>) =>
  compileScene(scene, {
    timing: houseTiming,
    emphasis: emphasis(),
    estimatedDuration: 10,
    // Omitted rather than set to undefined: with exactOptionalPropertyTypes those differ,
    // and "no marks yet" is genuinely the absence of the field.
    ...(cueMarks ? { cueMarks } : {}),
  })

describe('ease', () => {
  it('pins the endpoints exactly', () => {
    expect(ease(houseTiming.reveal.easing, 0)).toBe(0)
    expect(ease(houseTiming.reveal.easing, 1)).toBe(1)
  })

  it('clamps outside the domain', () => {
    expect(ease(houseTiming.reveal.easing, -5)).toBe(0)
    expect(ease(houseTiming.reveal.easing, 5)).toBe(1)
  })

  it('is the identity for a linear curve', () => {
    for (const x of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(ease(LINEAR, x)).toBeCloseTo(x, 6)
    }
  })

  it('is monotonic across the range', () => {
    // A non-monotonic easing would make an element visibly move backwards mid-transition.
    let previous = -1
    for (let x = 0; x <= 1; x += 0.01) {
      const y = ease(houseTiming.reveal.easing, x)
      expect(y).toBeGreaterThanOrEqual(previous - 1e-9)
      previous = y
    }
  })

  it('produces the same value every time it is asked', () => {
    // The engine cannot delegate easing to the platform (R3): a headless render and a
    // browser must agree exactly, so the solver has to be deterministic.
    const samples = Array.from({ length: 50 }, (_, i) => ease(houseTiming.draw.easing, i / 49))
    const again = Array.from({ length: 50 }, (_, i) => ease(houseTiming.draw.easing, i / 49))

    expect(again).toEqual(samples)
  })

  it('converges on a flat ease-in-out curve where Newton alone diverges', () => {
    const flat: Easing = [0.9, 0, 0.1, 1]
    for (let x = 0; x <= 1; x += 0.05) {
      const y = ease(flat, x)
      expect(Number.isFinite(y)).toBe(true)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1)
    }
  })
})

describe('lerpPose', () => {
  it('keeps an element visible while it fades out', () => {
    // A midpoint switch would make things pop rather than fade.
    const mid = lerpPose(restingPose, hiddenPose, 0.5)
    expect(mid.visible).toBe(true)
    expect(mid.opacity).toBeCloseTo(0.5, 6)
  })

  it('takes the destination visibility once complete', () => {
    expect(lerpPose(restingPose, hiddenPose, 1).visible).toBe(false)
  })

  it('shows an element from the first frame of a fade in', () => {
    const start = lerpPose(hiddenPose, restingPose, 0.01)
    expect(start.visible).toBe(true)
    expect(start.opacity).toBeCloseTo(0.01, 6)
  })
})

describe('compileScene', () => {
  it('starts a hidden element hidden and reveals it at its cue', () => {
    const scene = sceneOf(
      [element('a')],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] }],
    )
    const timeline = compile(scene, { c1: 2 })

    expect(timeline.poseAt('a', 0).visible).toBe(false)
    expect(timeline.poseAt('a', 1.9).opacity).toBe(0)
    expect(timeline.poseAt('a', 2 + houseTiming.reveal.duration).opacity).toBeCloseTo(1, 4)
  })

  it('is a pure function of t', () => {
    // This is the property frame(program, t) is built on (R3).
    const scene = sceneOf(
      [element('a'), element('b')],
      [
        {
          id: 'b1',
          cue: 'c1',
          actions: [
            { verb: 'reveal', target: 'a' },
            { verb: 'reveal', target: 'b' },
          ],
        },
      ],
    )
    const timeline = compile(scene, { c1: 1 })

    for (const t of [0, 0.5, 1.1, 1.5, 3]) {
      expect(timeline.poseAt('a', t)).toEqual(timeline.poseAt('a', t))
      expect(timeline.poseAt('b', t)).toEqual(timeline.poseAt('b', t))
    }
  })

  it('follows the spoken cue rather than a fixed timeline', () => {
    // The whole reason cues exist: narration regenerated in another language runs at a
    // different speed, and the visuals have to move with it.
    const scene = sceneOf(
      [element('a')],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] }],
    )

    const fast = compile(scene, { c1: 1 })
    const slow = compile(scene, { c1: 6 })

    expect(fast.beatTimes[0]!.at).toBe(1)
    expect(slow.beatTimes[0]!.at).toBe(6)
    expect(slow.duration).toBeGreaterThan(fast.duration)
  })

  it('spaces beats evenly when nothing has been voiced yet', () => {
    // The fallback is what lets a lesson play before anyone has paid for audio.
    const scene = sceneOf(
      [element('a'), element('b')],
      [
        { id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] },
        { id: 'b2', cue: 'c2', actions: [{ verb: 'reveal', target: 'b' }] },
      ],
    )
    const timeline = compile(scene)

    expect(timeline.beatTimes.map((b) => b.at)).toEqual([0, 5])
  })

  it('never lets a beat move backwards, even if the marks do', () => {
    // Speech providers do not guarantee monotonic marks. A beat that went backwards would
    // replay visuals the learner has already seen — degrade the timing, do not refuse.
    const scene = sceneOf(
      [element('a'), element('b')],
      [
        { id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] },
        { id: 'b2', cue: 'c2', actions: [{ verb: 'reveal', target: 'b' }] },
      ],
    )
    const timeline = compile(scene, { c1: 5, c2: 2 })

    expect(timeline.beatTimes.map((b) => b.at)).toEqual([5, 5])
  })

  it('staggers siblings so a list arrives as a list', () => {
    const scene = sceneOf(
      [element('a'), element('b'), element('c')],
      [
        {
          id: 'b1',
          cue: 'c1',
          actions: [
            { verb: 'reveal', target: 'a' },
            { verb: 'reveal', target: 'b' },
            { verb: 'reveal', target: 'c' },
          ],
        },
      ],
    )
    const timeline = compile(scene, { c1: 0 })

    // At one stagger step in, the first has started and the third has not.
    const t = houseTiming.stagger * 2 - 0.01
    expect(timeline.poseAt('a', t).opacity).toBeGreaterThan(0)
    expect(timeline.poseAt('c', t).opacity).toBe(0)
  })

  it('does not let a sound effect consume a stagger slot', () => {
    const scene = sceneOf(
      [element('a'), element('b')],
      [
        {
          id: 'b1',
          cue: 'c1',
          actions: [
            { verb: 'reveal', target: 'a' },
            { verb: 'sfx', sound: 'ping' },
            { verb: 'reveal', target: 'b' },
          ],
        },
      ],
    )
    const timeline = compile(scene, { c1: 0 })

    expect(timeline.sounds).toEqual([{ at: houseTiming.stagger, sound: 'ping' }])
    // `b` is the second thing arriving on screen, so it is one step behind `a`, not two.
    expect(timeline.poseAt('b', houseTiming.stagger + 0.001).opacity).toBeGreaterThan(0)
  })

  it('draws an element on from nothing', () => {
    // Regression: elements rest at drawProgress 1, so without starting the target undrawn
    // the transition ran from 1 to 1 and drawOn silently did nothing.
    const scene = sceneOf(
      [element('a', true)],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'drawOn', target: 'a' }] }],
    )
    const timeline = compile(scene, { c1: 0 })

    expect(timeline.poseAt('a', 0).drawProgress).toBe(0)
    expect(timeline.poseAt('a', houseTiming.draw.duration / 2).drawProgress).toBeGreaterThan(0)
    expect(timeline.poseAt('a', houseTiming.draw.duration).drawProgress).toBeCloseTo(1, 4)
  })

  it('uses each verb its own easing curve', () => {
    // The profile gives reveal and exit different curves deliberately; applying one to
    // both would quietly discard half the profile.
    const revealed = sceneOf(
      [element('a')],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'a' }] }],
    )
    const exited = sceneOf(
      [element('a', true)],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'exit', target: 'a' }] }],
    )

    const half = 0.5
    const revealAt = compile(revealed, { c1: 0 }).poseAt('a', houseTiming.reveal.duration * half).opacity
    const exitAt = compile(exited, { c1: 0 }).poseAt('a', houseTiming.exit.duration * half).opacity

    // Reveal eases out and exit eases in, so at the halfway point they are not mirror
    // images of one another.
    expect(revealAt).not.toBeCloseTo(1 - exitAt, 3)
  })

  it('moves to a named pose', () => {
    const scene = sceneOf(
      [
        element('a', true, {
          raised: { visible: true, dx: 0, dy: -0.5, scale: 1, opacity: 1, rotate: 0, drawProgress: 1 },
        }),
      ],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'move', target: 'a', to: 'raised' }] }],
    )
    const timeline = compile(scene, { c1: 0 })

    expect(timeline.poseAt('a', 0).dy).toBe(0)
    expect(timeline.poseAt('a', houseTiming.move.duration).dy).toBeCloseTo(-0.5, 4)
  })

  it('falls back to rest for a pose the element does not define', () => {
    const scene = sceneOf(
      [element('a', true)],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'move', target: 'a', to: 'nowhere' }] }],
    )
    // A missing pose is a document problem the quality gate reports; timing must degrade,
    // not throw, because the caller may be a renderer mid-frame.
    expect(() => compile(scene, { c1: 0 })).not.toThrow()
  })

  it('ignores an action naming an element the scene does not define', () => {
    const scene = sceneOf(
      [element('a')],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'reveal', target: 'ghost' }] }],
    )

    expect(() => compile(scene, { c1: 0 })).not.toThrow()
    expect(compile(scene, { c1: 0 }).poseAt('ghost', 5)).toEqual(hiddenPose)
  })

  describe('emphasis', () => {
    it('returns the element to exactly where it started', () => {
      // An emphasis that left the element displaced would silently corrupt the layout,
      // which is why registration requires keyframes to start at 0 and end at 1.
      const scene = sceneOf(
        [element('a', true)],
        [{ id: 'b1', cue: 'c1', actions: [{ verb: 'emphasize', target: 'a', style: 'pulse' }] }],
      )
      const timeline = compile(scene, { c1: 1 })

      const before = timeline.poseAt('a', 0.9)
      const after = timeline.poseAt('a', 1 + 0.6 + 0.01)
      expect(after).toEqual(before)
    })

    it('perturbs the element mid-effect', () => {
      const scene = sceneOf(
        [element('a', true)],
        [{ id: 'b1', cue: 'c1', actions: [{ verb: 'emphasize', target: 'a', style: 'pulse' }] }],
      )
      const timeline = compile(scene, { c1: 0 })

      expect(timeline.poseAt('a', 0.3).scale).toBeGreaterThan(1)
    })

    it('survives an unregistered effect rather than throwing', () => {
      const scene = sceneOf(
        [element('a', true)],
        [{ id: 'b1', cue: 'c1', actions: [{ verb: 'emphasize', target: 'a', style: 'nonexistent' }] }],
      )

      expect(() => compile(scene, { c1: 0 }).poseAt('a', 0.2)).not.toThrow()
    })
  })

  describe('items', () => {
    it('reveals items one at a time', () => {
      const scene = sceneOf(
        [element('list', true)],
        [
          { id: 'b1', cue: 'c1', actions: [{ verb: 'revealItem', target: 'list', index: 0 }] },
          { id: 'b2', cue: 'c2', actions: [{ verb: 'revealItem', target: 'list', index: 1 }] },
        ],
      )
      const timeline = compile(scene, { c1: 1, c2: 3 })

      expect(timeline.itemsAt('list', 0)).toBe(0)
      expect(timeline.itemsAt('list', 1)).toBe(1)
      expect(timeline.itemsAt('list', 3)).toBe(2)
    })

    it('never un-reveals an item', () => {
      // Out-of-order indices are a plausible model mistake; going backwards would make
      // content disappear mid-lesson.
      const scene = sceneOf(
        [element('list', true)],
        [
          { id: 'b1', cue: 'c1', actions: [{ verb: 'revealItem', target: 'list', index: 4 }] },
          { id: 'b2', cue: 'c2', actions: [{ verb: 'revealItem', target: 'list', index: 1 }] },
        ],
      )
      const timeline = compile(scene, { c1: 1, c2: 2 })

      expect(timeline.itemsAt('list', 2)).toBe(5)
    })

    it('reveals everything at once', () => {
      const scene = sceneOf(
        [element('list', true)],
        [{ id: 'b1', cue: 'c1', actions: [{ verb: 'revealAll', target: 'list' }] }],
      )

      expect(compile(scene, { c1: 1 }).itemsAt('list', 2)).toBe(Number.POSITIVE_INFINITY)
    })
  })
})

describe('emphasisAt', () => {
  it('is neutral outside its span', () => {
    const effect = emphasis().get('pulse')
    expect(emphasisAt(effect, 0)).toEqual({})
    expect(emphasisAt(effect, 1)).toEqual({})
  })

  it('leaves unmentioned channels at their neutral value', () => {
    // `pulse` only touches scale; it must not zero out opacity as a side effect.
    const overlay = emphasisAt(emphasis().get('pulse'), 0.5)
    expect(overlay.opacity).toBe(1)
    expect(overlay.dx).toBe(0)
  })
})

describe('createEmphasisRegistry', () => {
  it('rejects keyframes that do not return to rest', () => {
    const registry = createEmphasisRegistry({ includeBuiltIns: false })

    expect(() =>
      registry.register({
        descriptor: {
          id: 'drifts',
          duration: 0.5,
          keyframes: [
            { at: 0, dx: 0 },
            { at: 0.8, dx: 0.5 },
          ],
        },
        create: () => ({ id: 'drifts', duration: 0.5, keyframes: [] }),
      }),
    ).toThrowError(/returns to rest/i)
  })

  it('rejects unordered keyframes', () => {
    const registry = createEmphasisRegistry({ includeBuiltIns: false })

    expect(() =>
      registry.register({
        descriptor: {
          id: 'jumbled',
          duration: 0.5,
          keyframes: [
            { at: 0, dx: 0 },
            { at: 0.7, dx: 0.1 },
            { at: 0.3, dx: 0.2 },
            { at: 1, dx: 0 },
          ],
        },
        create: () => ({ id: 'jumbled', duration: 0.5, keyframes: [] }),
      }),
    ).toThrowError(/ordered/i)
  })

  it('registers every built-in', () => {
    expect([...createEmphasisRegistry().ids()].sort()).toEqual(['bounce', 'glow', 'pulse', 'shake'])
  })
})

describe('progressive reveal defaults', () => {
  it('shows everything when nobody choreographed the element', () => {
    // An author who writes a chart and no beats expects to see the chart. Returning 0 here
    // made every un-choreographed list, table and chart render as an empty panel — and the
    // renderers could not tell "no build authored" from "nothing revealed yet".
    const scene = sceneOf([element('chart', true)], [])
    expect(compile(scene).itemsAt('chart', 0)).toBe(Number.POSITIVE_INFINITY)
  })

  it('starts at nothing once a build is authored', () => {
    const scene = sceneOf(
      [element('list', true)],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'revealItem', target: 'list', index: 0 }] }],
    )
    const timeline = compile(scene, { c1: 2 })

    expect(timeline.itemsAt('list', 0)).toBe(0)
    expect(timeline.itemsAt('list', 2)).toBe(1)
  })

  it('reveals the element itself when its first item is revealed', () => {
    // Nobody means "show the second bullet of a list that is not on screen". Without this
    // the element stays hidden, frame drops it, and the sequenced items are invisible.
    const scene = sceneOf(
      [element('list')],
      [{ id: 'b1', cue: 'c1', actions: [{ verb: 'revealItem', target: 'list', index: 0 }] }],
    )
    const timeline = compile(scene, { c1: 1 })

    expect(timeline.poseAt('list', 0).visible).toBe(false)
    expect(timeline.poseAt('list', 1 + houseTiming.reveal.duration).opacity).toBeCloseTo(1, 4)
  })

  it('does not re-fade the element on every subsequent item', () => {
    const scene = sceneOf(
      [element('list')],
      [
        { id: 'b1', cue: 'c1', actions: [{ verb: 'revealItem', target: 'list', index: 0 }] },
        { id: 'b2', cue: 'c2', actions: [{ verb: 'revealItem', target: 'list', index: 1 }] },
      ],
    )
    const timeline = compile(scene, { c1: 1, c2: 3 })

    // Fully opaque before the second item and still fully opaque during it.
    expect(timeline.poseAt('list', 2.5).opacity).toBeCloseTo(1, 4)
    expect(timeline.poseAt('list', 3.1).opacity).toBeCloseTo(1, 4)
  })
})
