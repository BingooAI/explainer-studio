---
'@bingoo.ai/explainer-core': patch
---

Fix a polynomial ReDoS in cue-marker parsing and consolidate the pattern into one module.

The marker body was `[^\]]*`, which could swallow a following `[[cue:` sequence and forced quadratic backtracking on repeated unterminated markers. Narration scripts are not trusted input — they can come from a model, an imported lesson, or a hand-edited file.

The pattern existed as a copy in two files, which is the deeper defect: a regex duplicated across modules cannot be fixed once. Cue parsing now lives in a single module, which also gains `cueNames`.
