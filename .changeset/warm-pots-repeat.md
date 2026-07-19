---
'@bingoo.ai/explainer-react': minor
---

Rebuild the player chrome: dark controls, chapter menu, scrub previews and configurable question placement.

Chapters moved from a permanent second row into a menu opened from the control bar. Hovering the scrubber renders a live preview of that exact instant, so hover and click always agree. Questions can appear below the player, over it, or beside it.

Fixes a gate that stayed on screen after being answered — the panel was keyed off the scene having a gate rather than off a question actually waiting, so Continue appeared to do nothing.

Speeds, skip distance and the entire chrome palette are configurable rather than fixed.
