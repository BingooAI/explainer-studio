# ADR 0002 — A kernel package for registry and configuration primitives

- **Status:** Accepted
- **Date:** 2026-07-19
- **Supersedes:** nothing
- **Amends:** `docs/ARCHITECTURE.md` §3 (package list)

## Context

ARCHITECTURE §2 makes runtime registries the mechanism behind almost every rule: providers,
layout templates, themes, locale packs, question kinds, kits and exporters are all
registries, and §2.4 defines a layered configuration resolver. Phase 0 committed to
delivering both before anything else, because every later package would otherwise be written
against static imports and R1 would become unrecoverable.

The package list in §3 does not say where those primitives live. Two candidates:

**Put them in `core`.** No new package, and `core` is already the foundation. But `providers`
needs a registry and nothing else from `core`; depending on it would drag the whole engine —
layout, choreographer, `frame` — into anything that only wires providers. That directly
undermines R16 and the tracked bundle budget for the player path. A host embedding only the
provider registry should not ship the layout engine.

**A small dedicated package.** One more package to maintain, and ARCHITECTURE §3 says not to
invent packages. Against that: the dependency shape is genuinely different. Registry and
config are infrastructure that `core` itself consumes, not part of the engine. Placing them
inside `core` inverts the dependency direction and makes the engine unavoidable for anyone
who wants any other piece.

## Decision

Create `packages/kernel` (`@bingoo.ai/explainer-kernel`) holding the registry primitives, the
configuration resolver, environment interpolation, and the shared error type.

Constraints on it, which are the reason it can be depended on freely:

- **Zero runtime dependencies except zod.** If it grows a third dependency, that is a signal
  something belongs elsewhere.
- **Fully pure** under the R7 rule — no I/O, no environment access, no clock, no randomness.
  It merges, validates and looks things up; the application supplies the values.
- **No module-level state.** `createRegistry()` returns an instance (R16). Two lessons with
  different kit sets must coexist in one process, and a multi-tenant host must never leak
  configuration between tenants.

`core`, `quality`, `providers` and `generator` depend on `kernel`. `kernel` depends on
nothing in this repository.

## Consequences

- ARCHITECTURE §3 gains a package. The "do not invent packages" rule stands; this ADR is the
  exception being recorded rather than taken silently.
- The registry API is fixed early and everything is built against it, so getting it wrong is
  expensive. Mitigated by keeping the surface small and covering it with tests before any
  consumer exists — which is the reason for doing this in Phase 1 rather than later.
- Reading configuration files and the environment stays in the application layer, because a
  pure package cannot do I/O. `kernel` receives already-loaded layers. This is slightly more
  wiring at the edge, and it is what makes the resolver testable without a filesystem.
- If `kernel` ever needs to import from `core`, the split was wrong and this ADR should be
  superseded rather than worked around.
