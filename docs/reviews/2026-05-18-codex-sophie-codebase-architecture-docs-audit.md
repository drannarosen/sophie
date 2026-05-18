# 2026-05-18 Codex Sophie codebase + architecture + docs audit

Reviewer: Codex  
Scope: Sophie platform repo, package architecture, and `docs/website/` MyST documentation  
Review stance: adversarial code review, with pedagogy/architecture assessment

## Bottom line

Sophie is already a serious, unusually coherent attempt at a schema-driven STEM learning platform. It is not "a Quarto theme with widgets." The strongest emerging identity is:

> Sophie is a TypeScript/Astro/MDX platform for AI-supervised STEM textbook authoring where pedagogy components, registries, and audits make the structure of scientific reasoning machine-readable.

The best parts are genuinely state-of-the-art in direction: the pedagogy index, the registry ecosystem, explicit epistemic roles, Zod-as-source-of-truth schemas, durable ADRs, and the insistence that AI authoring remain human-supervised rather than autonomous.

My honest assessment: Sophie is not yet a SoTA STEM pedagogy package in the shipped-product sense. It is a promising SoTA architecture with a working vertical slice and strong test infrastructure, but the repo currently overstates shipped capability in several docs, has at least one runtime contract gap, and tolerates documentation/link warnings that will become expensive once external instructors depend on the material.

## High-confidence findings

### P1 - IndexedDB fallback is promised, cited as validated, but not implemented

`docs/website/decisions/0007-persistence-indexeddb.md:140` promises that when IndexedDB is unavailable, `ResponseStore` swaps to `MemoryResponseStore`, emits a warning, and `useInteractive` exposes `persistence: 'session' | 'persistent'`. `docs/website/decisions/0053-conformance-failure-modes.md:262` repeats that this is the CF5 runtime fallback contract.

The implementation does not match that contract. `packages/components/src/runtime/useInteractive.ts:52` caches only `ResponseStore` instances and `getStore()` always constructs `new IndexedDBResponseStore(course)` at `packages/components/src/runtime/useInteractive.ts:55`. `packages/components/src/runtime/ResponseStore.ts:2` says Phase 0 ships one implementation, `IndexedDBResponseStore`. There is no `MemoryResponseStore` in `packages/components/src/runtime/`, and `UseInteractiveResult` at `packages/components/src/runtime/useInteractive.ts:38` has no `persistence` field.

The validation evidence is also too strong: `docs/website/decisions/0007-persistence-indexeddb.md:12` cites `packages/components/src/runtime/useInteractive.test.tsx` and says it covers the fallback, but that test file covers hydration, persistence, profile/course namespacing, BroadcastChannel LWW, and write-pending state; it does not simulate IndexedDB unavailability.

Why it matters: in Safari private mode, quota exhaustion, or storage-disabled contexts, student-facing inputs can enter `error` instead of session-only function. That breaks Sophie's "nothing breaks at runtime" guarantee exactly in the high-friction environments where students need graceful behavior.

Suggested fix:

- Add a real `MemoryResponseStore` implementing `ResponseStore`.
- Wrap initial `openDB`/first `get` failure with a one-time downgrade to memory for that course.
- Extend `UseInteractiveResult` with `persistence: "persistent" | "session"`.
- Add tests that delete/mock `indexedDB` and force `openDB` rejection.
- Only then mark ADR 0007 fallback evidence as validated.

### P1 - The docs "current source of truth" has concrete broken links and stale implementation claims

`docs/website/overview.md:19` declares the overview the current-state source of truth and says downstream docs update when they disagree. That contract is not currently met.

Concrete examples:

