# ADR 0001 — Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-19

## Context

The architecture is documented in `docs/ARCHITECTURE.md`, which states the design as it
stands. It does not record *why* an option was chosen over its alternatives, or what was
believed at the time. Six months later that reasoning is the expensive part to reconstruct,
and without it a settled decision gets relitigated by whoever arrives next — including our
future selves.

This matters more than usual here for two reasons: the project is maintained by a very small
team, so context lives in few heads; and it is open source, so contributors need to
understand a constraint before they can respect it.

## Decision

Record each significant architectural decision as an ADR in `docs/adr/`, numbered
sequentially, following Michael Nygard's format: context, decision, consequences.

An ADR is required when a change alters `docs/ARCHITECTURE.md`, introduces or removes a
dependency that is hard to reverse, changes the document format, or settles a trade-off that
a reasonable person would question later.

ADRs are immutable once accepted. A decision that changes gets a new ADR that supersedes the
old one; the original stays, marked as superseded. The record of having been wrong is part
of the value.

## Consequences

- Every non-obvious constraint has a findable rationale, so "why is it like this?" has an
  answer that is not a person's memory.
- Decisions already made and recorded in ARCHITECTURE.md — the registry model, Apache-2.0
  throughout, ffmpeg over Remotion, packages built with tsup, SQLite by default — should be
  backfilled as ADRs as they are revisited, not in a single retrospective batch that nobody
  reads.
- Small overhead per decision. Accepted deliberately: the cost is minutes when writing and
  hours saved when questioning.
