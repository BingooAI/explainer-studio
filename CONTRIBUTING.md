# Contributing to Explainer Studio

Thank you for considering it. This project is designed so that outside contributions are
straightforward rather than merely permitted.

**The core promise:** adding a manipulative, a locale, a layout template, an AI provider or
an exporter should not require changing a single existing file. Every extension point is a
runtime registry. **If you find yourself needing to modify core to add something, that is a
bug in our design — please open an issue and tell us.**

## Before you start

- Read **[docs/ENGINEERING.md](docs/ENGINEERING.md)** — the project constitution. It is the
  short answer to almost any "how should I do this?" question.
- Read **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** if you are touching the engine.
- **For anything non-trivial, open an issue first.** A rejected PR wastes your evening; a
  five-minute conversation does not. We would rather discuss the approach than decline the
  result.

## Setting up

Requires Node.js 22+ and pnpm 9+.

```bash
git clone https://github.com/BingooAI/explainer-studio.git
cd explainer-studio
pnpm install
pnpm dev
```

It runs with no API key and no network access. If it does not, that is a bug worth
reporting — the keyless path is a tested guarantee.

Before pushing:

```bash
pnpm check    # lint · typecheck · test · build
```

## Branches and commits

- Branch from `main`: `feat/short-description`, `fix/…`, `docs/…`, `chore/…`
- [Conventional Commits](https://www.conventionalcommits.org/): `feat(core): add pose interpolation`
- **Sign off every commit** with `git commit -s` (the [DCO](https://developercertificate.org/) —
  it certifies you have the right to submit the code). We take **no CLA**, deliberately:
  without one, this project structurally cannot be relicensed or taken private.
- Commits are authored by the person who wrote the change, and by nobody else.
- If you change a public API, run `pnpm changeset` and commit the result. CI will ask.

## What a good PR looks like

- **One logical change.** Two unrelated fixes are two pull requests.
- **Tests included.** A bug fix ships with the regression test that would have caught it; a
  feature ships with tests for its failure modes, not just its happy path.
- **A description that explains *why*.** The diff already shows what changed.
- **Honest about what you did not do.** "I did not test this on Windows" is useful. A
  surprise later is not.

We review for correctness first, then design fit against ENGINEERING.md, then style. Expect
questions — they are about the code, never about you.

## Adding a kit (manipulative)

The most common contribution, and the most self-contained.

```
packages/kits/your-kit/
  kit.json        manifest: id, version, title, license, author, tags, verbs
  schema.ts       zod: params + state
  kit.ts          defaults · verbs · pure check(state, answer)
  paint.tsx       the painter
  examples.json   golden fixtures — mandatory
  README.md
```

Then `pnpm kit:validate`. Three rules the validator enforces:

- **Everything except `paint.tsx` must be pure** — no React, no Node builtins, no `Date.now()`.
  A kit has to work headless for video export and golden tests.
- **`examples.json` is mandatory.** It is both the test corpus and the picker preview.
- **No bundled assets.** No images, icons, fonts or sounds. A kit draws itself from
  primitives and must render with no provider configured. Anything genuinely needing a
  picture requests it from the image provider at authoring time.

Grading is code — a kit's `check` is pure and deterministic. Never a model's opinion.

## Adding a provider, locale, template or exporter

All follow the same shape: a descriptor plus a factory, registered at startup, validated by
zod. See ARCHITECTURE §2.1. Adding one should touch no existing file — that is the
acceptance test.

## Reporting bugs

Include: what you expected, what happened, the version or commit, your OS and Node version,
and which providers were configured. A failing test is the most useful bug report there is.

**Security issues do not go in the issue tracker** — see [SECURITY.md](SECURITY.md).

## Translations

The interface and the lesson content are translated separately. UI strings are application
chrome; locale packs carry lesson content and speech-rate metrics. Both are welcome; please
say which you are working on so two people do not do it twice.

## Licence

By contributing, you agree your work is licensed under [Apache-2.0](LICENSE), and your DCO
sign-off certifies you have the right to submit it.

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). It is enforced.
