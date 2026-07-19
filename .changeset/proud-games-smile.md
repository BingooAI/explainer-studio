---
'@bingoo.ai/explainer-react': minor
---

Redesign the player chrome and typography.

Replaces the prototype transport with a real control bar: drawn SVG icons, a scrubber with chapter markers for gates, captions and speed controls, 44px touch targets, visible focus rings, and a scene strip that lists chapters by their own headings rather than by index.

Styles ship as one injected stylesheet rather than inline styles, so hover, focus and reduced-motion actually work — and consumers need no CSS build step. Every class is prefixed, so a host cannot collide with it.

Painters now use the theme's fonts: a display serif for prose and headings, a clean sans with tabular figures for tables, charts and statistics. Neither was set before, so everything fell back to whatever the SVG default happened to be.
