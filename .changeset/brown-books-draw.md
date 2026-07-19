---
'@bingoo.ai/explainer-react': minor
'@bingoo.ai/explainer-core': minor
---

Make the player real: nine painters, slot cards, in-canvas captions, and a theme registry.

Adds the painters that make a lesson look like a lesson — drawn strokes with working `drawOn`, lists that reveal a point at a time, tables, four chart kinds, statistics and quotations. Slot cards give grouped regions a panel, which is what turns floating shapes into a composition. Captions are painted inside the SVG so a headless export carries them.

Four defects in the implementation this was ported from are fixed rather than reproduced: four conflicting glyph-width constants collapsed into the engine's one, so the quality gate and the renderer finally agree; a fit loop that used lines wrapped at the wrong size; a chart reveal that drew a line across gaps; and table cells that overflowed silently instead of truncating.

Core now exposes each item's `slot` and the layout's slot rectangles on `RenderModel`.
