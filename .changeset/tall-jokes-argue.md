---
'@bingoo.ai/explainer-quality': minor
---

Add the quality package: three deterministic gates that never call a model.

`lintDocument` checks what the schema cannot see — cue integrity in both directions, beat targets and pose names, duplicate ids, and string and narration coverage across every declared locale.

`checkScene` measures with the same `resolveLayout` the renderer calls, at every aspect, and reports text overflow with the exact number of characters to cut.

`checkLesson` checks pedagogical shape against a registered arc, so a curriculum with a different pedagogy registers its own rather than patching ours. It also catches the lifeless case: a scene that is really a slide, or narration playing while nothing moves.

Every finding carries a mechanical fix, and `repairInstructions` renders them as the text fed back to a model after a failed attempt.
