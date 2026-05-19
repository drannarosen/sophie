# Session 9 closeout — state of Sophie

**Date**: 2026-05-19
**Trigger**: Session 9 closed; Anna asked for state-of-the-platform + high-leverage next steps.
**Predecessor audit**: [2026-05-18 post-PR-A codebase audit](2026-05-18-post-pr-a-codebase-audit.md) (A, 90) + [2026-05-18 Codex Sophie audit](2026-05-18-codex-sophie-codebase-architecture-docs-audit.md) (—, adversarial review).

## 1. What changed in Session 9

Seven PRs merged in one day (2026-05-19), closing the entire 5-area Session-9 backlog plus one self-surfaced bug:

| PR  | Concern                                                                    | Squash SHA |
| --- | -------------------------------------------------------------------------- | ---------- |
| #120 | Area 2 — PageStatus schema (ADR 0062) + dashboard column + spec-banner MyST plugin + `pnpm lint:status` CI step | `7758a82` |
| #122 | Issue #121 — findings-location bug surfaced by #120's review; TDD red-green | `2400564` |
| #123 | Issue #56 — `.storybook` added to `@sophie/components` tsconfig include    | `b77f7f5` |
| #124 | Issue #57 — EquationRef `PopoverOpen` story + 2 VR baselines via `vr-update` workflow | `7ed1b76` |
| #125 | Area 4 — regen-script routed through validation cluster barrel              | `de6a396` |
| #126 | Area 5 — PageStatus rolled out to all 61 ADRs (49 shipped / 28 accepted-design / 9 future-package-split) | `4cd8d06` |
| #127 | Area 3 — function-of-content e2e assertions (smoke-target Astro integration dumps `dist/.sophie-pedagogy-index.json`; spec derives 3 kind-count assertions + per-intervention existence) | `0ec1c6d` |

**Process artifacts added**:

- ADR 0062 (page-status frontmatter enum), formalizing the E3b vocabulary in `@sophie/core` Zod schema.
- `feedback_biome_verification.md` memory reinforced with a 2nd-occurrence note (the discipline failed once today and was caught by CI; the lesson now compounds).
- Issue #121 filed mid-session (PR-#120 review surfaced it), TDD'd and closed within 30 minutes.
- Issue #99 (pagefind flake) explicitly left-open-with-rationale — documented "act when X" triggers, leave-alone otherwise.

## 2. Test metrics

| Layer | Files | Tests | Notes |
| --- | --- | --- | --- |
| `@sophie/core` (vitest) | 15 | 297 | +7 from PR #120 (PageStatus schema) |
| `@sophie/astro` (vitest) | 52 | 690 | +8 from PR #120 (S0 extractor + dashboard) + 1 from PR #122 |
| `@sophie/components` (vitest) | 69 | 570 | unchanged |
| `@sophie/cli` (vitest) | 9 | 33 | unchanged |
| `@sophie/theme` (vitest) | 1 | 20 | unchanged |
| **Unit total** | **146** | **1,610** | |
| `examples/smoke/e2e` (Playwright) | 33 | 148 `test(...)` + 11 `.skip` | PR #127 replaced 4 hardcoded counts with index-derived assertions; 3/3 in `proving-chapter.spec.ts` pass |
| `@sophie/components` Storybook stories | 31 | 133 | +1 from PR #124 (`PopoverOpen`) |
| VR baselines (`__snapshots__/chromium/`) | — | 266 PNGs | 133 stories × 2 themes; PR #124 added 2 (light+dark for PopoverOpen) via the `vr-update` workflow |
| Pedagogy audit on `examples/smoke` | — | 0 errors / 16 warnings / 9 infos | matches `docs/website/reference/audit-baseline.md` (locked baseline) |

## 3. Lint + verification gates

| Gate | Status (as of 2026-05-19 EOD) | Threshold |
| --- | --- | --- |
| `pnpm exec biome check .` | 0 errors / 0 warnings across 586 files | Must be 0/0 per `CLAUDE.md` Conventions |
| `pnpm exec turbo run typecheck` | 11/11 packages pass | Must be 11/11 |
| `pnpm lint:loc` | 0 errors / 0 warnings / 13 infos / 8 exempt | Errors=0 per ADR 0061 Rule 3 (CI-blocking) |
| `pnpm lint:links` | 0 broken across 157 docs files (6 allowlisted) | Informational |
| `pnpm lint:status` | 0 pages with unknown `status:` value; 0 ADRs without `status:` field; 68 non-contract pages remain no-status | Informational |
| MyST docs build | 0 warnings (E3b + Codex P2 suppression of `valid-page-frontmatter`) | — |

