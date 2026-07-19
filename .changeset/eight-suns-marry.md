---
'@bingoo.ai/explainer-core': minor
---

Add layout resolution: templates, `resolveLayout`, and the character budget.

Templates are teaching moves with named slots defined per aspect, so a two-column comparison becomes two stacked rows in portrait rather than two unreadable narrow columns. Slots are validated as disjoint at registration, which is why the layout algorithm needs no collision detection: slots cannot overlap and children flow sequentially within one.

`resolveLayout(scene, aspect)` is pure and headless, so the renderer and the quality gate ask the same function the same question. It reports issues rather than throwing, each carrying a mechanical fix, so generation repair is deterministic rather than a vague retry.

`charBudget` turns a rectangle and a type rung into a character count, using per-script glyph metrics. It lives in the engine so that the limit the model is told and the size the renderer uses are the same number.
