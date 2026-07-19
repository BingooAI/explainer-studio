// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The editor's chrome, as one injected stylesheet.
 *
 * Same approach as the player: no CSS file to import, no build step for a host to configure,
 * nothing that breaks when the package is consumed from a CDN. Every colour and measurement
 * is a custom property on the root, so a host restyles the editor by setting variables
 * rather than by overriding selectors (R1) — overrides break on every release, variables do
 * not.
 *
 * The chrome is deliberately dark and quiet. An editor is looked at for hours, and the only
 * thing in it that should attract the eye is the lesson being made.
 *
 * NOTE: no backtick may appear inside this template — it is a template literal, and one
 * stray backtick in a comment ends the string and breaks the build.
 */

export const EDITOR_PREFIX = 'xse'

export const editorStyles = `
.xse-root {
  --xse-bg: #0d0f13;
  --xse-panel: #14171d;
  --xse-raised: #1b1f27;
  --xse-line: #262b35;
  --xse-ink: #e7eaf0;
  --xse-sub: #8d95a5;
  --xse-accent: #5b8cff;
  --xse-danger: #f2637e;
  --xse-ok: #46c98b;
  --xse-radius: 10px;
  --xse-gap: 10px;
  --xse-rail: 264px;
  --xse-inspector: 320px;
  --xse-strip: 108px;
  --xse-timeline: 190px;
  --xse-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  height: 100%;
  min-height: 0;
  background: var(--xse-bg);
  color: var(--xse-ink);
  font-family: var(--xse-font);
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
}

.xse-root *, .xse-root *::before, .xse-root *::after { box-sizing: border-box; }

/* ---------- top bar ---------- */

.xse-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--xse-panel);
  border-bottom: 1px solid var(--xse-line);
}

.xse-title {
  min-width: 120px;
  max-width: 340px;
  flex: 1 1 auto;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--xse-ink);
  font: 600 14px/1.2 var(--xse-font);
}
.xse-title:hover { border-color: var(--xse-line); }
.xse-title:focus { outline: none; border-color: var(--xse-accent); background: var(--xse-bg); }

.xse-spacer { flex: 1 1 auto; }

.xse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--xse-line);
  border-radius: 8px;
  background: var(--xse-raised);
  color: var(--xse-ink);
  font: 500 12px/1 var(--xse-font);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
}
.xse-btn:hover:not(:disabled) { background: #232833; border-color: #333a47; }
.xse-btn:focus-visible { outline: 2px solid var(--xse-accent); outline-offset: 2px; }
.xse-btn:disabled { opacity: 0.35; cursor: default; }
.xse-btn.is-primary { background: var(--xse-accent); border-color: var(--xse-accent); color: #fff; }
.xse-btn.is-primary:hover:not(:disabled) { background: #6f9bff; }
.xse-btn.is-ghost { background: transparent; border-color: transparent; color: var(--xse-sub); }
.xse-btn.is-ghost:hover:not(:disabled) { background: var(--xse-raised); color: var(--xse-ink); }
.xse-btn.is-danger { border-color: color-mix(in srgb, var(--xse-danger) 45%, transparent); color: var(--xse-danger); }
.xse-btn.is-icon { min-width: 30px; padding: 0; }

.xse-seg { display: inline-flex; border: 1px solid var(--xse-line); border-radius: 8px; overflow: hidden; }
.xse-seg > button {
  min-height: 30px; padding: 0 10px; border: 0; background: var(--xse-raised);
  color: var(--xse-sub); font: 500 12px/1 var(--xse-font); cursor: pointer;
}
.xse-seg > button + button { border-left: 1px solid var(--xse-line); }
.xse-seg > button[aria-pressed="true"] { background: var(--xse-accent); color: #fff; }

.xse-select {
  min-height: 30px; padding: 0 8px; border: 1px solid var(--xse-line); border-radius: 8px;
  background: var(--xse-raised); color: var(--xse-ink); font: 500 12px/1 var(--xse-font);
}

.xse-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px;
  border-radius: 999px; background: var(--xse-raised); color: var(--xse-sub);
  font: 500 11px/1.4 var(--xse-font);
}
.xse-pill.is-ok { color: var(--xse-ok); }
.xse-pill.is-error { color: var(--xse-danger); }

/* ---------- middle: rail, stage, inspector ---------- */

.xse-main {
  display: grid;
  grid-template-columns: var(--xse-rail) minmax(0, 1fr) var(--xse-inspector);
  min-height: 0;
  gap: 1px;
  background: var(--xse-line);
}

.xse-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--xse-panel);
}

.xse-panel-head {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--xse-line);
  color: var(--xse-sub);
  font: 600 11px/1 var(--xse-font);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.xse-panel-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 10px; }

.xse-stagecol { display: flex; flex-direction: column; min-height: 0; background: #0a0c0f; }
.xse-stagewrap {
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 18px;
}
.xse-stagebox {
  position: relative;
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: var(--xse-aspect, 16 / 9);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 18px 50px rgb(0 0 0 / 0.5);
}
.xse-stagebox > svg { display: block; width: 100%; height: 100%; }

/* Click targets laid over the stage, so selecting is done by clicking the thing itself
   rather than by hunting for its row in a list. */
.xse-hit {
  position: absolute;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: border-color 100ms ease, background 100ms ease;
}
.xse-hit:hover { border-color: color-mix(in srgb, var(--xse-accent) 55%, transparent); background: color-mix(in srgb, var(--xse-accent) 10%, transparent); }
.xse-hit[aria-pressed="true"] { border-color: var(--xse-accent); background: color-mix(in srgb, var(--xse-accent) 14%, transparent); }
.xse-hit:focus-visible { outline: 2px solid var(--xse-accent); outline-offset: 1px; }

.xse-transport {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px;
  border-top: 1px solid var(--xse-line);
  background: var(--xse-panel);
}
.xse-time { color: var(--xse-sub); font: 500 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }

/* ---------- scene strip ---------- */

.xse-strip {
  display: flex;
  gap: 8px;
  align-items: stretch;
  min-height: var(--xse-strip);
  padding: 10px 12px;
  overflow-x: auto;
  background: var(--xse-panel);
  border-top: 1px solid var(--xse-line);
}

.xse-scene {
  position: relative;
  flex: 0 0 auto;
  width: 132px;
  padding: 0;
  border: 1px solid var(--xse-line);
  border-radius: var(--xse-radius);
  background: var(--xse-raised);
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 120ms ease, transform 120ms ease;
}
.xse-scene:hover { border-color: #3a4252; }
.xse-scene[aria-current="true"] { border-color: var(--xse-accent); box-shadow: 0 0 0 1px var(--xse-accent) inset; }
.xse-scene.is-over { border-color: var(--xse-ok); border-style: dashed; }
.xse-scene:focus-visible { outline: 2px solid var(--xse-accent); outline-offset: 2px; }

.xse-scene-thumb { display: block; width: 100%; aspect-ratio: 16 / 9; background: #fff; overflow: hidden; }
.xse-scene-thumb > svg { display: block; width: 100%; height: 100%; }

.xse-scene-foot {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 7px;
  font: 500 11px/1.3 var(--xse-font);
  color: var(--xse-sub);
}
.xse-scene-no {
  display: inline-grid; place-items: center;
  min-width: 17px; height: 17px; padding: 0 4px;
  border-radius: 5px; background: #2a303c; color: var(--xse-ink);
  font-size: 10px; font-variant-numeric: tabular-nums;
}
.xse-scene-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xse-scene-badge { padding: 1px 6px; border-radius: 999px; background: #2a303c; font-size: 10px; }
.xse-scene-badge.is-gate { background: color-mix(in srgb, var(--xse-accent) 30%, transparent); color: #cfe0ff; }

.xse-scene-ops {
  position: absolute; inset-inline: 4px; top: 4px;
  display: flex; gap: 3px; justify-content: flex-end;
  opacity: 0; transition: opacity 120ms ease;
}
.xse-scene:hover .xse-scene-ops, .xse-scene:focus-within .xse-scene-ops { opacity: 1; }
.xse-scene-ops > button {
  width: 22px; height: 22px; display: grid; place-items: center;
  border: 0; border-radius: 6px; background: rgb(10 12 15 / 0.78); color: #fff;
  font-size: 11px; cursor: pointer;
}
.xse-scene-ops > button:hover:not(:disabled) { background: var(--xse-accent); }
.xse-scene-ops > button:disabled { opacity: 0.3; cursor: default; }

.xse-scene-add {
  flex: 0 0 auto; width: 76px;
  display: grid; place-items: center; gap: 2px;
  border: 1px dashed var(--xse-line); border-radius: var(--xse-radius);
  background: transparent; color: var(--xse-sub);
  font: 500 11px/1.2 var(--xse-font); cursor: pointer;
}
.xse-scene-add:hover { border-color: var(--xse-accent); color: var(--xse-ink); }

/* ---------- track timeline ---------- */

.xse-timeline {
  min-height: var(--xse-timeline);
  max-height: 44vh;
  display: flex; flex-direction: column;
  background: var(--xse-panel);
  border-top: 1px solid var(--xse-line);
}

.xse-ruler {
  position: relative;
  height: 24px;
  border-bottom: 1px solid var(--xse-line);
  cursor: pointer;
  user-select: none;
}
.xse-ruler-tick {
  position: absolute; top: 0; bottom: 0;
  border-left: 1px solid var(--xse-line);
  padding-left: 4px;
  color: var(--xse-sub);
  font: 500 10px/24px ui-monospace, SFMono-Regular, Menlo, monospace;
  pointer-events: none;
}

.xse-tracks { position: relative; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 6px 0 10px; }

.xse-track { position: relative; height: 30px; margin: 0 0 4px; }

.xse-clip {
  position: absolute; top: 0; bottom: 0;
  display: flex; align-items: center; gap: 5px;
  min-width: 12px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--xse-clip, #3b82f6);
  color: #fff;
  font: 500 11px/1 var(--xse-font);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
}
.xse-clip:hover { filter: brightness(1.12); }
.xse-clip[aria-pressed="true"] { border-color: #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.6); }
.xse-clip:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.xse-clip-label { overflow: hidden; text-overflow: ellipsis; }

.xse-fx {
  position: absolute; top: 50%; width: 5px; height: 5px;
  margin: -3px 0 0 -3px;
  border-radius: 50%; background: rgb(255 255 255 / 0.85);
  pointer-events: none;
}

.xse-lane { position: relative; height: 26px; margin: 0 0 4px; }
.xse-lane-narr {
  position: absolute; top: 0; bottom: 0;
  display: flex; align-items: center;
  padding: 0 7px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--xse-ok) 45%, transparent);
  background: color-mix(in srgb, var(--xse-ok) 16%, transparent);
  color: #cfeede;
  font: 500 11px/1 var(--xse-font);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer;
}
.xse-lane-gate {
  position: absolute; top: 0; bottom: 0;
  display: flex; align-items: center; padding: 0 7px;
  border-radius: 6px;
  border: 1px dashed color-mix(in srgb, var(--xse-accent) 60%, transparent);
  background: color-mix(in srgb, var(--xse-accent) 16%, transparent);
  color: #d5e2ff; font: 500 11px/1 var(--xse-font);
  white-space: nowrap; overflow: hidden;
}

.xse-playhead {
  position: absolute; top: 0; bottom: 0; width: 1px;
  background: var(--xse-danger);
  pointer-events: none;
  z-index: 3;
}
.xse-playhead::before {
  content: ""; position: absolute; top: 0; left: -4px;
  border-left: 4.5px solid transparent; border-right: 4.5px solid transparent;
  border-top: 6px solid var(--xse-danger);
}

/* ---------- inspector ---------- */

.xse-field { display: block; margin: 0 0 11px; }
.xse-field > span {
  display: block; margin: 0 0 5px;
  color: var(--xse-sub); font: 600 10px/1 var(--xse-font);
  letter-spacing: 0.06em; text-transform: uppercase;
}
.xse-input, .xse-textarea {
  width: 100%; padding: 7px 9px;
  border: 1px solid var(--xse-line); border-radius: 8px;
  background: var(--xse-bg); color: var(--xse-ink);
  font: 400 12px/1.5 var(--xse-font);
}
.xse-textarea { min-height: 74px; resize: vertical; }
.xse-input:focus, .xse-textarea:focus { outline: none; border-color: var(--xse-accent); }
.xse-input:disabled { opacity: 0.5; }

.xse-row { display: flex; gap: 6px; align-items: center; }
.xse-row > .xse-field { flex: 1 1 0; }

.xse-hint { margin: -5px 0 11px; color: var(--xse-sub); font: 400 11px/1.5 var(--xse-font); }

.xse-empty {
  display: grid; place-items: center; gap: 6px;
  padding: 26px 16px; text-align: center;
  color: var(--xse-sub); font: 400 12px/1.6 var(--xse-font);
}

.xse-swatch {
  width: 20px; height: 20px; padding: 0;
  border: 1px solid var(--xse-line); border-radius: 5px;
  background: var(--xse-swatch, #888); cursor: pointer;
}
.xse-swatch[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--xse-accent); }

.xse-issue {
  display: flex; gap: 7px; align-items: flex-start;
  padding: 7px 9px; margin: 0 0 6px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--xse-danger) 12%, transparent);
  color: #ffd7de; font: 400 11px/1.5 var(--xse-font);
}
.xse-issue.is-warn { background: color-mix(in srgb, #f6c344 12%, transparent); color: #ffeec2; }

.xse-add-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.xse-add-grid > button { justify-content: flex-start; }

@media (prefers-reduced-motion: reduce) {
  .xse-root *, .xse-root *::before, .xse-root *::after { transition-duration: 1ms !important; }
}
`

let injected: WeakSet<Document> | undefined

/**
 * Injects the stylesheet once per document.
 *
 * Per *document*, not per module, because an editor may be rendered into an iframe or a
 * popped-out window and a module-level flag would leave that one unstyled.
 */
export function ensureEditorStyles(target?: Document): void {
  const doc = target ?? (typeof document === 'undefined' ? undefined : document)
  if (!doc) return

  injected ??= new WeakSet()
  if (injected.has(doc)) return

  const id = `${EDITOR_PREFIX}-styles`
  if (!doc.getElementById(id)) {
    const style = doc.createElement('style')
    style.id = id
    style.textContent = editorStyles
    doc.head.appendChild(style)
  }

  injected.add(doc)
}
