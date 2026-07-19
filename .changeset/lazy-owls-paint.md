---
'@bingoo.ai/explainer-react': minor
---

Add the React SVG renderer: `Stage`, `ExplainerPlayer`, `usePlayer`, and a painter registry.

`Stage` paints a `RenderModel` and owns no timing, layout or easing — a renderer that recomputed any of them would be a second source of truth. Painters are a registry keyed by element type, so a plugin ships its painter alongside its type and the Stage never grows a branch.

`usePlayer` reads the audio position while a narration line is playing and falls back to requestAnimationFrame between lines. Accumulating frames alone drifts slowly enough to look fine in a short test and be visibly wrong by the end of a lesson.

SVG rather than canvas: text stays selectable and reachable by a screen reader, elements are inspectable, and the tree serialises for headless export.
