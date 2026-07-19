# Explainer Studio — Who it is for, what they get, and when

> Companion to [`ARCHITECTURE.md`](ARCHITECTURE.md). That document is how it is built; this
> one is who it is built for and what actually comes out of it.
>
> **Status: v0.1, living.** No dates appear here on purpose — the ordering and the gates are
> the commitments, not a calendar. Writing dates we cannot keep would make every other
> statement here less trustworthy.
>
> **This is maintained by a very small team**, which is the most important constraint on
> everything below. It argues for three things: ship the thin public slice early (§5) so the
> project is not invisible for months; treat the phase order as a queue rather than a
> roadmap; and prefer the smallest genuinely usable thing over the complete one. The scope
> here is deliberately larger than can be finished quickly — it is a direction, and the
> phases exist so that stopping at any boundary still leaves something real.

---

## 1. Who this is for

Four audiences, in priority order. When they conflict, the one higher up wins.

### 1.1 A teacher — the primary user

Teaches a class, has a lesson to prepare tonight, is not technical, and will not read
documentation. May have a textbook chapter, a slide deck, or nothing but a topic in mind.

**What they need:** a finished explainer video for tomorrow's lesson, in their language,
that says what they actually want to teach — without learning video editing, and without a
surprise bill.

**What they get:** an app they double-click. They describe the lesson, approve what it
plans to teach, watch it build, fix anything they disagree with, and export.

### 1.2 A school, district or ministry — the deployer

Has policy constraints: data cannot leave the country, or the building; budgets are fixed;
procurement asks about licensing and accessibility.

**What they need:** something they can run on their own infrastructure with their own keys
or no keys at all, that does not send student data anywhere, and whose licence their legal
team will accept.

**What they get:** a self-hosted install (Docker or per-machine), central key management,
an offline mode using local models, and Apache-2.0 with no CLA.

### 1.3 A developer or product team — the integrator

Runs an LMS, a courseware product, or a platform, and wants explainer generation inside it
rather than as a separate tool.

**What they need:** npm packages that work in their stack without adopting our server, our
auth or our database.

**What they get:** `npm i @bingoo.ai/explainer-core @bingoo.ai/explainer-react` — a player
component, the engine, and optionally the generator, all behind ports they wire to their own
storage and auth. See ARCHITECTURE §13.

### 1.4 A contributor — the reason it stays alive

Wants to add a manipulative for their subject, a locale, a template, or a provider.

**What they need:** to add something without touching core, and to have their change
accepted on clear criteria.

**What they get:** registries for every extension point, `pnpm kit:validate` as the contract,
and a rule that a PR adding a kit must not modify an existing file.

### Explicitly not the audience

**Students.** They may watch the output, but they are not users of this tool, and this repo
holds no student data (ARCHITECTURE R12). That boundary keeps the compliance surface near
zero and must not erode.

---

## 2. What actually comes out of it

A lesson produces several artifacts. **All of them belong to the user, and none require us
to remain in existence.**

| Artifact | Format | What it is for |
|---|---|---|
| **Lesson document** | `explainer/v1` JSON | The source of truth. Portable, diffable, git-versionable, re-renderable. Openly specified in `docs/spec/`. |
| **Playable lesson** | in-app, embedded, or shared link | Interactive — gates pause for the learner to answer. This is the richest form. |
| **Video** | MP4 | The universally usable form. Interactivity is flattened out; captions are burned in or shipped alongside. |
| **Captions** | WebVTT / SRT | Accessibility requirement, and often a legal one. Generated from narration, never an afterthought. |
| **Narration audio** | per line, per language | Reusable; regenerating a lesson does not re-pay for unchanged lines. |
| **LMS package** | SCORM 1.2 / 2004, xAPI | Feeds the LMS a school already runs. |

The interactive form is the one worth the effort, but **the MP4 is what gets shared**, so
neither is optional.

**The document outliving the tool is a design goal, not a side effect.** A teacher who
stops using Explainer Studio keeps a readable, specified file — not an export from a dead
product.

---

## 3. What using it actually looks like

The teacher's path, end to end. This is the flow the phases exist to deliver.

