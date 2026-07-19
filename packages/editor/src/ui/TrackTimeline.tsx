// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useRef, type JSX } from 'react'
import type { Clip, Project } from '../clips.js'
import { useEditor, useStore } from './context.js'
import { useRender } from './render.js'

/**
 * The track timeline: what exists, when, as bars you can look along.
 *
 * Scene-centric, like the filmstrip above it — the timeline shows the scene being edited, in
 * that scene's own time. A whole-lesson timeline sounds more useful and is not: a
 * twelve-minute lesson compresses a four-second reveal into three pixels, and the thing you
 * are actually working on becomes untouchable.
 *
 * Clicking a clip selects its element. Clicking the ruler moves the playhead. Both are the
 * same gesture people already know from every editor they have used, which is the only
 * reason to arrange it this way.
 */

export interface TrackTimelineProps {
  /** Playhead position, in seconds from the start of the active scene. */
  readonly t: number
  readonly onSeek: (t: number) => void
}

/** Colour per element type. A host adding a type adds a colour by setting `--xse-clip-<type>`. */
export const CLIP_COLORS: Readonly<Record<string, string>> = {
  text: '#3b82f6',
  shape: '#22c55e',
  stick: '#a855f7',
  diagram: '#f59e0b',
  stroke: '#ec4899',
  image: '#14b8a6',
  list: '#0ea5e9',
  table: '#8b5cf6',
  chart: '#f97316',
  stat: '#06b6d4',
  quote: '#64748b',
  connector: '#94a3b8',
}

const FALLBACK_COLOR = '#6b7280'

export function TrackTimeline({ t, onSeek }: TrackTimelineProps): JSX.Element {
  const store = useStore()
  const { ui } = useEditor()
  const { project } = useRender()
  const surface = useRef<HTMLDivElement>(null)

  const scene = project.scenes.find((candidate) => candidate.id === ui.activeSceneId) ?? project.scenes[0]
  const start = scene?.start ?? 0
  const duration = Math.max((scene?.end ?? 0) - start, 0.001)

  const local = useMemo(() => localise(project, ui.activeSceneId, start), [project, ui.activeSceneId, start])

  const percent = (seconds: number): string => `${((seconds / duration) * 100).toFixed(3)}%`

  const seekFrom = (clientX: number): void => {
    const box = surface.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    onSeek(Math.max(0, Math.min(duration, ((clientX - box.left) / box.width) * duration)))
  }

  return (
    <div className="xse-timeline">
      <div
        className="xse-ruler"
        ref={surface}
        onPointerDown={(event) => {
          seekFrom(event.clientX)
        }}
        role="slider"
        tabIndex={0}
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={t}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') onSeek(Math.min(duration, t + NUDGE_SECONDS))
          if (event.key === 'ArrowLeft') onSeek(Math.max(0, t - NUDGE_SECONDS))
        }}
      >
        {ticks(duration).map((tick) => (
          <span key={tick} className="xse-ruler-tick" style={{ left: percent(tick) }}>
            {tick}s
          </span>
        ))}
      </div>

      <div className="xse-tracks">
        {local.gates.map((gate) => (
          <div className="xse-lane" key={`gate-${gate.sceneId}`}>
            <div
              className="xse-lane-gate"
              style={{ left: percent(gate.start), width: percent(gate.end - gate.start) }}
            >
              Question · {gate.kind}
            </div>
          </div>
        ))}

        {local.narration.map((line, index) => (
          <div className="xse-lane" key={`narr-${line.ref}-${String(index)}`}>
            <button
              type="button"
              className="xse-lane-narr"
              style={{ left: percent(line.start), width: percent(Math.max(line.end - line.start, 0.2)) }}
              onClick={() => {
                onSeek(line.start)
              }}
              title={line.text}
            >
              {line.voiced ? '🎙 ' : '○ '}
              {line.text || 'Narration'}
            </button>
          </div>
        ))}

        {local.tracks.map((track) => (
          <div className="xse-track" key={track.row}>
            {track.clips.map((clip) => (
              <ClipBar
                key={clip.key}
                clip={clip}
                duration={duration}
                selected={ui.selection?.elementId === clip.elementId}
                onSelect={() => {
                  store.select({ sceneId: clip.sceneId, elementId: clip.elementId })
                  onSeek(clip.start)
                }}
              />
            ))}
          </div>
        ))}

        {local.tracks.length === 0 && local.narration.length === 0 ? (
          <p className="xse-empty">Nothing on this scene yet. Add an element to see it here.</p>
        ) : null}

        <div className="xse-playhead" style={{ left: percent(Math.min(t, duration)) }} />
      </div>
    </div>
  )
}

/** How far an arrow key moves the playhead — a beat, not a frame. */
const NUDGE_SECONDS = 0.5

function ClipBar({
  clip,
  duration,
  selected,
  onSelect,
}: {
  readonly clip: Clip
  readonly duration: number
  readonly selected: boolean
  readonly onSelect: () => void
}): JSX.Element {
  const width = ((clip.end - clip.start) / duration) * 100

  return (
    <button
      type="button"
      className="xse-clip"
      aria-pressed={selected}
      onClick={onSelect}
      title={`${clip.label} · ${clip.type}`}
      style={{
        left: `${((clip.start / duration) * 100).toFixed(3)}%`,
        width: `${width.toFixed(3)}%`,
        // A CSS variable first, so a host can colour a type it registered without patching
        // this table (R1); the built-in map is the fallback, not the authority.
        background: `var(--xse-clip-${clip.type}, ${CLIP_COLORS[clip.type] ?? FALLBACK_COLOR})`,
      }}
    >
      <span className="xse-clip-label">{clip.label}</span>
      {clip.effects.map((effect, index) => (
        <span
          key={`${effect.beatId}-${effect.verb}-${String(index)}`}
          className="xse-fx"
          style={{ left: `${(((effect.at - clip.start) / (clip.end - clip.start)) * 100).toFixed(2)}%` }}
          aria-hidden
        />
      ))}
    </button>
  )
}

/**
 * The project, rebased onto the active scene.
 *
 * `buildProject` works in program time because that is what the document means. The timeline
 * draws one scene, so everything is shifted back by where that scene starts — done here,
 * once, rather than by every component subtracting an offset and one of them forgetting.
 */
function localise(project: Project, sceneId: string | undefined, start: number): Project {
  const mine = <T extends { sceneId: string }>(item: T): boolean => item.sceneId === sceneId
  const shift = <T extends { start: number; end: number }>(item: T): T => ({
    ...item,
    start: item.start - start,
    end: item.end - start,
  })

  return {
    ...project,
    tracks: project.tracks
      .map((track) => ({
        ...track,
        clips: track.clips.filter(mine).map((clip) => ({
          ...shift(clip),
          effects: clip.effects.map((effect) => ({ ...effect, at: effect.at - start })),
        })),
      }))
      .filter((track) => track.clips.length > 0),
    narration: project.narration.filter(mine).map(shift),
    gates: project.gates.filter(mine).map(shift),
  }
}

/**
 * Where to put the second markers.
 *
 * Chosen so a scene shows roughly six to twelve of them at any length — dense enough to read
 * a position off, sparse enough that the labels do not collide. A fixed interval works for
 * one scene length and fails for every other.
 */
const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60]
const TARGET_TICKS = 8

function ticks(duration: number): number[] {
  const step = TICK_STEPS.find((candidate) => duration / candidate <= TARGET_TICKS) ?? TICK_STEPS.at(-1) ?? 60
  const out: number[] = []
  for (let at = step; at < duration; at += step) out.push(Math.round(at * 10) / 10)
  return out
}