- `docs/website/overview.md:167` links to `decisions/0014-turborepo-for-monorepo.md`, but the actual ADR is `docs/website/decisions/0014-turborepo-monorepo-orchestration.md`.
- `docs/website/overview.md:168` links to `decisions/0011-pnpm-not-npm-or-yarn.md`, but the actual ADR is `docs/website/decisions/0011-pnpm-package-manager.md`.
- `docs/website/overview.md:178` links to `decisions/0029-broadcastchannel-lww-timestamps.md`, but the actual ADR is `docs/website/decisions/0029-broadcast-channel-last-write-wins.md`.
- `docs/website/overview.md:180` links to `decisions/0004-component-contract.md`, but the actual ADR is `docs/website/decisions/0004-component-contract-revisions.md`.
- `docs/website/index.md:28` still says "Nothing in `@sophie/*` is committed code yet," while the workspace has five implemented packages and the build passes.
- `docs/website/index.md:99` and `docs/website/explanation/architecture.md:102` still say Astro 5, while `packages/astro/package.json` depends on Astro 6 and `CLAUDE.md:100` explicitly records the Astro 6 update.
- `docs/website/explanation/architecture.md:251` lists future/nonexistent packages like `@sophie/schema`, `@sophie/audit`, `@sophie/renderer-contract`, and `@sophie/cosmic-playground` as the platform layout, while the actual workspace is `@sophie/core`, `@sophie/components`, `@sophie/astro`, `@sophie/cli`, `@sophie/theme`, docs, and smoke.
- `README.md:28` still says the current implementation phase is Phase 0, and `README.md:40` says ADR 0024 is forthcoming during Phase 0.

I also ran a local markdown-link scan over `docs/website/**/*.md`; it found 59 unresolved local-style targets. Some are private absolute-file references or acceptable historical artifacts, but many are ordinary stale ADR/reference links.

Why it matters: external users, future AI agents, and future-Anna will follow the docs first. If the top-level docs overstate, understate, or link to dead names, the platform loses the very "schema + audit trail" trust it is trying to sell.

Suggested fix:

- Add a docs link-checker to CI with an allowlist for intentional private `file:///` references.
- Run a "current-state sweep" on `README.md`, `docs/website/index.md`, `overview.md`, and `explanation/architecture.md`.
- Split docs language into three explicit labels: `shipped`, `accepted design`, and `future package split`.

### P1 - CLI documentation describes a broad product surface, but the shipped CLI is much narrower

The reference CLI page describes `sophie create`, `audit`, `validate`, `build`, `dev`, `preview`, `fmt`, `eval`, and `upgrade` (`docs/website/reference/cli.md:34`). It includes concrete command examples for `sophie create textbook`, `sophie audit chapter`, `sophie validate`, `sophie build --profile`, `sophie fmt`, `sophie eval`, and `sophie upgrade` through `docs/website/reference/cli.md:170`.

The actual command registration in `packages/cli/src/index.ts:13` exposes only:

- `start`
- `dev` as an alias for `start`
- `preview`
- `audit`

The actual `audit` command is also much narrower than the docs: `packages/cli/src/commands/audit.ts:4` defines a positional `file` command that validates one chapter file's frontmatter and exits nonzero on findings. It does not implement the docs' `chapter <id>`, `course <id>`, `--since`, output formatters, Tier 3 prompt emission, or metrics.

Why it matters: this is not just roadmap optimism. The docs currently present non-shipped commands as user-facing reference. That will produce immediate adoption failure for any instructor trying the CLI, and it also confuses internal prioritization because "accepted design" reads as "available tool."

Suggested fix:

- Rename the current page to "CLI roadmap/spec" or mark each command with `Shipped`, `Designed`, or `Deferred`.
- Add a short "Implemented today" CLI page generated from `packages/cli/src/index.ts`.
- Keep future-specific references like `sophie-diff-cli.md`, `sophie-refactor-cli.md`, and `sophie-metrics-cli.md`, but make their status banners unambiguous.

### P2 - Validation metadata is load-bearing, but MyST emits warnings for it on every contract page

The docs intentionally use `validation:` frontmatter as a contract surface. `docs/website/scripts/validation-admonition-plugin.mjs:31` loads a transform to inject validation admonitions, and `docs/website/myst.yml` registers that plugin. The build, however, emits warning after warning of the form:

`'frontmatter' extra key ignored: validation`

for ADR and reference pages. It also emits two `status` frontmatter warnings for explanation pages.

The build passes with escalation, but warning volume matters. In the same build, MyST also surfaced real cross-reference problems such as:

- `reference/misconception-graph-schema.md:302 Cross reference target was not found: artifact-4-six-new-audit-invariants`
- `strategy/grants/aas-epd-mini.md` missing `co-author-leads`
- `strategy/grants/sdsu-internal.md` missing `thread-b--hsi-learning-outcomes-comparative-study`
- citation labels `astrojs/mdx`, `media`, and `sophie/core` not resolving

