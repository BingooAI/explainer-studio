---
'@bingoo.ai/explainer-react': minor
'@bingoo.ai/explainer-core': minor
---

Make it a player rather than a frame renderer: transport, keyless narration, and the four remaining painters.

`Transport` gives play, pause and a scrubber that marks where the gates are — a teacher previewing a lesson needs to see where it stops and asks something. `useSpeechClock` narrates through the browser's own speech synthesis, so the keyless path speaks with no account and no network, and the playhead reads the speech position rather than accumulating frames.

Adds the stick figure with a real walk cycle, diagrams, connectors and the scenery backdrop. Connectors and diagram edges both intersect the node boxes to find their endpoints, so an arrow always touches the shapes.

Core exposes `aspect` and every element's rect on `RenderModel`, and the layout profile now carries one horizon shared by whatever paints the ground and whatever stands on it.
