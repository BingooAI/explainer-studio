# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through
[GitHub Security Advisories](https://github.com/BingooAI/explainer-studio/security/advisories/new),
or email **security@bingoo.ai**.

Please include: what the issue is, how to reproduce it, which version or commit, and what an
attacker could achieve. A proof of concept helps enormously.

**What to expect:** acknowledgement within 3 working days, an initial assessment within 7,
and regular updates until it is resolved. We will credit you in the advisory unless you
prefer otherwise. We are a small team — if you have not heard back within a week, please
chase us; it means something went wrong, not that we are ignoring you.

## Supported versions

Pre-1.0, only the latest release is supported. Once 1.0 ships, the current major receives
security fixes and the previous major receives them for six months.

## Scope

**In scope:** the packages and applications in this repository, the self-hosted deployment
path, the document format, and our release and supply-chain process.

**Out of scope:** vulnerabilities in third-party AI providers, models or storage backends;
issues that require an already-compromised host; and third-party kits or plugins, which are
covered below.

## What this project does and does not defend

Being precise here matters more than sounding secure.

**Untrusted inputs we design against:**

- **Model output.** Everything a model returns is parsed with zod, whitelisted against the
  registry, clamped and escaped. It is never rendered as markup.
- **Uploaded teaching material.** A PDF or slide deck reaching a model is a genuine prompt
  injection path. Model output stays confined to the document schema, so injected
  instructions can influence what is read, not what the system does.
- **Configuration.** A provider `baseUrl` is an SSRF vector; fetches driven by config or
  model output are restricted from internal network ranges by default.
- **Media.** Uploads are type- and size-validated, stored outside the web root, and served
  with restrictive headers. **SVG is sanitised** — it is executable, and this project handles
  SVG throughout.

**What we do not defend:**

- **Third-party kits and plugins execute with full application privileges.** There is no
  sandbox. Installing one is a trust decision, exactly like installing any npm package. We
  will not claim isolation we have not built.
- **Generated content is not fact-checked.** The quality gates verify structure — layout,
  narration sync, teaching arc — not truth. Content moderation is an optional stage that is
  **off by default**. Review lessons before showing them to a class.

## Data handling

This project processes **curriculum, not learners**. There is no student PII model and there
should never be one. Nothing is sent anywhere unless you configure a provider, and a fully
local configuration (Ollama, Piper, filesystem storage) sends nothing at all.

API keys are held server-side or in the OS keychain. They are never written into a lesson
document, an export, a client bundle, or a log.

## Our practices

Every pull request runs CodeQL, secret scanning, a dependency audit and a licence
compatibility check. GitHub Actions are pinned by commit SHA. Releases carry a CycloneDX
SBOM, Sigstore signatures and npm provenance. Two-factor authentication is required on the
organisation and on npm.

A full penetration test is scheduled before the first release that accepts file uploads or
stores credentials, and repeated whenever the trust boundary changes.
