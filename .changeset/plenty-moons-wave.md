---
'@bingoo.ai/explainer-providers': minor
'@bingoo.ai/explainer-core': patch
---

Add the providers package: port interfaces, the cue synchronisation spine, and configuration-driven routing.

No vendor is named anywhere in it. Capabilities are declared on each provider's descriptor, so code asks "does this support word timings?" and never "is this OpenAI?".

`cueMarksFrom` re-times each `[[cue:x]]` marker to the word that follows it, which is what lets a lesson survive being regenerated in another language at a different speaking speed. `evenWords` provides synthetic timings so a lesson plays before anyone has paid for audio.

Routing is an ordered list from configuration with failure collection, so a key that expires mid-lesson falls through to the next provider and says so rather than stopping the work.

Core gains `splitCues`, needed to relate a marker to where in the speech it sits.