```
1.  "Teach photosynthesis to grade 7, 5 minutes, Vietnamese"
    (optionally: drop in the textbook chapter as a PDF)
         │
2.  BRIEF        the studio reads the material and proposes:
                 objectives · key facts (each with a page reference) ·
                 common misconceptions · suggested length
         │
3.  ★ TEACHER APPROVES OR EDITS THE BRIEF ★
                 the decision point of the whole product — see below
         │
4.  GENERATE     script, scenes, visuals, timing, narration.
                 Progress is visible; cost is visible.
         │
5.  REVIEW       watch it. Every scene is editable — change wording,
                 swap an image, adjust timing, remove a scene.
         │
6.  EXPORT       play in class · MP4 · captions · SCORM · share a link
```

**Step 3 is the one that makes this trustworthy.** Fixing a wrong objective there costs
seconds. Finding it after twenty scenes, narration and images have been generated and paid
for costs a rebuild. It is also the honest division of labour: **the teacher decides what is
taught; the studio decides how it is staged.**

**Step 5 is not a formality.** Everything is generated, so everything is editable. A tool
that produces an unfixable video is a demo, not a product.

### What we do not claim

Deterministic gates check that a lesson is **structurally** valid — layout fits, narration
syncs, the pedagogical arc is complete. **They do not check whether it is factually
correct.** A wrong statement inside a structurally perfect lesson will pass every gate.
The teacher reviews; we make reviewing fast and fixing easy. Any wording that implies
otherwise is a bug (ARCHITECTURE §14, ENGINEERING.md §6).

---

## 4. How each audience receives it

| Audience | Channel | Prerequisite |
|---|---|---|
| Teacher | Signed desktop installer, macOS / Windows / Linux | None. No account, no key. |
| School / district | Docker Compose, or the desktop app per machine | An admin, once. |
| Integrator | npm packages | A JS/TS project. |
| Contributor | The repo | `git clone && pnpm dev` — works with no key, no network. |

Two commitments underneath this table:

- **The keyless path always works.** Editor, player and sample lessons run with no account,
  no API key and no network. Only generation needs a model, and a local model satisfies it.
- **Parity.** Anything a hosted instance can do, a self-hosted install does with its own
  keys. Hosting may add convenience — never capability. The moment the open build is the
  crippled one, the openness is marketing.

---

## 5. The plan — what ships, and to whom

Each phase is gated on the one before. **Nothing is dated**; the ordering is the commitment.

| Phase | What is built | Who can use the result |
|---|---|---|
| **0** | Repo furniture, CI, config resolver, registry primitives, format spec skeleton | Nobody yet — foundations |
| **1** | The engine: document format, layout, choreography, `frame`, the three quality gates, golden tests | Nobody yet — but the riskiest part is now locked down and tested |
| **2** | Providers, adapters, the SVG player, base primitives | **Contributors.** A hand-authored lesson plays. Keyless path green in CI. |
| **3** | Brief building with teacher approval, then the generation pipeline | **Early testers.** A brief becomes a validated lesson. |
| **4** | Scene editor, studio app, settings UI, onboarding wizard, localised interface | **Teachers who are willing to install a dev build.** First genuinely usable product. |
| **5** | Desktop app — signed installers, bundled runtime, cost visibility | **Teachers, properly.** The adoption moment. |
| **6** | Kit port: wave 1 proves the contract, wave 2 completes it | **Contributors**, at scale — the extension surface opens |
| **7** | CLI and exporters — MP4, captions, SCORM, xAPI | **Schools and LMS users.** Output leaves the tool. |

### Two things about this ordering

**A thin public slice should ship before Phase 4.** Six months of silence is how an
open-source project arrives to no audience. After Phase 2 there is a real playable lesson —
publish it, with the spec and the packages, even though nothing generates yet. Early
contributors care about the engine and the format; they do not need the studio.

**Phase 1 is the risky one.** It is pure, deterministic and golden-testable, which means it
can be locked down hard before anything depends on it. Time spent over-testing there is
cheaper than any bug found after four phases are built on top.

---

## 6. What success looks like

In order — later ones only matter if the earlier ones hold:

1. A teacher who is not technical produces a lesson they are willing to show a class,
   without asking anyone for help.
2. A school runs it on their own hardware with no data leaving the building.
3. An outside contributor lands a kit or a locale without touching core.
4. Someone builds something on the packages that we did not plan for.
5. A lesson document authored in year one still renders in year three.

### Non-goals

- Not an LMS. It makes lessons; it does not run classes, enrol students or store grades.
- Not a general video editor. Scene-level editing of *explainer* documents, nothing more.
- Not a curriculum authority. It stages what a teacher decides to teach.
- Not a fact-checker (§3).
- Not a funnel. It must work fully with no Bingoo account, forever.
