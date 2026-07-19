// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

/**
 * The cue marker format, and the one place it is parsed.
 *
 * This lived in two files as a copied regex, and the copy is the actual defect: the same
 * ReDoS was fixed once in the kernel's interpolation and then written twice more here.
 * A pattern duplicated across modules cannot be fixed once, so it stops being fixed at all.
 */

/**
 * `[[cue:name]]`.
 *
 * The body excludes `[` as well as `]`, and that is load-bearing rather than tidy. With
 * `[^\]]*` the class could swallow a following `[[cue:` sequence, so input consisting of
 * `[[cue:` repeated forced quadratic backtracking — a polynomial ReDoS. Barring `[` means
 * a nested marker always terminates the class and matching stays linear.
 *
 * A narration script is not trusted input: it can come from a model, from an imported
 * lesson, or from a file somebody edited by hand.
 */
const CUE_MARKER = /\[\[cue:[^[\]]*\]\]/g

/** Removes cue markers, leaving the spoken words. Whitespace is left as it was found. */
export function stripCues(script: string): string {
  return script.replace(CUE_MARKER, '')
}

/**
 * Removes cue markers and normalises whitespace — what a viewer should actually read.
 *
 * Stripping a marker leaves a gap where it stood, so a caption built with `stripCues`
 * alone shows doubled spaces at every beat.
 */
export function captionText(script: string): string {
  return stripCues(script).replace(/\s+/g, ' ').trim()
}

/** The cue names a script declares, in the order they appear. */
export function cueNames(script: string): string[] {
  return [...script.matchAll(CUE_MARKER)].map((match) => match[0].slice('[[cue:'.length, -2))
}
