---
'@bingoo.ai/explainer-core': minor
---

Add the runtime: `buildProgram` and `frame(program, t)`.

`buildProgram` lays scenes end to end with their timelines and layouts resolved up front, so sampling a frame stays a cheap lookup. Scene duration is the longer of its visuals and its voice, using measured narration timings when text-to-speech has run and a per-script estimate before that. Cue marks are shifted from line-relative to scene-relative time.

`frame(program, t)` is pure: the same `t` yields the same model, and therefore the same pixels on any renderer. It drops invisible items, sorts back to front with stable tie-breaking, resolves the active caption and the word being spoken, and opens a gate only once its scene has played.

This completes the engine loop — a parsed document and bundle now play.
