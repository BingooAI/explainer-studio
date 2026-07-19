---
'@bingoo.ai/explainer-editor': minor
---

Add the editor's operation layer: every change is a pure op returning a new document and its inverse.

Undo, redo, version history and an audit trail all derive from that pairing, and none can drift from what actually happened — the inverse is produced by the same code that made the change, while it still held the old value.

Operations are a registry, so a kit that adds an element type can add operations for editing it without touching the built-ins. Removing an element also removes the beats that referred to it, and restoring brings them back, because leaving them produces a document the lint gate rejects from an action the author thought was safe.
