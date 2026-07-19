## What and why

<!-- What changes, and what problem it solves. The diff shows what; explain why. -->

## Blast radius

<!-- Anything shared that this touches: schemas, ports, registries, profiles, public exports.
     Say plainly whether it is a breaking change. -->

## How it was tested

<!-- What you actually ran, not what should pass. Include failure cases you tried. -->

## Checklist

- [ ] `pnpm check` passes (lint · typecheck · test · build)
- [ ] Tests added — a bug fix includes the regression test that would have caught it
- [ ] Nothing hardcoded that belongs in a registry, profile or config (R1)
- [ ] No vendor named outside `packages/adapters` (R8)
- [ ] Pure packages stay pure (R7) — no React, Node builtins, `fetch`, `process.env`,
      `Date.now()` or `Math.random()`
- [ ] The keyless localhost path still works (R9)
- [ ] No natural-language string or locale-specific constant added to the engine (R4)
- [ ] Accessibility checked — keyboard, both themes, reduced motion
- [ ] Commits signed off (`git commit -s`), no tooling attribution
- [ ] `pnpm changeset` run if a public API changed
- [ ] Architecture decision changed? → `docs/ARCHITECTURE.md` updated **and** an ADR added

## Anything you are unsure about

<!-- Honesty here is genuinely more useful than a clean checklist. -->
