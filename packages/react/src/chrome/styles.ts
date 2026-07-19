// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The player's own styles, injected once.
 *
 * A component library that ships a `.css` file forces every consumer to configure a build
 * that can import one — a real barrier for someone dropping the player into an existing
 * app, and the first thing that makes an embed "not worth the trouble". Inline styles avoid
 * that but cannot express hover, focus or media queries, which is most of what makes a
 * control feel finished.
 *
 * One stylesheet, one id, injected on first mount. Every class is prefixed, so it cannot
 * collide with a host's styles and a host cannot accidentally restyle us.
 */

const STYLE_ID = 'explainer-studio-styles'

export const PREFIX = 'xs'

export const styles = `
.${PREFIX}-player {
  --xs-ink: #1f1b17;
  --xs-soft: #6b6259;
  --xs-hairline: #e6ded1;
  --xs-accent: #d96a2c;
  --xs-surface: #ffffff;
  --xs-chrome: #f7f3ec;
  --xs-focus: #3d7ea6;
  --xs-radius: 12px;

  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--xs-ink);
  display: flex;
  flex-direction: column;
  border-radius: var(--xs-radius);
  overflow: hidden;
  border: 1px solid var(--xs-hairline);
  background: var(--xs-surface);
  box-shadow: 0 1px 2px rgb(31 27 23 / 0.04), 0 8px 24px -12px rgb(31 27 23 / 0.18);
}

.${PREFIX}-stage { display: block; width: 100%; height: auto; }

.${PREFIX}-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: var(--xs-chrome);
  border-top: 1px solid var(--xs-hairline);
}

.${PREFIX}-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  /* 44px is the smallest target most people can hit reliably on a touchscreen, and a
     teacher is often operating this on a tablet at the front of a room. */
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0 0.6rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.${PREFIX}-btn:hover { background: rgb(31 27 23 / 0.05); }
.${PREFIX}-btn:active { background: rgb(31 27 23 / 0.09); }
.${PREFIX}-btn[aria-pressed='true'] { background: rgb(217 106 44 / 0.12); border-color: rgb(217 106 44 / 0.35); }
.${PREFIX}-btn:focus-visible { outline: 2px solid var(--xs-focus); outline-offset: 2px; }
.${PREFIX}-btn--primary { background: var(--xs-ink); color: #fff; }
.${PREFIX}-btn--primary:hover { background: #35302a; }

.${PREFIX}-time {
  font-variant-numeric: tabular-nums;
  font-size: 0.8125rem;
  color: var(--xs-soft);
  min-width: 4.5ch;
  text-align: center;
}

.${PREFIX}-scrub { position: relative; flex: 1; height: 2.75rem; display: flex; align-items: center; }
.${PREFIX}-track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--xs-hairline);
  overflow: visible;
}
.${PREFIX}-fill { position: absolute; inset: 0 auto 0 0; border-radius: 999px; background: var(--xs-accent); }
.${PREFIX}-thumb {
  position: absolute;
  top: 50%;
  width: 14px; height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: var(--xs-accent);
  box-shadow: 0 0 0 3px var(--xs-surface), 0 1px 3px rgb(31 27 23 / 0.35);
  pointer-events: none;
}
/* Chapters are marked on the track rather than listed elsewhere: a teacher scanning a
   lesson needs to see where it stops and asks something, in the place they are already
   looking. */
.${PREFIX}-chapter {
  position: absolute;
  top: 50%;
  width: 3px; height: 14px;
  margin: -7px 0 0 -1.5px;
  border-radius: 2px;
  background: var(--xs-ink);
  opacity: 0.45;
}
.${PREFIX}-range {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.${PREFIX}-range:focus-visible + .${PREFIX}-track { outline: 2px solid var(--xs-focus); outline-offset: 4px; }

.${PREFIX}-strip {
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  overflow-x: auto;
  background: var(--xs-surface);
  border-top: 1px solid var(--xs-hairline);
  scrollbar-width: thin;
}
.${PREFIX}-chip {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  align-items: flex-start;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--xs-hairline);
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 120ms ease, background-color 120ms ease;
}
.${PREFIX}-chip:hover { background: rgb(31 27 23 / 0.04); }
.${PREFIX}-chip:focus-visible { outline: 2px solid var(--xs-focus); outline-offset: 2px; }
.${PREFIX}-chip[aria-current='true'] { border-color: var(--xs-accent); background: rgb(217 106 44 / 0.08); }
.${PREFIX}-chip-phase { color: var(--xs-soft); font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; }

.${PREFIX}-gate {
  padding: 0.875rem 1rem;
  background: var(--xs-surface);
  border-top: 1px solid var(--xs-hairline);
}

@media (prefers-reduced-motion: reduce) {
  .${PREFIX}-btn, .${PREFIX}-chip { transition: none; }
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