Why it matters: Sophie is using validation status as governance infrastructure. If every build emits expected validation warnings, the signal-to-noise ratio is backwards; real docs integrity failures become easy to miss.

Suggested fix:

- Teach MyST that `validation` is an allowed frontmatter key, if possible.
- If MyST cannot be configured, move validation metadata to a shape MyST accepts or preprocess it before MyST validation.
- Add a docs warnings budget in CI: known/allowed warnings are explicit; any new warning fails.

### P2 - Smoke build passes but the canonical dogfood chapter is not audit-clean

`docs/website/overview.md:90` says v1 success requires every chapter to pass `sophie audit` cleanly before shipping. The escalated `pnpm build` passed, but the smoke app reported:

- 0 audit errors
- 16 audit warnings
- 9 audit infos

The warnings include 13 orphan glossary definitions, an objective-less chapter, an unresolved intervention target, and an orphan equation registry entry. The info findings include screen-reader binding nudges for MultiRep figure alt text and an unlinked equation misuse.

Why it matters: warnings may be acceptable during development, but the docs use "cleanly" as a quality bar. If the dogfood target normalizes warnings, Sophie will drift toward "audit produces interesting output" instead of "audit is a trusted gate."

Suggested fix:

- Decide whether "audit clean" means zero ERRORs or zero ERROR/WARNING.
- If warnings are allowed in fixtures, baseline them explicitly in a tracked audit snapshot with rationale.
- For real v1 course content, move to zero WARNING before student-facing launch.

### P2 - Sophie is carrying two architectural timelines at once

The repo now contains substantial implemented infrastructure: schemas in `@sophie/core`, a broad `@sophie/components` library, `@sophie/astro` layout/extraction/audit integration, CLI start/preview/audit, Storybook/VR hooks, and the smoke course. The docs, however, still sometimes speak as if the platform is pre-code design (`docs/website/index.md:28`), sometimes as if Phase 0 just shipped (`README.md:28`), sometimes as if Phase 3 code is still pending, and sometimes as if Phase 3+ features are already reference-grade.

This is understandable in a fast-moving prelaunch repo, but it is now the main architectural drift source.

Suggested fix:

- Introduce a small status vocabulary in every reference page frontmatter: `status: shipped | design-accepted | planned | archived`.
- Make the `docs/website/status/validation.md` dashboard include that status, not just validation evidence.
- Audit all docs where the title contains `reference` and require that reference pages describe only shipped API unless they carry an explicit spec banner.

## What Sophie is so far

Sophie is currently a platform kernel plus a dogfood textbook slice:

- A pnpm/Turborepo TypeScript monorepo with workspace packages and a smoke consumer.
- `@sophie/core` owns Zod schemas and audit shapes (`packages/core/src/schema/index.ts:1`).
- `@sophie/components` owns React-pure pedagogy components, persistence runtime, search UI, interactive primitives, and the first domain interactive figure.
- `@sophie/astro` owns the Astro/MDX integration, layout shell, pedagogy-index extractor, validation extraction, audit, and build-time virtual module surfaces.
- `@sophie/theme` owns tokens, emitted CSS, fonts, math CSS, and contrast checks.
- `@sophie/cli` currently owns `start`/`dev`, `preview`, and frontmatter-file `audit`.
- `docs/website/` is not ancillary. It is the product brain: ADRs, reference specs, roadmap, pedagogy thesis, strategy, grants, and validation metadata.
- `examples/smoke/` is the working vertical slice and currently the most honest proof that Sophie can render real ASTR 201 content through the package stack.

The load-bearing technical pattern is the pedagogy index. `packages/core/src/schema/pedagogy-index.ts:10` names it as the ADR 0038 extraction surface, and it now carries definitions, equations, citations, figures, misconceptions, objectives, chapters, modules, validation contracts, and audit findings. That is the spine that can make audit, search, rollups, and AI authoring coherent.

The load-bearing pedagogy pattern is the Reasoning OS. `docs/website/vision/reasoning-os/index.md:22` frames three claims: epistemic-role component contract, schema as source of truth for reasoning structure, and AI authoring over the epistemic graph rather than prose alone.

## What Sophie aims to be