## 4. Documentation state

| Surface | Count | Status |
| --- | --- | --- |
| ADRs (`docs/website/decisions/*.md`) | 61 (0001–0062 with 0050 gap, plus template) | All 61 tagged with PageStatus as of PR #126 |
| Reference pages | 26 | All carry PageStatus (since E3b + audit-baseline addendum) |
| Decisions/Explanation/Vision pages without `status:` | 68 | Out-of-scope per ADR 0062's "decisions and explanation pages may follow in a later sweep" |
| Spec-banner-tagged pages (`future-package-split`) | 9 (3 ADRs from PR #126: 0016, 0048, 0049; 6 reference docs from E3b) | MyST plugin auto-injects "Forward-looking specification" admonition |
| Reviews (`docs/reviews/*.md`) | 15 audits (this is the 16th) | Index in `README.md` |
| Validation dashboard | 87 contracts; 0 extractor findings; 49 shipped / 28 accepted-design / 9 future-package-split / 1 mixed / 0 no-status | Regenerated atomically with PR #126 |

## 5. Quality grade — A (91)

Per the reviewing-project-quality rubric:

| Category | Score | Evidence |
| --- | --- | --- |
| **Test coverage** | 18/20 | 1,610 unit tests across all 5 packages; 148 e2e + 133 VR + 266 baselines; comprehensive per-component coverage. Minor deductions: 11 `test.skip` across 7 e2e specs (mostly chapter-* test gaps documented but not closed); Area 3's per-entry existence assertion shape is partial (only interventions cover anchor→id today; definitions/keyInsights/misconceptions wait on renderer-consistency PR). |
| **Design system** | 18/20 | Tokens + CSS Modules + Storybook + axe-core mandatory; 9 components migrated to compound-component shape (ADR 0031); VR baseline gate per ADR 0057. Minor deduction: `<Callout>` family + `.margin-note` raw MDX asides are not yet tracked in the pedagogy index — Phase 1's `<MarginNote>` componentization closes this. |
| **Pedagogical correctness** | 18/20 | Smoke audit at 0/16/9 matches the locked `audit-baseline.md`; all 16 warnings are deliberate-author-gap documentation, not platform defects (D5 definitions-without-callsites in the smoke chapter, R2 unused stefan-boltzmann equation, I1 misconception-fixture intervention slug). 49 ADRs shipped; pedagogy-index extractor + audit invariants V0/V8/S0 + 11 audit invariants. Minor deduction: 9 ADRs still future-package-split (deferred to post-Phase-3 packaging); 30 accepted-design ADRs await implementation. |
| **Accessibility** | 19/20 | axe-core mandatory per ADR 0004 on every component PR + every e2e spec + Storybook test-runner; 0 violations on smoke chapter. Storybook VR captures both light + dark themes per story. Minor deduction: 3 axe rule suppressions in smoke (`color-contrast` deferred to design-system review; `list`/`listitem` for an Astro `<astro-slot>` artifact tracked separately). |
| **Architecture** | 18/20 | ADR 0061 codified AI-optimized codebase design (6 rules, all enforced — Rule 3 LOC budget is in CI, Rules 1/4/5 are practices applied during C-arc); cluster barrels documented (validation cluster used 2 PRs today); ADR-driven development with 62 audit-trail entries. Minor deduction: Codex P1 IndexedDB fallback contract gap in `useInteractive.ts` (ADR 0007 + ADR 0053 promise unimplemented) is still open from the 2026-05-18 Codex audit — affects student-facing persistence reliability. |
| **Total** | **91 / 100** | **A** |

### Grade lineage

| Date | Grade | Trigger |
| --- | --- | --- |
| 2026-05-10 | B− (73) | Phase 1 hardening start |
| 2026-05-10 | B+ (84) | Hardening sprint closed |
| 2026-05-10 | A (91) | Sprint-to-A closed |
| 2026-05-12 | A (93) | Bucket B PR 2 |
| 2026-05-13 | A+ (96) | Bucket B PR 6 |
| 2026-05-15 | C+ (59) | LDS-foundation hardening: 8 blocking review findings + 8 brainstorm-locked items |
| 2026-05-15 | A (94) | Bucket B + C architecture audit (post-fix-up) |
| 2026-05-16 | A (94) | State-of-platform pre-WS3 |
| 2026-05-16 | A+ (96) | Workstream 3 (visual polish) closed |
| 2026-05-17 | A− (91) | Reasoning-OS-core (MultiRep + Intervention + EquationBiography) |
| 2026-05-18 | A (90) | Post-PR-A codebase |
| **2026-05-19** | **A (91)** | **Session 9 closeout (this review)** |

Grade range over the last 10 days: B+ (84) → A+ (96), median A (91). The grade has been a stable A throughout Phase-1+ work; the C+ trough was a single self-inflicted hardening-pass dip that recovered within 24h. Session 9 ships substantial new infrastructure (PageStatus stack, function-of-content e2e shape) without regressing any category.

## 6. Backlog — next high-leverage steps

Prioritized by leverage (impact ÷ effort), with P1 = act now.

### ~~P1 — Codex IndexedDB fallback contract gap~~ ✅ Verified closed (2026-05-19 audit-hygiene pass)

**Closed.** When this review was first drafted, the P1 cited the 2026-05-18 Codex audit's "Open" status. A 2026-05-19 hygiene pass discovered the fix had already landed in a subsequent session:

- `packages/components/src/runtime/FallbackResponseStore.ts` exists (IDB→memory downgrade wrapper).
- `packages/components/src/runtime/MemoryResponseStore.ts` exists.
- `useInteractive.ts` uses `FallbackResponseStore` (not raw `IndexedDBResponseStore`); `UseInteractiveResult` exposes `persistence: PersistenceMode`.
- 21 tests pass (`FallbackResponseStore.test.ts` + `MemoryResponseStore.test.ts`).
- ADR 0007's `validation:` block lists these as `validated` evidence dated 2026-05-18.
- Validation dashboard shows ADR 0007 as `validated` + `shipped`.

The Codex audit's P1.2 (docs "current source of truth" broken links + stale Astro 5 claims) was also addressed — overview.md links are correct, index.md no longer says "Nothing in @sophie/* is committed code yet", architecture.md says "Astro 6 (upgraded from Astro 5)". Both Codex P1 items are closed; the audit row in `docs/reviews/README.md` was updated in the same hygiene pass.

**P1 promoted upward**: what was P2 becomes the new working P1 below.

### P1 — Renderer-consistency PR to enable function-of-content on remaining pedagogy kinds (~3–5h)

**What**: PR #127 shipped per-entry existence assertions only for interventions because that's the one kind where the renderer emits `id={anchor}` cleanly. Extend the pattern to definitions (currently `<details>` without id), key-insights (only `data-aside-kind="key-insight"` exposed today), and misconceptions (same shape).

**Why P2**: Closes Area 3's full audit vision ("every entry has a rendered correspondence") and removes the literal `role='note'` count = 36 + literal `<table>` count = 8 that PR #127 documented as kept-literal-with-reason. Each per-kind extension is mechanical once the renderer changes are in.

**Plan**: Audit how `<Aside>` (per-kind) currently composes its rendered DOM; add `id={anchor}` emission for definition/key-insight/misconception kinds; update the e2e spec's per-entry assertions to cover all 4 kinds; consider extending `<Callout>` into the index too (closes the 28-Callout gap).

### P2 — Promote `lint:status` from informational to blocking (~30min, when ready)

**What**: `pnpm lint:status` currently always exits 0. Switch to exit-1 on unknown status values; consider also exit-1 on missing `status:` for non-contract pages once the rollout completes.

**Why P3**: The page-status enum is now load-bearing (PR #120 + #126); blocking-CI ensures no further drift. Today's lint:status surfaces 0 unknown — perfect time to lock the invariant. The blocking shape parallels `pnpm lint:loc`.

**Blocker**: Decide whether explanation/vision pages should also be required to carry `status:`. 68 pages currently no-status; that's the deferred work from ADR 0062's "decisions and explanation pages may follow in a later sweep." Two paths: (a) tag the remaining 68 first, then promote; (b) promote now with "ADRs+reference required, others optional" and tighten later.

### P3 — `<Callout>` migration into the pedagogy index (~4–6h)

**What**: `<Callout>` family (info/tip/key-insight/roadmap/summary/warning) renders 28 `role='note'` elements in the smoke chapter today, none indexed. Either (a) index Callouts as a new pedagogy kind, or (b) judge that `<Callout>` is chrome (per its current "narrative voice" role, not OMI) and exclude from the count.

**Why P4**: PR #127's spec documents this as the reason for keeping `role='note'` count = 36 literal. Resolving it closes one more piece of the function-of-content vision. The decision (track-or-don't) is the genuinely interesting part — purely engineering once the design call lands.

**ADR work**: Probably a one-paragraph amendment to ADR 0058 (epistemic component contract) clarifying whether `<Callout>` carries an OMI role or stays narration-chrome.

### P5 — Misc tail (each <1h, batch when convenient)

- **Issue #99** pagefind-postbuild flake — leave-alone-with-rationale unless triggered (the issue documents the conditions).
- **`.margin-note` raw MDX asides** (20 in smoke chapter) — Phase 1's `<MarginNote>` componentization will track them; until then, they're a constant in the e2e spec.
- **`<table>` migration** — same shape as Callout/MarginNote: track in index or accept as raw markdown chrome.
- **Storybook E2E `.skip` cleanup** — 11 `.skip` across 7 specs (chapter-figures, figure-ref, chapter-equations, chapter-key-insights, chapter-misconceptions, chapter-ref, course-misconceptions). Worth a sweep once the underlying chapter primitives stabilize.

## 7. Strategic context (separate from the tactical backlog)

The tactical P1–P5 above is what to do next *within Sophie's current architectural shape*. The strategic context — saved in `project_reasoning_os_core_pivot` memory — is that PR-7's chapter capstone is the final station of a multi-sprint arc that includes MultiRep, Intervention, and EquationBiography author-facing surfaces. Those build on the foundation today's audit captures; if Anna wants the next *strategic* sprint (not the next tactical PR), it's the Reasoning-OS-core consolidation, not the items above.

The reading: today's Session 9 work hardened the *platform's authoring + audit surface*; the next strategic move is closing the loop on the *student-facing* pedagogy surfaces. The P1 IndexedDB fallback is the bridge — it touches the persistence layer that all of the Reasoning-OS components rely on.

## 8. Files changed (Session 9, 2026-05-19)

| File | Change | PR |
| --- | --- | --- |
| `docs/website/decisions/0062-page-status-frontmatter-enum.md` | new ADR | #120 |
| `packages/core/src/schema/page-status.ts` + test + barrel | new schema + 7 tests | #120 |
| `packages/core/src/schema/pedagogy-index-entries/contract-validation.ts` | added optional `status` field | #120 |
| `packages/astro/src/lib/validation/extractor.ts` + test | S0 finding code + 4 tests | #120 |
| `packages/astro/src/lib/validation/index-generator.ts` + test | Lifecycle column + summary; bug fix from #122 | #120, #122 |
| `docs/website/scripts/spec-banner-plugin.mjs` | new MyST plugin | #120 |
| `docs/website/myst.yml` | TOC entry + plugin registration | #120, #126 |
| `scripts/lint-status.ts` | new lint script | #120 |
| `package.json` + `.github/workflows/ci.yml` | wired `lint:status` | #120 |
| `docs/website/explanation/textbook-architecture.md` + `textbook-use-cases.md` | fixed pre-existing free-form status drift | #120 |
| `packages/components/tsconfig.json` | `.storybook` added to include | #123 |
| `packages/components/src/components/EquationRef/EquationRef.stories.tsx` | PopoverOpen story | #124 |
| `packages/components/__snapshots__/chromium/components-equationref--popover-open.png` + `--dark.png` | new VR baselines | #124 (via vr-update workflow) |
| `scripts/regenerate-validation-index.mts` | routed through cluster barrel | #125 |
| `docs/website/decisions/0001-0062.md` (all 61) | added `status:` frontmatter | #126 |
| `docs/website/status/validation.md` | regenerated dashboard | #120, #126 |
| `examples/smoke/integrations/pedagogy-index-dump.ts` | new smoke integration | #127 |
| `examples/smoke/astro.config.ts` | wired the dump | #127 |
| `examples/smoke/e2e/proving-chapter.spec.ts` | function-of-content rewrite | #127 |

Net: 7 PRs, 1 new ADR, ~5 new files in packages, 61 frontmatter edits, 2 new VR baselines, 1 new MyST plugin, 1 new lint script, 1 new smoke-target integration. Zero rollbacks. Zero CI-blocking regressions. One self-surfaced bug (filed + fixed same day).
