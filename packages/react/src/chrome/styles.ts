// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The player's own styles, injected once.
 *
 * A component library that ships a `.css` file forces every consumer to configure a build
 * that can import one — the first thing that makes an embed not worth the trouble. Inline
 * styles avoid that but cannot express hover, focus or media queries, which is most of what
 * makes a control feel finished. One prefixed stylesheet, injected by id, gives both.
 *
 * The chrome is dark regardless of the lesson's theme. The stage is a lit surface a class
 * is looking at; surrounding it with more light flattens the distinction between the lesson
 * and the software, and every player people already know does the same thing.
 */

const STYLE_ID = 'explainer-studio-styles'

export const PREFIX = 'xs'

export const styles = `
/* Every colour is a custom property on the root, which is the theming surface: a host
   overrides any of them from its own stylesheet without forking the component. They are
   defaults, not constants (R1) — a school with a brand, or a deployment that needs a light
   chrome for a projector, changes these and nothing else. */
.${PREFIX}-player {
  --xs-bg: #0e1117;
  --xs-panel: #161b24;
  --xs-raised: #1e2430;
  --xs-text: #e9ecf1;
  --xs-muted: #9aa3b2;
  --xs-line: #262d3a;
  --xs-accent: #6470f3;
  --xs-accent-soft: rgb(100 112 243 / 0.22);
  --xs-danger: #f0685f;
  --xs-radius: 14px;

  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: var(--xs-radius);
  overflow: hidden;
  background: var(--xs-bg);
  color: var(--xs-text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  box-shadow: 0 24px 60px -28px rgb(0 0 0 / 0.55), 0 2px 8px rgb(0 0 0 / 0.2);
}

/* ---- stage -------------------------------------------------------------- */

.${PREFIX}-screen { position: relative; background: #000; }
.${PREFIX}-stage { display: block; width: 100%; height: auto; }

/* Header floats over the stage on a gradient rather than a bar: a solid strip would eat
   canvas the composition already owns, and the gradient keeps the title legible over any
   backdrop without reserving space for it. */
.${PREFIX}-head {
  position: absolute;
  inset: 0 0 auto 0;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem 2.5rem;
  background: linear-gradient(to bottom, rgb(8 10 14 / 0.72), rgb(8 10 14 / 0));
  pointer-events: none;
}
.${PREFIX}-head > * { pointer-events: auto; }
.${PREFIX}-head-text { flex: 1; min-width: 0; }
.${PREFIX}-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.${PREFIX}-sub {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  /* Not --xs-muted: that colour is tuned against the panel, and over a photographic or
     painted backdrop it drops below readable contrast. White at 72% holds up on both. */
  color: rgb(255 255 255 / 0.72);
}

/* A single large affordance while paused, the way every player people already know does
   it. Clicking anywhere on the screen also toggles, which is the gesture they will try. */
.${PREFIX}-bigplay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
}
.${PREFIX}-bigplay span {
  display: grid;
  place-items: center;
  width: 4.5rem; height: 4.5rem;
  border-radius: 50%;
  background: rgb(14 17 23 / 0.55);
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.4);
  transition: transform 140ms ease, background-color 140ms ease;
}
.${PREFIX}-bigplay:hover span { transform: scale(1.06); background: rgb(14 17 23 / 0.72); }
.${PREFIX}-bigplay:focus-visible span { outline: 3px solid var(--xs-accent); outline-offset: 3px; }

/* ---- timeline ----------------------------------------------------------- */

.${PREFIX}-timeline { position: relative; padding: 0.5rem 1rem 0; background: var(--xs-panel); }
.${PREFIX}-scrub { position: relative; height: 1.25rem; display: flex; align-items: center; }
.${PREFIX}-track {
  position: relative;
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.14);
  transition: height 120ms ease;
}
.${PREFIX}-scrub:hover .${PREFIX}-track { height: 6px; }
.${PREFIX}-fill { position: absolute; inset: 0 auto 0 0; border-radius: 999px; background: var(--xs-accent); }
.${PREFIX}-mark {
  position: absolute; top: 50%;
  width: 8px; height: 8px; margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 2px var(--xs-panel);
}
.${PREFIX}-thumb {
  position: absolute; top: 50%;
  width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.5);
  transition: transform 120ms ease;
}
.${PREFIX}-scrub:hover .${PREFIX}-thumb { transform: scale(1.15); }
.${PREFIX}-range { position: absolute; inset: -0.5rem 0; width: 100%; margin: 0; opacity: 0; cursor: pointer; }
.${PREFIX}-range:focus-visible ~ .${PREFIX}-track { outline: 2px solid var(--xs-accent); outline-offset: 5px; }
.${PREFIX}-times {
  display: flex; justify-content: space-between;
  padding-top: 0.35rem;
  font-size: 0.6875rem; font-variant-numeric: tabular-nums; color: var(--xs-muted);
}

/* ---- control bar -------------------------------------------------------- */

.${PREFIX}-bar {
  position: relative;
  display: flex; align-items: center; gap: 0.25rem;
  padding: 0.25rem 0.625rem 0.75rem;
  background: var(--xs-panel);
}
.${PREFIX}-spacer { flex: 1; }
.${PREFIX}-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
  /* 44px: the smallest target most people hit reliably, and a teacher is often driving
     this on a tablet at the front of a room. */
  min-width: 2.75rem; min-height: 2.75rem;
  padding: 0 0.5rem;
  border: 0; border-radius: 0.55rem;
  background: transparent; color: var(--xs-text);
  font: inherit; font-size: 0.8125rem; font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.${PREFIX}-btn:hover { background: rgb(255 255 255 / 0.08); }
.${PREFIX}-btn:active { background: rgb(255 255 255 / 0.13); }
.${PREFIX}-btn[aria-pressed='true'] { background: var(--xs-accent-soft); color: #fff; }
.${PREFIX}-btn:focus-visible { outline: 2px solid var(--xs-accent); outline-offset: 2px; }
.${PREFIX}-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.${PREFIX}-btn--play { background: var(--xs-accent); color: #fff; min-width: 3rem; }
.${PREFIX}-btn--play:hover { background: #7480f5; }

/* Volume expands on hover so the resting bar stays uncluttered, but it is reachable by
   keyboard at full width because a control you can only get to by hovering is a control
   some people cannot get to at all. */
.${PREFIX}-volume { display: flex; align-items: center; }
.${PREFIX}-volume-slider {
  width: 0; opacity: 0; margin: 0;
  transition: width 160ms ease, opacity 160ms ease, margin 160ms ease;
  accent-color: var(--xs-accent);
}
.${PREFIX}-volume:hover .${PREFIX}-volume-slider,
.${PREFIX}-volume:focus-within .${PREFIX}-volume-slider { width: 5rem; opacity: 1; margin: 0 0.5rem 0 0.25rem; }

/* ---- scrub preview ----------------------------------------------------- */

/* A timestamp says where you are on a clock; it does not say what is there, which is the
   question someone dragging a scrubber is actually asking. */
.${PREFIX}-preview {
  position: absolute;
  bottom: calc(100% + 0.85rem);
  transform: translateX(-50%);
  width: 9.5rem;
  border-radius: 0.6rem;
  overflow: hidden;
  background: var(--xs-raised);
  box-shadow: 0 12px 32px -8px rgb(0 0 0 / 0.6);
  pointer-events: none;
  z-index: 4;
}
.${PREFIX}-preview-shot { background: #fff; line-height: 0; }
.${PREFIX}-preview-notch {
  position: absolute;
  bottom: -5px;
  width: 10px; height: 10px;
  margin-left: -5px;
  background: var(--xs-raised);
  transform: rotate(45deg);
  border-radius: 1px;
}
.${PREFIX}-preview-meta {
  display: flex; align-items: baseline; gap: 0.5rem;
  padding: 0.4rem 0.55rem 0.5rem;
}
.${PREFIX}-preview-title {
  flex: 1; min-width: 0;
  font-size: 0.75rem; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.${PREFIX}-preview-time { font-size: 0.6875rem; font-variant-numeric: tabular-nums; color: var(--xs-muted); }

/* ---- chapter menu ------------------------------------------------------- */

.${PREFIX}-menu {
  position: absolute;
  right: 0.625rem;
  /* Anchored to the bar and opening upward over the stage. Anchored to the player it sat
     entirely above the frame, which overflow:hidden then clipped away — the button
     worked, the panel was simply invisible. */
  bottom: calc(100% + 0.5rem);
  width: 17rem;
  max-height: 17rem;
  overflow-y: auto;
  border-radius: 0.7rem;
  background: var(--xs-raised);
  box-shadow: 0 16px 40px -10px rgb(0 0 0 / 0.65);
  z-index: 5;
}
.${PREFIX}-menu-head {
  margin: 0; padding: 0.7rem 0.85rem 0.4rem;
  font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--xs-muted);
}
.${PREFIX}-menu-list { margin: 0; padding: 0 0.35rem 0.45rem; list-style: none; }
.${PREFIX}-menu-item {
  display: flex; align-items: center; gap: 0.6rem;
  width: 100%; padding: 0.5rem 0.5rem;
  border: 0; border-radius: 0.45rem;
  background: transparent; color: var(--xs-text);
  font: inherit; font-size: 0.8125rem; text-align: left; cursor: pointer;
}
.${PREFIX}-menu-item:hover { background: rgb(255 255 255 / 0.07); }
.${PREFIX}-menu-item:focus-visible { outline: 2px solid var(--xs-accent); outline-offset: -2px; }
.${PREFIX}-menu-item[aria-current='true'] { background: var(--xs-accent-soft); }
.${PREFIX}-menu-time { font-variant-numeric: tabular-nums; color: var(--xs-muted); min-width: 2.6rem; }
.${PREFIX}-menu-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.${PREFIX}-menu-tag { display: inline-flex; color: var(--xs-accent); }

/* ---- gate --------------------------------------------------------------- */

/* Where a question sits is a real decision, not a default.
   "below" keeps the lesson unobstructed. "overlay" puts the question on the work it refers
   to, which is what a phone has room for. "left" and "right" keep the diagram visible on a wide
   screen while the learner answers — the case where covering it would be the worst choice,
   because the answer is in it. */
.${PREFIX}-gate {
  padding: 1rem 1.125rem;
  background: var(--xs-raised);
  border-top: 1px solid var(--xs-line);
}
.${PREFIX}-gate[data-placement='overlay'] {
  position: absolute;
  inset: auto 0 0 0;
  border-top: 0;
  background: rgb(20 25 34 / 0.94);
  backdrop-filter: blur(10px);
  z-index: 3;
}
.${PREFIX}-player[data-gate='left'],
.${PREFIX}-player[data-gate='right'] {
  display: grid;
  grid-template-columns: 1fr;
}
.${PREFIX}-player[data-gate='left']:has(.${PREFIX}-gate),
.${PREFIX}-player[data-gate='right']:has(.${PREFIX}-gate) {
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 19rem);
  grid-template-areas: 'screen aside' 'timeline aside' 'bar aside';
}
.${PREFIX}-player[data-gate='left']:has(.${PREFIX}-gate) { grid-template-columns: minmax(12rem, 19rem) minmax(0, 1fr); grid-template-areas: 'aside screen' 'aside timeline' 'aside bar'; }
.${PREFIX}-player[data-gate='left'] .${PREFIX}-screen,
.${PREFIX}-player[data-gate='right'] .${PREFIX}-screen { grid-area: screen; }
.${PREFIX}-player[data-gate='left'] .${PREFIX}-timeline,
.${PREFIX}-player[data-gate='right'] .${PREFIX}-timeline { grid-area: timeline; }
.${PREFIX}-player[data-gate='left'] .${PREFIX}-bar,
.${PREFIX}-player[data-gate='right'] .${PREFIX}-bar { grid-area: bar; }
.${PREFIX}-gate[data-placement='left'],
.${PREFIX}-gate[data-placement='right'] {
  grid-area: aside;
  border-top: 0;
  border-left: 1px solid var(--xs-line);
  overflow-y: auto;
}
.${PREFIX}-gate[data-placement='left'] { border-left: 0; border-right: 1px solid var(--xs-line); }

/* Below a certain width there is no "beside": a 12rem column of question next to a 12rem
   lesson serves neither. Both collapse to the stacked arrangement. */
@media (max-width: 44rem) {
  .${PREFIX}-player[data-gate='left']:has(.${PREFIX}-gate),
  .${PREFIX}-player[data-gate='right']:has(.${PREFIX}-gate) {
    grid-template-columns: 1fr;
    grid-template-areas: 'screen' 'timeline' 'bar' 'aside';
  }
  .${PREFIX}-gate[data-placement='left'],
  .${PREFIX}-gate[data-placement='right'] { border: 0; border-top: 1px solid var(--xs-line); }
}

/* ---- states ------------------------------------------------------------- */

.${PREFIX}-badge {
  position: absolute; inset: auto auto 1rem 1rem;
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgb(8 10 14 / 0.78);
  font-size: 0.75rem; color: var(--xs-text);
}
.${PREFIX}-badge--error { color: var(--xs-danger); }
.${PREFIX}-spinner {
  width: 0.95rem; height: 0.95rem;
  border: 2px solid rgb(255 255 255 / 0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${PREFIX}-spin 720ms linear infinite;
}
@keyframes ${PREFIX}-spin { to { transform: rotate(360deg); } }

/* ---- portrait ----------------------------------------------------------- */

/* Portrait drops the previews rather than shrinking them: a thumbnail narrower than a
   phone's thumb is a decoration, not information. */
.${PREFIX}-player[data-orientation='portrait'] { max-width: 30rem; }
.${PREFIX}-player[data-orientation='portrait'] .${PREFIX}-preview { display: none; }
.${PREFIX}-player[data-orientation='portrait'] .${PREFIX}-menu { width: calc(100% - 1.25rem); }

@media (max-width: 34rem) {
  .${PREFIX}-btn { min-width: 2.5rem; padding: 0 0.35rem; }
  .${PREFIX}-preview { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .${PREFIX}-player *, .${PREFIX}-player *::before { transition: none !important; animation-duration: 0.01ms !important; }
}
`

/**
 * Injects the stylesheet once per document.
 *
 * Idempotent by id, so a page holding several players — a preview grid, an editor beside a
 * player — gets one copy rather than one per instance.
 */
export function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return

  const element = document.createElement('style')
  element.id = STYLE_ID
  element.textContent = styles
  document.head.appendChild(element)
}