Sophie aims to replace a Quarto/MyST/Pressbooks-style stack for STEM instructors who need:

- Scientific textbook chapters and semester course shells from one MDX source.
- Interactive pedagogy components with persistence.
- Equation, notation, figure, misconception, objective, and intervention registries.
- Build-time audits that enforce deterministic parts of pedagogy quality.
- AI-assisted drafting where the AI is a co-author under human supervision, not an autonomous course generator.
- Future exports to slides, LMS/Canvas, and eventually open-source external adoption.

The strongest differentiator is not "AI writes content." The differentiator is "AI and humans operate over typed pedagogical and epistemic structure."

## SoTA assessment

### Where Sophie is genuinely strong

- The Reasoning OS thesis is sharper than generic edtech. Observable/model/inference/assumption/uncertainty/misconception is a real STEM grammar, not a marketing wrapper.
- The registry ecosystem addresses an actual failure mode in scientific teaching materials: equations, symbols, figures, and misconceptions drifting across chapters.
- ADR discipline is unusually mature. There is a real decision trail, and the repo encodes many decisions in schemas/tests rather than prose only.
- The engineering foundation is credible: `pnpm test:unit`, `pnpm lint`, `pnpm typecheck`, and escalated `pnpm build` passed.
- The design correctly rejects autonomous AI course generation. HITL is positioned as architecture, not a disclaimer.

### Why it is not yet a shipped SoTA package

- The docs overclaim several unimplemented surfaces, especially CLI commands and future package names.
- The runtime persistence fallback contract is not implemented despite being marked validated.
- The documentation system itself has unresolved links/citations and warning noise.
- There is not yet empirical evidence that students learn better with Sophie. ADR 0047 correctly treats that as future SoTL work.
- The canonical smoke content is not warning-clean under Sophie's own audit.
- External instructor adoption would currently hit dead commands and stale docs before hitting the best architecture.

So: Sophie is SoTA in ambition and architectural direction. It is not yet SoTA in release discipline or user-facing truthfulness. That is fixable, and the fixes are mostly governance + drift cleanup, not a rewrite.

## Drift map

| Area | Drift | Fix direction |
|---|---|---|
| Persistence | ADR 0007/0053 promise `MemoryResponseStore`; code only uses IndexedDB | Implement fallback + tests, or downgrade validation status |
| CLI | Reference docs list many commands; CLI registers four | Split shipped reference from future specs |
| Docs IA | Overview says current source of truth; links and facts are stale | Add link checker + current-state sweep |
| Package architecture | Docs list future split packages as if current | Mark future package split explicitly |
| Validation tracker | MyST warns on validation frontmatter everywhere | Configure/preprocess/allowlist, then fail on new warnings |
| Smoke audit | Build passes with 16 warnings | Baseline intentionally or drive to zero-warning |
| README | Still Phase 0/forthcoming language | Update to current phase/status |

## Suggested fix sequence

1. Fix P1 persistence fallback or revise ADR validation status to "in-progress" until the fallback exists.
2. Add docs link checking with an allowlist, then repair stale top-level links.
3. Do a current-state docs sweep of `README.md`, `docs/website/index.md`, `overview.md`, `explanation/architecture.md`, and `reference/cli.md`.
4. Split shipped CLI docs from accepted/future CLI specs.
5. Decide and enforce the audit-warning policy for smoke and future course content.
6. Reduce MyST warnings to an explicit zero-new-warning budget.

## Verification performed

- `pnpm test:unit` — passed across workspace.
- `pnpm lint` — passed; Biome checked 517 files with no fixes.
- `pnpm typecheck` — passed across workspace.
- `pnpm build` — failed inside sandbox with `listen EPERM 0.0.0.0:3100`; reran with approved port binding and passed.
- Local docs markdown-link scan over `docs/website/**/*.md` — found 59 unresolved local-style targets, including stale ADR filenames in `overview.md`.
- Repo inventory reviewed: `docs/website` has 155 markdown docs; `packages` has 605 TypeScript/TSX/Astro/CSS implementation files.

## Notes on worktree state

At review start, the worktree already had user changes in:

- `packages/astro/src/lib/pedagogy-audit.ts`
- `packages/astro/src/lib/pedagogy-audit.biography.test.ts`

I did not modify those files. This audit adds only this report.
