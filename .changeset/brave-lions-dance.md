---
'@bingoo.ai/explainer-core': minor
---

Add the choreographer: cubic-bezier easing, pose interpolation, an emphasis registry, and `compileScene`.

`compileScene` turns beats into a timeline that can be sampled at any instant. Beats fire when their cue was actually spoken, so a lesson stays in sync after narration is regenerated in another language at a different speed; even spacing is the fallback for a scene nobody has voiced yet.

Easing is solved in the engine rather than delegated to the platform, so a headless render and a browser produce identical numbers. Emphasis is a registry of keyframe effects, validated at registration to return the element to rest — an effect that leaves it displaced would silently corrupt the layout.
