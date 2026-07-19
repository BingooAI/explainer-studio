---
'@bingoo.ai/explainer-core': minor
'@bingoo.ai/explainer-kernel': patch
---

Add the core package: the `explainer/v1` document format and versioned rendering profiles.

Elements name a layout region and carry no coordinates, so an overlapping layout is unrepresentable rather than merely discouraged. Every human-readable string is a key into a locale bundle, keeping the document language-neutral. Element types, gate kinds, layout templates and phases are registry keys rather than frozen enums, so a plugin can add one without a core release.

Profiles hold the timing, layout, type-scale and per-script speech numbers as versioned data. A document pins the versions it was authored against, so retuning the house style cannot silently re-render a lesson made last term. Speech rate and glyph width are keyed by script rather than assuming Latin.

KernelError now folds its location and hint into the message, since `.message` is what a stack trace and most loggers show; the structured parts remain available on the error.
