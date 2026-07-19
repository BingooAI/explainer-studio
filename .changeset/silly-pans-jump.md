---
'@bingoo.ai/explainer-core': patch
---

Fix two reveal defaults that made content invisible.

An element nobody choreographed now shows everything rather than nothing. `itemsAt` returned 0 for an element with no authored item reveals, so every un-choreographed list, table and chart rendered as an empty panel — and a renderer could not tell "no build authored" from "build authored, nothing revealed yet".

Revealing an item now reveals the element it belongs to. An author who wrote `revealItem` without a matching `reveal` got nothing at all: the element stayed hidden, `frame` dropped it, and the carefully sequenced items were invisible.
