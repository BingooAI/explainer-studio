<div align="center">

# Explainer Studio

**Turn a lesson brief into an editable explainer video — script, visuals, narration and timeline.**

Describe a lesson or drop in your teaching material. Explainer Studio plans it, generates it,
and lets you edit every scene before exporting.

Self-hostable · model-agnostic · runs fully offline · Apache-2.0

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--alpha-orange.svg)](docs/PRODUCT.md)
[![Docs](https://img.shields.io/badge/docs-architecture-informational.svg)](docs/ARCHITECTURE.md)

[Product](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · [Tiếng Việt](README.vi.md)

</div>

---

> [!WARNING]
> **Pre-alpha.** The architecture is settled and documented; the code is being built in
> phases. Nothing is published to npm yet. See [the plan](docs/PRODUCT.md#5-the-plan--what-ships-and-to-whom)
> for what ships when. Stars and issues welcome; production use is not yet sensible.

## Why this exists

Making a good explainer video takes hours a teacher does not have. Tools that generate one
usually produce something you cannot fix, lock you to one AI vendor, send your material to
a server you do not control, or quietly stop working when the subscription lapses.

Explainer Studio is built the other way around:

- **Everything is editable.** The output is a structured document, not a rendered blob.
  Change the wording, swap an image, retime a scene, remove it entirely.
- **Every lesson is validated by code, not by a model.** Deterministic gates check layout,
  narration sync and pedagogical structure before anything is saved. A weaker model produces
  a worse lesson — never an invalid one.
- **No vendor is required.** Anthropic, OpenAI-compatible endpoints and Ollama all work.
  Run it entirely on your own machine with no API key and no network.
- **Your lessons outlive the tool.** The document format is openly specified. Stop using
  Explainer Studio and you still have a readable, re-renderable file.

## What you get out of it

| Artifact | Format |
|---|---|
| Lesson document | `explainer/v1` JSON — portable, diffable, git-versionable |
| Interactive lesson | in-app, embedded, or a shared link — pauses for learner answers |
| Video | MP4 |
| Captions | WebVTT / SRT |
| Narration audio | per line, per language |
| LMS package | SCORM 1.2 / 2004, xAPI |

## How it works

```
"Teach photosynthesis to grade 7, 5 minutes"  (+ your textbook chapter, optionally)
        │
   ①  BRIEF      proposes objectives, key facts with page references, misconceptions
        │
   ②  ★ YOU APPROVE ★     the point where you decide what is taught
        │
   ③  GENERATE   script · scenes · visuals · timing · narration
        │         validated by deterministic gates at every attempt
   ④  REVIEW     watch it, edit any scene
        │
   ⑤  EXPORT     play in class · MP4 · captions · SCORM · link
```

Step ② is deliberate. Fixing a wrong objective there takes seconds; finding it after twenty
scenes have been generated and paid for takes a rebuild.

> **What we do not claim.** The gates check that a lesson is *structurally* sound — layout
> fits, narration syncs, the teaching arc is complete. **They do not check whether it is
> factually correct.** You review the content; we make reviewing fast and fixing easy.

## Quick start

Requires [Node.js](https://nodejs.org) 22+ and [pnpm](https://pnpm.io) 9+.

```bash
git clone https://github.com/BingooAI/explainer-studio.git
cd explainer-studio
pnpm install
pnpm dev
```

Open <http://localhost:3000>. **No account, no API key, no network call** — the editor,
player and sample lessons work out of the box, using your browser's built-in voice.

To generate lessons, connect a model. Fully local, no key, nothing leaves your machine:

```bash
ollama pull qwen2.5:14b
# then point the studio at it in Settings, or:
export LLM_BASE_URL=http://localhost:11434/v1
```

Or use a hosted provider — Anthropic, OpenAI, Groq, or anything OpenAI-compatible — by
pasting a key in Settings. Costs are shown before you generate and totalled after.

## Use it in your own project

The engine and player are published as packages, so you can embed lessons without adopting
our server, auth or database.

```bash
npm i @bingoo.ai/explainer-core @bingoo.ai/explainer-react
```

```tsx
import { ExplainerPlayer } from '@bingoo.ai/explainer-react'

<ExplainerPlayer doc={doc} bundle={bundle} locale="en" />
```

See [ARCHITECTURE §13](docs/ARCHITECTURE.md) for the three integration depths — from using
only the open document format, to embedding the full authoring experience.

## Self-hosting

| You are | How to run it |
|---|---|
| A teacher | Desktop installer — macOS, Windows, Linux *(Phase 5)* |
| A school or district | Docker Compose, your own keys or none at all |
| A developer | `pnpm dev`, as above |

Storage is your choice: local filesystem by default, or any S3-compatible bucket —
Cloudflare R2, MinIO, Backblaze B2, AWS S3. No student data is ever collected; this tool
processes curriculum, not learners.

## Documentation

| | |
|---|---|
| [PRODUCT.md](docs/PRODUCT.md) | Who it is for, what it produces, the release plan |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system is designed and why |
| [ENGINEERING.md](docs/ENGINEERING.md) | Rules for changing this repo — read before contributing |
| [docs/spec/](docs/spec/) | The `explainer/v1` document format |
| [docs/adr/](docs/adr/) | Architecture decision records |

## Contributing

Contributions are genuinely designed for, not merely tolerated. Every extension point is a
registry: **adding a manipulative, a locale, a layout template, a provider or an exporter
should not require changing a single existing file.** If it does, that is a bug in our
design — please say so.

Start with [CONTRIBUTING.md](CONTRIBUTING.md). We use [DCO](https://developercertificate.org/)
sign-off (`git commit -s`) and **no CLA** — deliberately, so the project structurally cannot
be relicensed or taken private later.

## Licence

[Apache-2.0](LICENSE) for the entire repository. Copyright © Bingoo.ai.

The licence covers the code; the name and logo are covered by the trademark policy.
Apache-2.0 grants no rights to the "Bingoo" or "Explainer Studio" names.
