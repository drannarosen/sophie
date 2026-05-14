---
title: Roadmap
short_title: Roadmap
description: Phased implementation plan for Sophie — Phase 0 through 7, calendar projection, critical path, risks.
tags: [roadmap, phases, status]
---

# Roadmap

How Sophie gets built, in what order, with what milestones.

This is a living document. Calendar dates are projections, not
commitments. Phase boundaries are decision points where we pause to
reassess before continuing.

## Current status (2026-05-14)

**Bucket C — pedagogy-index infrastructure — is 4/4 done.**

| Bucket / PR | Status | Description |
|---|---|---|
| PR-C1 (#36) | ✓ merged | Definitions + glossary consumers + Aside title-required |
| PR-C2 (#37) | ✓ merged | Equations index + `<EqRef>` + KaTeX dep + 2 consumers |
| PR-C3 (#38) | ✓ merged | Key-insights + figures + misconceptions + `createPedagogyStore<T>` factory + two-tier figures |
| Phase-1 closeout (#39) | ✓ merged | 14 PR-C2/C3 followup items + HoverCard hydration race fix |
| PR-C4 (#40) | ✓ merged | LO course roll-up + `<ChapterRef>` + systematic build-time audit invariants + SoTA condition-based e2e waits + scroll-spy production fix |

The pedagogy-index pattern ([ADR 0038](../decisions/0038-pedagogy-index-pattern.md))
is now load-bearing infrastructure for both:

- **Bucket B remaining work**: PR 7 (faceted search consuming the
  pedagogy index) and PR 10 (print polish). Six original PRs collapsed
  to two.
- **Phase 3 audit work** (below): `runPedagogyAudit(index)` already
  ships ten invariants (D4/D5, E1/E4/E6, F1/F2/F4, C1, O1/O2, K1). The
  audit shell is in place; remaining audit work (Tier 1 + Tier 2
  per Phase 3) layers on top.

This page covers:

1. Goals and success criteria
2. Definitions: v1, v2, v3
3. Phases with concrete deliverables
4. Calendar projection
5. Critical path
6. Decision / checkpoint points
7. Risk register
8. Out-of-scope for v1
9. Open questions for the author

## 1. Goals and success criteria

### Primary goal

A working textbook + course-website system that serves Anna's
courses and does it *better* than the current Quarto + MyST setups
across these dimensions:

- **Textbook + course-site separation**: canonical content stable
  across semesters; semester instances are thin shells that link
  into textbooks.
- **Authoring speed**: with AI as the primary author under instructor
  supervision (per [ADR 0030](../decisions/0030-audience-and-ai-author-model.md)),
  drafting a chapter is faster than in current Quarto.
- **Pedagogical contract**: structured components and the audit
  ensure consistency the current setup can't enforce.
- **Single source of truth**: chapters, slides, Canvas exports, and
  instructor notes all generated from one MDX source.
- **Dual-profile**: solutions and teaching notes live inline (a thing
  the existing Quarto YAMLs make possible but Anna never used).

### v1 scope (fall 2026 launch)

- **ASTR 201 textbook + course site (fa26)** — migration from Quarto.
- **COMP 521 textbook + course site (fa26)** — greenfield "Scientific
  Computing with Python."
- **COMP 536 stays on Quarto** for one more semester; migration is v2.

### Secondary goal

Produce a system that other instructors can adopt — open-source
release after the platform proves itself across three real courses.

### Success criteria

**v1 (end of Phase 4)** — Sophie is shipping two courses publicly in
fall 2026:

- ASTR 201 textbook + course-fa26 routes at
  `drannarosen.github.io/astr201/textbook/...` and `/courses/fa26/...`.
- COMP 521 textbook + course-fa26 routes at
  `drannarosen.github.io/comp521/textbook/...` and `/courses/fa26/...`.
- All ASTR 201 chapters migrated from Quarto.
- COMP 521 textbook authored greenfield (cap at ~8 chapters for v1).
- ~18 Cosmic Playground demos integrated into ASTR 201 (see
  [Integrate Cosmic Playground](../how-to/integrate-cosmic-playground.md)).
- Pyodide CodeCell working in COMP 521 chapters.
- Lecture videos embedded with basic prompts.
- Glossary, concept maps, dashboards working.
- Dark/light mode, Pagefind search.
- WCAG 2.1 AA verified by axe-core in CI.
- `sophie audit` passes on every chapter.
- Anna can author a new chapter in less time than the same chapter
  would take in Quarto.

**v2 (during/after fall 2026)** — Dual-profile + COMP 536 + Tier 3:

- COMP 536 migrated from Quarto.
- Dual-profile builds activated (see
  [Set up dual-profile](../how-to/set-up-dual-profile.md)).
- Instructor sites behind Cloudflare Access (see
  [Set up Cloudflare Access](../how-to/set-up-cloudflare-access.md)).
- JAX strategy applied (for COMP 536's JAX content).
- Tier 3 audit prompt files generated.
- Additional Sophie skills.

**v3 (spring 2027)** — Innovations + course expansion:

- Confidence-calibrated predictions deployed.
- Predict-the-plot deployed.
- Time-machine videos deployed.
- COMP 521 expanded to full 12–15 chapters.
- One innovation in real-cohort use to validate the design (see
  [Pedagogical foundations](../explanation/pedagogical-foundations.md)).

**Open-source (end of Phase 7)** — Public, adoptable:

- Public docs site self-hosted on Sophie (the migration target for
  this MyST docs site; see
  [ADR 0010](../decisions/0010-myst-for-design-docs.md)).
- `sophie create textbook` scaffolder.
- Plugin extension API documented (see
  [Plugin API](../reference/plugin-api.md)).
- License chosen (recommended Apache 2.0 + CC BY 4.0).
- ≥1 external instructor pilot.

## 2. Definitions: v1 / v2 / v3

To prevent scope creep, each version has explicit inclusion criteria.

### v1 (ship by fall 2026)

**Platform repo (`drannarosen/sophie`) ships:**

- `@sophie/schema` — Zod-as-source-of-truth content schemas (see
  [ADR 0003](../decisions/0003-zod-as-source-of-truth.md)).
- `@sophie/components` — all 15 v1 pedagogy components plus
  `<CodeCell>`. Framework-pure React + Zod + CSS Modules. Includes
  `useInteractive` runtime helper and `IndexedDBResponseStore` (see
  [ADR 0007](../decisions/0007-persistence-indexeddb.md)).
- `@sophie/theme` — TS tokens canonical → CSS vars + Tailwind preset
  (see [ADR 0005](../decisions/0005-theming-three-layers.md)).
- `@sophie/audit` — Tier 1 + Tier 2 deterministic checks; Tier 3
  prompt-file emitter.
- `@sophie/cli` — `sophie` command (see
  [CLI reference](../reference/cli.md)).
- `@sophie/renderer-contract` — `SophieRendererAdapter` interface.
- `@sophie/astro` — the single Astro-coupled package (see
  [ADR 0002](../decisions/0002-renderer-astro-mdx.md)).
- `@sophie/cosmic-playground` — Demo manifest + postMessage adapter
  (see [ADR 0008](../decisions/0008-cosmic-playground-protocol.md)).
- `apps/docs/` — Sophie docs site self-hosted on Sophie (eventually;
  see [ADR 0010](../decisions/0010-myst-for-design-docs.md)).
- `apps/example-textbook/` — 4-chapter reference textbook for e2e
  tests.
- `templates/starter-textbook/` and `templates/starter-course/` —
  scaffolds for `sophie create`.
- Storybook + Vitest + Playwright + axe-core + visual regression in
  CI from Phase 0.
- Changesets for SemVer + release notes.
- Public API discipline via `@stable` / `@experimental` /
  `@internal` JSDoc tags.
- Plugin architecture as v1 public API (see
  [Plugin API](../reference/plugin-api.md)).
- One Sophie skill (chapter-author) + 2–3 slash commands.

**Consumer course repos (separate, e.g. `drannarosen/astr201`,
`drannarosen/comp521`):**

- ASTR 201 textbook fully migrated from Quarto. ~14–18 chapters.
- COMP 521 textbook authored greenfield (cap at ~8 chapters).
- Each repo holds both textbook content and a course shell as
  separate content collections.
- ~18 Cosmic Playground demos integrated.
- Lecture videos embedded.
- Single-profile build (student-facing only).
- GitHub Pages hosting.

**Excludes (deferred to v2 or later):**

- COMP 536 (stays on Quarto for fall 2026; migration is v2).
- Dual-profile builds activated (authored for, but not deployed).
- Cloudflare Pages + Access.
- Tier 3 AI audits beyond emitting prompt files.
- Multi-skill AI authoring kit beyond chapter-author.
- v3 innovations.
- Course-site features beyond minimal.
- Full COMP 521 chapter set (cap at ~8 in v1; expand in v3).
- JAX-specific content (defer to COMP 536 migration in v2).
- Cross-device response sync (v3; the seam in `ResponseStore` is
  designed but `SyncedResponseStore` isn't shipped).

### v2 (during/after fall 2026, ship by early 2027)

**Adds to v1:**

- COMP 536 migration from Quarto.
- Dual-profile builds activated.
- Cloudflare Pages + Access for instructor build.
- JAX strategy implemented.
- Tier 3 audit prompt files generated.
- Additional Sophie skills.
- Richer course-site features.

### v3 (spring–summer 2027)

**Adds to v2:**

- COMP 521 expanded to full chapter set (~12–15 chapters total).
- Confidence-calibrated predictions.
- Predict-the-plot component.
- Time-machine VideoPrompts.
- Concept Latency visualization.
- Mission Generator skill.
- Transcript Curator skill.

### Open-source release (spring 2027 or later)

**Adds:**

- Public docs site self-hosted on Sophie (migration target for this
  MyST site).
- `sophie create textbook` polished for external use.
- Plugin extension API documented for third parties.
- Pilot with ≥1 external instructor.
- License decision.

## 3. Phases with concrete deliverables

Each phase ends with a working, testable artifact. No phase is
"infrastructure only" — every phase delivers something the author
can actually use.

(phase-0-foundation-3-4-weeks-expanded-scope)=
### Phase 0 — Foundation (~2–2.5 weeks, **shipped 2026-05-10**)

**Scope authority:** [ADR 0023](../decisions/0023-vertical-slice-build-order.md)
set the vertical-slice-first build order;
[ADR 0025](../decisions/0025-phase-0-actual-scope.md) records the
ten-step actual scope and supersedes ADR 0023's calendar (its
build-order is reconfirmed). The parent implementation plan lives at
[`~/.claude/plans/read-all-of-the-sharded-sky.md`](file:///Users/anna/.claude/plans/read-all-of-the-sharded-sky.md).

**Goal (achieved):** One trimmed ASTR 201 chapter renders through
`@sophie/astro` with HMR; persistence backbone proven end-to-end with
cross-tab sync; test stack and CI in place.

**Shipped:**

- `drannarosen/sophie` GitHub repo (public, AGPL-3.0-or-later per
  [ADR 0024](../decisions/0024-license-agpl.md)).
- pnpm workspace, TypeScript 6, Biome, Turborepo, Astro 6 + MDX,
  React 19. Node 22 pinned via `.nvmrc`; pnpm 11.0.9 pinned via
  `packageManager`.
- `@sophie/core`: schema (Zod), audit utilities, `sophie` CLI binary
  with subpath exports (`/schema`, `/audit`) and Biome
  `noRestrictedImports` rule for internal boundaries.
- `@sophie/components`: `<Callout>` (interactive) and `<Figure>`
  (registry + inline modes); `useInteractive` runtime over IndexedDB,
  BroadcastChannel, and `ResponseStore`; all axe-core tested via
  jsdom-fake-IndexedDB.
- `@sophie/theme`: TS tokens to CSS variables (light and dark) via
  Tailwind v4 CSS-first `@theme` directive
  (per [ADR 0026](../decisions/0026-tailwind-v4-css-first.md)).
- `@sophie/astro`: `defineSophieIntegration()`, `makeStaticComponents()`,
  and the `<SophieChapter>` client island. Framework-pure boundary
  enforced; ADR 0027 records the per-instance hydration constraint
  surfaced during step 7's vertical-slice acceptance.
- `examples/smoke/`: real trimmed ASTR 201 first reading
  (spoiler-alerts) with prose + KaTeX + 26 figures + interactive
  `<Callout>`. Throwaway; replaced by `drannarosen/astr201` in
  Phase 1.
- Vitest + Playwright (chromium) + axe-core + coverage (v8) wired
  through Turborepo cache.
- GitHub Actions CI: lint / typecheck / unit / build / e2e jobs +
  Dependabot security-only. (Build job is a **known-issue** on
  Linux runners; see Phase 1 handoff.)

**Phase 0 deliberately deferred** (added as they earn their keep,
not abandoned — per ADR 0023):

- `@sophie/renderer-contract` (only matters when a second renderer is real).
- `@sophie/cosmic-playground` (Phase 1+ when the first `<Demo>` lands).
- `apps/docs/` self-hosted Sophie docs (indefinitely deferred per
  ADR 0023; MyST at `docs/website/` continues).
- `apps/example-textbook/` (`examples/smoke/` serves the role).
- Storybook (Phase 1, around the third component when isolation pays off).
- Visual regression (Phase 1+, once a stable design system exists).
- Changesets (Phase 2+, when there's a real second consumer).
- Lefthook + Commitlint (when contributors arrive).
- Renovate (Dependabot security-only is the lean substitute).
- `sophie eval`, `sophie create`, `sophie upgrade` subcommands
  (Phase 2+; `sophie audit` and `sophie dev` are the v1-critical ones).
- Plugin architecture as `@stable` public API (`@internal` until a
  real third-party consumer materializes).

**Done when (verified 2026-05-10):**

- ✅ `pnpm --filter smoke dev` serves the proving chapter on
  `localhost:4321` with prose, KaTeX math, all 26 figures, and a
  working interactive `<Callout>` whose state persists across reload
  and syncs across browser tabs within ~1 second.
- ✅ `pnpm exec turbo run test:unit` passes (7/7 tasks; 41 tests +
  coverage).
- ✅ `pnpm test:e2e` passes Playwright smoke + axe + persistence
  (3/3 chromium specs).
- ✅ `pnpm exec biome check .` clean (82 files).
- ⚠️ CI on `main`: lint/typecheck/unit pass on Linux; build fails
  due to astro 6 + content-layer Vite-internals bundling pathology
  (root cause traced; surface fixes attempted and reverted; full
  fix is Phase 1's first task — see
  [`status/phase-1-plan.md`](./phase-1-plan.md)).
- ⚠️ Branch protection on `main`: deferred until CI build job is
  green.
- ✅ ADRs 0024, 0025, 0026 published.

### Phase 1 — Core schema + components (~5 weeks)

**Goal:** Author one ASTR 201 chapter and one COMP 521 chapter
end-to-end using Sophie components, validating both framings. The
chapters live in *consumer course repos*.

**Deliverables:**

- `@sophie/schema`: Zod schemas (source of truth) for all content
  entities. Inferred TS types via `z.infer`. Generated JSON Schema.
- `@sophie/components`: 15 v1 pedagogy components. Each ships with
  Storybook stories + Vitest unit tests + axe-core checks.
- `@sophie/components/runtime`: `useInteractive` hook,
  `IndexedDBResponseStore`, `BroadcastChannel` cross-tab sync,
  `ProfileContext`, `registerComponent` registry.
- `@sophie/theme`: `tokens.ts` extracted from existing SCSS. Build
  emits `theme.css` and Tailwind preset. Light/dark via `data-theme`.
- Port `callouts.scss` → `<Callout>` component module. Port
  `lecture-cards.scss` → `<LectureCard>` component module.
- **Consumer course repos created**: `drannarosen/astr201` and
  `drannarosen/comp521`.
- One ASTR 201 chapter (`flux-luminosity-distance` recommended).
- One COMP 521 chapter (recommend Python fundamentals, no `<CodeCell>`
  yet).

**Done when:** both chapters render at parity (or better) with
current Quarto/Markdown versions, components validate against the
schema.

### Phase 2 — Multi-site build pipeline + deploy (~3 weeks)

**Goal:** Both consumer sites deployable to GitHub Pages.

**Deliverables:**

- `sophie` CLI v0.1: `build`, `preview`, `validate`, `fmt`, `audit`
  (basic).
- GitHub Actions workflow building and deploying both consumer
  sites to GH Pages.
- Cross-site linking utilities (course shell → textbook chapter URLs
  resolved at build time).
- Pagefind search integration per site.
- Dark/light mode toggle with persistence.
- 404 page, sitemap per site.
- Lighthouse audit passes (>90 on each axis).
- axe-core accessibility tests in CI.

**Done when:** both URLs are live with placeholder/early content,
cross-site links resolve correctly, and CI deploys on every push to
main.

### Phase 3 — Audit + AI authoring + CodeCell (~5 weeks)

**Goal:** Tier 1 + Tier 2 audits work; one Sophie skill drives
chapter authoring; Pyodide-based `<CodeCell>` works in COMP 521
chapters.

**Deliverables:**

- `sophie audit` CLI: Tier 1 + Tier 2 checks for all v1 components.
- Prompt file format finalized (with worked examples).
- `sophie-chapter-author` skill (`SKILL.md` + system prompt + tools).
- `/sophie-audit` and `/sophie-scaffold-chapter` slash commands.
- Cowork plugin manifest structured correctly.
- `<CodeCell>` component (Pyodide integration, lazy-loaded,
  `predict-then-run` pedagogical kind).
- Service worker caching for Pyodide bundle.
- One COMP 521 chapter using `<CodeCell>` end-to-end.
- At least 2 additional chapters authored using the AI flow.

**Done when:** running `/sophie-scaffold-chapter` in Claude Code
produces a chapter draft that passes `sophie audit` after author
review; the COMP 521 chapter with `<CodeCell>` actually executes
Python in-browser.

### Phase 4 — Parallel content authoring (~10 weeks, summer 2026)

**Goal:** ASTR 201 textbook fully migrated, COMP 521 textbook
authored greenfield, both course shells populated for fall 2026.

This is the **biggest phase** — the bulk of v1 calendar time.

**Deliverables:**

In `drannarosen/astr201`:

`src/content/textbook/` (migration):

- All ASTR 201 chapters migrated (~14–18 chapters).
- All ~18 Cosmic Playground demos integrated.
- Lecture videos embedded.
- Glossary, concept maps, dashboard.

`src/content/courses/fa26/` (semester shell):

- Syllabus, schedule, 14 weekly modules linking to textbook chapters,
  assignment shells.

In `drannarosen/comp521`:

`src/content/textbook/` (greenfield, cap at ~8 chapters in v1):

- Python fundamentals, NumPy + arrays, Matplotlib + plotting, Pandas
  + data wrangling, Functions + modules + scientific software, one
  case study, one inference / statistics chapter. Each with
  `<CodeCell>` where appropriate.

`src/content/courses/fa26/`: same structure as ASTR 201.

Cross-cutting:

- Print-mode CSS for handouts.
- Final accessibility audit passes WCAG 2.1 AA.
- All `sophie audit` warnings resolved or accepted.

**Done when:**

- `drannarosen.github.io/astr201/` is the URL Anna gives ASTR 201
  students.
- `drannarosen.github.io/comp521/` is the URL Anna gives COMP 521
  students.

### Phase 5 — Dual-profile v2 + COMP 536 (~8 weeks, fall 2026 → early 2027)

**Goal:** Instructor builds deployable, COMP 536 migrated, Tier 3
audit prompts in use.

**Deliverables:**

- MDX components flipped from always-null to PROFILE-conditional.
- `sophie build:both`, `sophie preview --profile=instructor`.
- Cloudflare Pages + Cloudflare Access for instructor URLs.
- Custom domain (e.g., `instructor.astrobytes.edu`).
- COMP 536 migrated from Quarto (textbook + course shell for sp27).
- JAX strategy implemented.
- Tier 3 audit prompt files generated; flow validated.
- More Sophie skills.

### Phase 6 — Innovations + COMP 521 expansion (~10 weeks, spring 2027)

**Goal:** v3 innovations validated; COMP 521 expanded beyond v1's
8-chapter cap.

**Deliverables:**

- COMP 521 expanded to ~12–15 chapters total.
- Confidence-calibrated predictions deployed.
- `<PredictThePlot>` component.
- `<VideoPrompt>` component.
- Concept Latency tracking (instrumentation + indicator UI).
- Mission Generator skill.
- Transcript Curator skill.
- Cohort-level analysis (anonymized) for instructor view.

**Done when:** at least one v3 innovation has measurable pedagogical
effect with real students.

### Phase 7 — Open-source release (~3-4 weeks, spring 2027)

**Goal:** Public release; pilots with external instructors.

Most of what previous drafts deferred to Phase 7 has *already shipped
in Phase 0–1* under the build-the-best-now mandate. Phase 7 is a
release-engineering phase, not re-architecture.

**Deliverables:**

- License already chosen and applied (AGPL-3.0-or-later per
  [ADR 0024](../decisions/0024-license-agpl.md)). Phase 7 just adds
  the CC BY 4.0 for textbook content (stays in consumer repos) and
  any release-engineering polish.
- `npm publish` workflow for `@sophie/*` packages.
- Tutorial chapter on the docs site.
- Migration guides (from Quarto, from MyST).
- `CONTRIBUTING.md` for external contributors.
- Code of conduct.
- Issue / PR templates.
- ≥1 external instructor pilot.

## 4. Calendar projection

Working assumption: Anna has 10–15 hours/week for Sophie work during
semester, 25–35 hours/week during summer. AI-primary authoring + AI
coding compress some tasks by 2–3×; supervision and judgment-heavy
work do not compress.

| Phase | Weeks | Calendar window | Concurrent course load |
|---|---|---|---|
| 0 | ~2–2.5 | mid-May – early June 2026 | lean-but-realistic (per ADR 0023) |
| 1 | ~5 | mid-June – late July 2026 | summer break |
| 2 | ~3 | late July – mid-Aug 2026 | summer break |
| 3 | ~5 | mid-Aug – late Sept 2026 | early fall; CodeCell + first AI skill |
| 4 | ~10 | late Sept – early Dec 2026 | parallel content; teaching during this phase |
| 5 | ~8 | Dec 2026 – Feb 2027 | end fall / start spring |
| 6 | ~10 | Feb – Apr 2027 | spring semester |
| 7 | ~3-4 | Apr – May 2027 | spring (shrunk: most ships earlier) |

**Honest range:**

- v1 (ASTR 201 + COMP 521 deployed) by **late October 2026** is the
  core ambition. ~3–4 weeks into the fall semester; first weeks use
  staging or partial rollout.
- A more conservative target: v1 partial release by start of fall
  (early September), in-semester completion.
- Open-source release by **mid-2027** instead of spring 2027.
- v3 innovations (Phase 6) are most likely to slip.

**Reality check:** if the time budget is half what's assumed, the
calendar doubles, putting v1 deployment in spring 2027. That would
mean running ASTR 201 on Quarto and COMP 521 on something interim
for fall 2026. **The single most important risk to track.**

## 5. Critical path

The path that must work for ASTR 201 to ship in fall 2026:

```{mermaid}
flowchart LR
  P0[Phase 0<br/>repo + test stack] --> P1[Phase 1<br/>schema + components + theme]
  P1 --> P2[Phase 2<br/>build + deploy]
  P2 --> P3[Phase 3<br/>audit + first skill + CodeCell]
  P3 --> P4[Phase 4<br/>ASTR 201 migration + COMP 521 greenfield]
```

Each phase depends on the previous. There is no parallelism in v1 —
this is solo development.

Phases 5–7 can be parallelized somewhat:

- Phase 5 (dual-profile + COMP 536) and parts of Phase 6
  (innovation components) can happen in parallel.
- Phase 7 must wait until v2 is stable but can proceed alongside
  Phase 6 polish.

**The riskiest critical-path items:**

1. **Theme port** (Phase 1). The existing SCSS may have gnarly
   inheritance that doesn't map cleanly. Mitigation: timebox to one
   week; if stuck, ship raw CSS and refactor later.
2. **Cosmic Playground integration** (Phase 4). Mitigation: protocol
   designed in [ADR 0008](../decisions/0008-cosmic-playground-protocol.md);
   per-demo retrofit is bounded.
3. **First chapter migration** (Phase 1). Takes ~3× longer than
   subsequent ones. Mitigation: pick a well-bounded chapter.
4. **Audit scope** (Phase 3). Tier 2 checks are easy to over-engineer.
   Mitigation: start with the 5 highest-value checks.

## 6. Decision / checkpoint points

After each phase, pause to reassess.

### After Phase 2

**Question:** Is Sophie faster to author in than current Quarto?

If yes: continue. If no: investigate. The whole project's premise
depends on this.

### After Phase 4

**Question:** Did ASTR 201 migration succeed? Any pedagogy components
added but never used? Any needed but couldn't author cleanly?

If migration succeeded: pause for 1–2 weeks before Phase 5. Update
[component contract](../reference/component-contract.md) with
lessons learned.

### After Phase 5

**Question:** Does dual-profile reduce friction enough to justify
the complexity?

If yes: continue. If no: consider rolling back to single-build for
v3 and shipping solutions through Canvas only.

### After Phase 6

**Question:** Did the v3 innovations earn their keep?

If yes: continue to open-source. If no: keep them as research, don't
ship them in the public release.

## 7. Risk register

### Cross-cutting risks

**Time slippage** (highest probability). Cause: research deadlines,
teaching prep, life. Mitigation: each phase has a "minimum viable"
cutoff.

**Astro / MDX evolution breaks setup.** Cause: Astro 5+ is recent;
APIs may shift. Mitigation: pin major versions; treat upgrades as
scheduled.

**Pyodide harder than expected.** Mitigation: keep Pyodide as v2
(Phase 5), not v1; fallback is pre-rendered + Colab.

**AI tool drift.** Mitigation: prompt format is provider-agnostic;
skills regenerable.

### Phase-specific risks

- **Phase 1: theme port complexity.** Mitigation: timebox.
- **Phase 4: Cosmic Playground breaks during migration.** Mitigation:
  iframe + manifest protocol keeps it decoupled (see
  [ADR 0008](../decisions/0008-cosmic-playground-protocol.md)).
- **Phase 5: Cloudflare setup more painful than expected.**
  Mitigation: local-only instructor build is the fallback.
- **Phase 6: innovations don't pan out pedagogically.** Mitigation:
  failures are data, not setbacks. Drop without regret.
- **Phase 7: open-source release lands flat.** Mitigation: don't
  optimize for adoption; optimize for Anna's courses.

## 8. Out of scope for v1

To prevent scope creep, explicit non-goals:

- **No LMS replacement.** Canvas integration is via export only.
- **No student accounts or auth in v1.** Local-only via IndexedDB.
- **No real-time collaboration.** Authoring is solo + AI.
- **No mobile apps.** Web only.
- **No LTI integration.** Defer indefinitely.
- **No server-side rendering of student work.** Student-facing AI
  tutor is v3 at earliest.
- **No misconception NPCs in v1 or v2.** Defer to v3, drop without
  regret if it doesn't work.
- **No automatic transcript generation in v1.** Manual or
  Whisper-via-Claude-Code-skill in v2.
- **No cross-course shared misconception database in v1 or v2.**
  Per-course in v2; cross-course is v3.
- **No public open-source release before three courses run.** Phase 7
  trigger is course completion, not calendar date.

## 9. Open questions for the author

### 9.1 Confirmed scope

Decision (per author, May 2026): v1 covers **ASTR 201 + COMP 521**
in parallel for fall 2026. COMP 536 stays on Quarto for one more
semester; migration is v2. See
[ADR 0001](../decisions/0001-platform-not-monorepo.md).

### 9.2 What stays on Quarto for fall 2026

ASTR 101 and COMP 536 stay on Quarto. Migration of COMP 536 is v2.

### 9.3 Open-source timing

Phase 7 default: spring 2027 (after v3). Earlier announcement
("early access" after Phase 4) risks rough edges; later (after Phase
6 + stabilization semester) is safer/slower. Default is the stretch
goal; core ambition is Anna's courses.

### 9.4 License

**Decided 2026-05-10 (Phase 0 step 10):** Sophie ships under
**AGPL-3.0-or-later** for platform code in `drannarosen/sophie`.
Course content in consumer repos remains independently licensed
(typically CC BY 4.0 for prose). See
[ADR 0024](../decisions/0024-license-agpl.md) for the rationale,
counter-argument review, and CLA-on-first-PR triggered task.

### 9.5 Naming the open-source release

Will the public release stay "Sophie," or get a different brand
(e.g., "Sophie Open" / "Sophie Press")? Platform name and
public-release name don't have to match.

### 9.6 Time budget honesty

The calendar projection assumes 10–15 hours/week during semester
and 25–35 hours/week during summer. If realistic numbers are half,
the calendar doubles. Better to know now than slip silently.

## 10. Definition of done for this roadmap

This document is "done" (not the project — the document) when:

- All open questions in section 9 have working answers.
- Phase 0 has actually started.
- The first concrete deliverable (a hello-world chapter) compiles.

After that, this becomes a living reference. Update it when phases
close, when scope shifts, when reality forces re-planning.

The roadmap is a tool, not a contract. Reality wins.
