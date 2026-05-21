# Sprint K — Code-quality review

**Date:** 2026-05-21
**Trigger:** Sprint K committed work (7 commits since 2026-05-19)
plus 14 modified + 3 new uncommitted files in the working tree.
Anna asked for honest, objective feedback before continuing UI/UX
hardening.
**Method:** Three parallel review agents — committed state,
uncommitted refactor, open-backlog regression check.
**Branch:** `fix/learning-objectives-tightening` (7 ahead of `main`).

---

## Grade

### Committed Sprint K (7 merged commits): **A− (90/100)**

- Agent 1 (committed state): **82**
- Agent 3 (backlog regression): **94**
- Rolled up with weight on backlog progress: **90**.

### Current working tree (committed + uncommitted): **B (82/100)**

- Agent 2 (uncommitted refactor, current state): **72** — drags
  the average because real defects ship in the working tree.
- After P1 must-fix list lands: Agent 2 climbs to **86**, rolled-up
  grade returns to **A− (~90)**.

### Why two grades

The work *as currently merged on `main` plus committed Sprint K* is
in A territory. The work *as it stands in the working tree* has
five real defects that violate the project's zero-warning rule and
ship a failing test. Holding both numbers up is fair to the work —
the design is sound, the execution mid-step.

---

## Test metrics (captured 2026-05-21, 11:37 PT)

| Surface | Status |
|---|---|
| `pnpm exec biome check` | **5 errors + 4 warnings + 3 infos** |
| `pnpm turbo run typecheck` | **0 errors, 0 warnings, 0 hints** ✓ |
| `pnpm turbo run test:unit` (components / core / cli) | **1 test file failed, 69 passed (70); 1 test failed, 603 passed (604)** |
| `pnpm lint:loc` (ADR 0061 budget) | **0 errors, 0 warnings, 17 infos, 8 exempt** ✓ |
| Working-tree delta | **15 files changed, +827 / −254** |
| Asset scope reviewed | 7 committed commits + 17 working-tree files |

### Specific defects (from biome + vitest)

1. `packages/astro/src/lib/clean-heading-text.ts:33` —
   `noMisleadingCharacterClass` error (ZWJ inside `[]`).
2. `packages/components/src/components/Figure/Figure.tsx:1` —
   `organizeImports` error.
3. `packages/astro/src/styles/textbook-layout.css`,
   `Figure.tsx`, `KeyEquation.tsx` — three files need
   `biome format --write`.
4. `textbook-layout.css` lines 240/255/356 + `KeyEquation.module.css`
   line 114 — 4 `noDescendingSpecificity` warnings (one of them
   caused by a duplicate `.sophie-toc` block).
5. `OMIFlow.test.tsx:173 / :196 / :198` — 3 `noUselessFragments`
   infos (pre-existing; flagged because Sprint K touched the file).
6. `packages/components/src/components/KeyEquation/KeyEquation.test.tsx:121`
   — test asserts `screen.getByText(/9\.81 m\/s\^2/)` against
   plain text, but the new `<InlineTex>` swap in
   `KeyEquation.tsx:165–175` renders units via KaTeX. Test is now
   out-of-date; the new behavior is correct (units like `cm s^{-1}`
   no longer collapse to `cms-1`).

---

## Agent findings — committed Sprint K (Agent 1)

### Summary
Title-bar tightening is internally consistent, `<ChapterTitle>` is
well-decomposed, MyST-sidebar flip reuses the preference factory
cleanly. The biggest concern is unmistakable: four near-identical
`.titleBar` blocks (LO/Predict/Reflection/Callout) ship without an
extraction — DRY waived where CLAUDE.md says it should be honored.
The biggest win is the principled SSR diagnostic in `d0c3860`
(documents root cause + records the deferred structural fix instead
of papering over it).

### Findings

**P1 — Title-bar duplication should be extracted.**
`packages/components/src/components/{LearningObjectives,Predict,Reflection,Callout}/*.module.css`.
Four `.titleBar` rules share the same shape:
`display: flex; align-items: baseline; gap: var(--sophie-space-2);
padding: var(--sophie-space-1) var(--sophie-space-4); font-size:
var(--sophie-text-small); letter-spacing: 0.02em; font-weight: semibold`,
plus identical `.icon { flex-shrink: 0; transform: translateY(0.15em); }`
and identical `.titleBar .heading::before { content: ""; }`
Sprint-G counter-zeroing rule on the two `h2` callers. CLAUDE.md
explicitly says: *extract reusable patterns once they're paid for by
≥2 callers* — there are 4. The right shape is a `<ChromeTitleBar
accent="teal|rose|status-*">` compound primitive in
`@sophie/components/primitives/` that owns the baseline alignment,
label-voice typography, and `::before`-counter zero, exposing the
per-accent token via a CSS var. ADRs 0061 (focused files,
AI-author-friendly), 0023 ("refactor outward as patterns emerge").

**P1 — `data-toc="closed"` cap-cascade is structurally wrong.**
`packages/astro/src/styles/textbook-layout.css:411–441` vs commit
`997e545`'s message. Commit message claims "data-toc='closed' rule
mirrors data-sidebar='closed' — collapses `--sophie-right-w` to 0,"
but the actual rule at line 418 only sets `.sophie-toc {display:
none}`. The right column itself stays at 280px (line 25,
`--sophie-right-w: 280px`) per the explicit rev2-decoupling comment
("the column stays at its 280px width with asides still docked").
Yet the content-cap cascade at lines 433–441 assumes the column
collapses: `[data-toc="closed"] .sophie-content { max-inline-size:
min(85ch, 100%) }`. When sidebar is open AND `data-toc="closed"`,
the grid still allocates the right column 280px, so the 85ch cap is
competing with zero freed horizontal space. **Docs and code
disagree.** Either (a) flip rev2 and collapse `--sophie-right-w`
when ToC is closed AND no margin asides exist, or (b) keep rev2 and
adjust the cap cascade to widen only when ToC is closed AND no
docked asides on the page.

**P2 — No tests for `<ChapterTitle>`, `<TocToggle>`, or
`rightSidebarPref`.** `packages/astro/src/components/ChapterTitle.astro`
+ `TocToggle.astro` + `preferences/right-sidebar.ts`. Three
brand-new surfaces, zero new test files. `ChapterTitle.astro`'s
`TITLE_PREFIX_RE` + 1/2/3+ author conjunction logic + chapter-vs-order
fallback is exactly the kind of pure logic vitest exists for;
`sidebarPref` has `theme.test.ts` / `view-mode.test.ts` siblings but
`right-sidebar.ts` lacks one. ADR 0004 requires axe-core on
component PRs; the spirit ("verify before claiming") applies.
Extract `<ChapterTitle>`'s prefix-strip + byline-conjunction into
sibling `chapter-title-format.ts` and unit-test it.

**P2 — `<ChapterTitle>` not integrated with pedagogy-index
(ADR 0038).** `packages/astro/src/lib/pedagogy-index/extractors/`.
`<ChapterTitle>` writes title/subtitle/byline into chapter HTML, but
nothing in `extractors/` or `transforms/` indexes the new `subtitle`
or `authors` fields. The chapter schema (`chapter.ts:88, 116`) carries
both as Zod-typed frontmatter; pedagogy-index should surface them so
cross-chapter consumers (CourseObjectives, search index, future LMS
export) can use them without re-parsing MDX. Per ADR 0060
§"universal+reusable → registry."

**P2 — SSR-warning suppression is a band-aid by author's own
admission.** `packages/components/src/components/{GlossaryTerm,
EquationRef,FigureRef,ChapterRef,KeyEquation}/*.tsx` (commit
`d0c3860`). Anna's commit message: "Deferred (structural):
re-architect so setters run before MDX SSR ... Worth its own issue;
not a quick fix." The `typeof document !== "undefined"` gate
suppresses the symptom; the underlying ordering bug (setters fire
after MDX-island SSR) still ships bare-prose HTML on SSR for
hover-card terms. Affects (a) initial paint for screen readers
reading SSR content, (b) SEO indexing of glossary-resolved terms,
(c) the no-JS fallback. Verify a follow-up issue exists; if not,
open one with the diagnostic evidence already in the commit message.

**P3 — `<TocToggle>` `aria-controls` references a non-existent ID.**
`packages/astro/src/components/TocToggle.astro:25` has
`aria-controls="sophie-right-region"` but `RightColumn.astro:10`
renders `<aside class="sophie-right" aria-label="...">` with no `id`.
Without the target ID, the ARIA reference is dangling. Add
`id="sophie-right-region"` to the `<aside>` in `RightColumn.astro`.
ADR 0004 a11y compliance.

**P3 — `<ChapterTitle>` byline lacks `<address>` semantics.**
`ChapterTitle.astro:106`. HTML5 spec uses `<address>` for author
attribution within `<article>`/`<header>` context. Low-cost upgrade;
better screen-reader announcement.

**P3 — `frontmatter.chapter` runtime guard duplicates schema.**
`ChapterTitle.astro:71–73` accepts `lectureNum > 0` (typeof number
guard), but the schema (`chapter.ts:102`) is already
`z.number().int().positive().optional()`. Trust the schema; either
drop the runtime guard or generate a `LectureNumber` brand from Zod.

**P3 — Vestigial CSS in `LearningObjectives.module.css`.**
Lines 94–137 carry `.row` / `.checkbox` / `.label` / `.verb` rules
that no longer have callsites in this file's `.tsx` — `<Objective>`
owns its own styles now. Dead CSS; remove.

### Wins (committed state)

1. Commit `d0c3860` is the right kind of debug-write-up — diagnostic
   evidence in the message (instance `jgqqmn`, 36 misses then 36
   sets, wrong order), explicit "symptom-fix, structural-fix
   deferred" framing, 5 callsites updated in lockstep, inline code
   comment documenting SSR ordering for future maintainers.

2. `<ChapterTitle>` schema/render split is clean. Schema fields
   (`subtitle`, `authors`, `chapter`, `order`) live in
   `packages/core/src/schema/chapter.ts` as proper Zod; the component
   does no business logic beyond format. Decoupling `chapter`
   (display) from `order` (sort key) is principled — allows future
   renumbering without title rewrites. Defensive `TITLE_PREFIX_RE`
   (en/em/hyphen dash tolerant) lets mid-migration chapters not
   double-prefix.

3. Migration commit `29a86bb` follows "drop legacy shape in one PR"
   from CLAUDE.md. 5 chapter titles migrated simultaneously; audit
   warnings CT-1 + CT-2 closed; no shim, no dual-mode.

4. Sprint K title-bar comments cite *root cause + specificity
   arithmetic* — e.g. `LearningObjectives.module.css:57–62` ("Two-
   class selector for higher specificity (0,2,0) — beats the global
   `.sophie-content h2` rule (0,1,1)"). Explains *why*, not *what* —
   matches CLAUDE.md style.

5. `d9ea1fc` closes audit warnings with substantive content, not
   muted lint. Adding `EquationRef` to spectra-and-composition,
   declaring the second misconception node to satisfy I1, tightening
   MultiRep alt-text — disciplined sprint sequencing with deferral
   linkage stated in the message.

6. `rightSidebarPref` reuses `definePreference` factory; no new
   pattern, no duplication; matches `sidebarPref`'s cross-tab
   `storage` sync + ARIA-expanded mirror.

---

## Agent findings — uncommitted Sprint K refactor (Agent 2)

### Summary
Coherent layout refactor with strong design intent (decoupled ToC/
sidebar/asides, MyST-quality nav chrome, KaTeX in equation
constants). Working tree ships three real bugs that block commit: a
`noMisleadingCharacterClass` regex defect, a duplicate `.sophie-toc`
block, drift hazard between Part-exclusion lists. Biggest win is
the conceptual cleanup of view-mode — now a pure content-cap preset
orthogonal to sidebar visibility. Biggest concern is
`textbook-layout.css` becoming a 1412-LOC dumping ground for
unrelated chrome.

### Must-fix before commit (P1)

1. **Misleading character class in `cleanHeadingText`.**
   `packages/astro/src/lib/clean-heading-text.ts:33`. The regex
   `/[​‌‍﻿]/g` puts ZWJ (U+200D) inside a character class — the
   documented Unicode-confusable bug Biome flags. Replace with
   alternation: `/(​|‌|‍|﻿)/g`. Current
   invisible literals are also a readability bug.

2. **Duplicate `.sophie-toc` block.**
   `packages/astro/src/styles/textbook-layout.css:721` and `:857`.
   L721 block (`position: relative; z-index: 2`) is dead — overridden
   130 lines later by `position: sticky` with its own `z-index: 2`.
   Delete L721–724. Root cause of 2 of 3 `noDescendingSpecificity`
   warnings.

3. **Failing `KeyEquation` test.**
   `packages/components/src/components/KeyEquation/KeyEquation.test.tsx:121`.
   Asserts `screen.getByText(/9\.81 m\/s\^2/)` against plain text,
   but constants now render via `<InlineTex>` → KaTeX HTML.
   New behavior is the *desired* one (units like `cm s^{-1}` no
   longer collapse). Update test to assert on `.katex` selector or
   the DOM structure of the `<dd>` constants value. The
   `render-text-with-math.ts` change is *not* the cause — the
   failure is from the `<InlineTex>` swap in `KeyEquation.tsx:165–175`.

4. **`organizeImports` error in `Figure.tsx`.**
   `packages/components/src/components/Figure/Figure.tsx:1`. Run
   `pnpm exec biome check --write` or hand-swap first two imports.

5. **Three files need formatting.** `textbook-layout.css`,
   `Figure.tsx`, `KeyEquation.tsx`. `pnpm exec biome format --write`
   for those three paths.

### Should-fix before PR (P2)

1. **Part-exclusion list drift.**
   `packages/astro/src/components/TocSidebar.astro:38–44` and
   `packages/astro/src/styles/textbook-layout.css:240, 255, 356`.
   TocSidebar adds `assumptions-and-limitations` to the exclusion
   set; the CSS doesn't. Sync them or extract a single TS constant
   `PART_EXCLUSION_SLUGS` in `packages/astro/src/lib/`.

2. **Third `noDescendingSpecificity` warning.**
   `KeyEquation.module.css:114`. Move `.tex {}` block (L114) above
   `.texRow > .tex {}` block (L37). Pure ordering fix.

3. **Three `noUselessFragments` infos in `OMIFlow.test.tsx`.**
   Pre-existing but the zero-warning policy says they're whoever-
   touches-the-file's responsibility.

### Architectural concerns (P3)

1. **`textbook-layout.css` at 1412 LOC.** Past ADR 0061's 800-LOC
   hard cap for new files (existing-file grace, but +447 LOC is
   >45% growth). Now contains: grid skeleton, drop-cap rules,
   view-mode logic, sidebar disclosures, ToC sticky behavior,
   breadcrumb chrome, status chip chrome, chapter-glossary screen
   styles, print-media reset. Recommend follow-up PR splitting into
   `textbook-shell.css` (grid + media queries), `textbook-prose.css`
   (drop-caps, headings, counters), `textbook-chrome.css` (topbar +
   sidebar + ToC nav). Breadcrumb/status-chip/chapter-glossary
   would be cleaner as `ChapterBreadcrumb.module.css` etc.

2. **`KeyEquation.tsx` at 358 LOC.** Past 300-LOC info threshold.
   `InlineTex` + `formatUnitTex` + `humanizeTermSlug` are about
   LaTeX-rendering, not component composition; the singleton-vs-
   grouped branching for assumptions/common_misuses duplicates
   structure. Extract `InlineTex` + `formatUnitTex` to sibling
   `KeyEquation.tex-helpers.ts` (both used 4× in JSX). Consider
   `<BioGroup>` subcomponent for duplicated singleton-vs-list.

3. **`SearchTrigger.astro` ↔ `SearchModal.tsx` CustomEvent bridge.**
   Right shape (static Astro can't import React island state), but
   the event name `sophie:search-open` isn't a typed contract —
   both sides hand-roll `CustomEvent<{ query?: string }>` typing.
   Consider a single `runtime/events.ts` declaring the event-detail
   map. Not Sprint K's job; flag for next Search PR.

4. **Aside-positioning breakpoint duplication.** No shared
   single-source for `DOCK_BREAKPOINT_PX` (768) vs `@media
   (min-width: 768px)` block in CSS. Worth a `@sophie/theme`
   exported constant + CSS `@property` declaration. Post-Sprint K.

### Wins (uncommitted state)

1. **View-mode reconceptualization** — view-mode is now a pure
   content-cap preset (Default/Focused/Wide → no override / 66ch /
   105ch), orthogonal to sidebar visibility. Textbook example of
   structural-fix over patch.

2. **Decoupled ToC from right column** — `data-toc="closed"` now
   hides only `.sophie-toc`, leaving the right column at 280px so
   docked asides still anchor. Anna's design call documented inline.

3. **`<InlineTex>` for equation constants** — old code's string
   interpolation made unit rendering ugly (`cm s^{-1}` → literal
   "cm s^{-1}"). New code renders each fragment via KaTeX and wraps
   units in `\text{}` with re-entered math mode for `^{...}` /
   `_{...}` segments. Real authoring quality improvement.

4. **`<ChapterBreadcrumb>` + `<ChapterStatusChip>`** — small,
   contract-pure, prop-typed, self-suppressing on missing data,
   label-voice consistent. Textbook example of focused single-
   purpose chrome per ADR 0061. Framework-pure (Astro-only).

5. **`renderTextWithMath` extension for inline markdown** — the
   `**bold**` / `*italic*` addition is the right shape for
   prop-string content (figure captions, callout titles) without
   dragging the full markdown chain into JSX attribute values.
   Defensive `if (typeof text !== "string") return ""` correctly
   handles the JSX-undefined case the TS types lie about.

6. **`cleanHeadingText` for KaTeX-SSR pollution** — well-documented
   stopgap, properly diagnosed (KaTeX SSR emits both visible HTML +
   hidden MathML annotation, both grabbed by Astro's textContent
   extraction). Clear long-term fix noted in doc comment. The
   biome regex bug is fixable in one line.

---

## Agent findings — open-backlog regression (Agent 3)

### Summary
Of 11 audit items, **9 closed, 1 partially closed (key-insights
deferred-by-design), 1 stale**. Plus the bonus ADR-0058-deferred
chapter-level invariant graduated to OF-2 (ADR 0063, shipped).
Biggest progress: unified-anchor refactor with per-entry e2e
(definitions/misconceptions/deep-dives/OMI); `__set*` subpath
extraction (with comment marker left in the barrel for AI
discoverability); Callout `aria-labelledby` 3-line fix;
`renderChildrenToHtml` throws on non-empty hast failure.
Biggest stagnation: **color-contrast** P2 — still globally disabled
at `test-runner.ts:138`; comment now says "59 violations across 10
components" surfaced 2026-05-19 but no compensating audit, no
remediation, no ticket-linked deferral.

### Status table

| # | Item | Status | Evidence | Next |
|---|---|---|---|---|
| 1 | Callout aria-label duplicate | **resolved** | `Callout.tsx:125` uses `aria-labelledby={titleSpanId}`; explicit comment cites 2026-05-19 audit P1 | — |
| 2 | Doc atomicity (SROS + chapter-components) | **resolved** | `chapter-components.md:73,332,333` + `scientific-reasoning-os.md:81-82,125-132` | — |
| 3 | `__set*` setters leaking from root barrel | **resolved** | `internal/store-hydration.ts` subpath exists; `package.json:24-27` exports it; root `index.ts:37-43` carries discoverability comment | — |
| 4 | `color-contrast` axe rule globally disabled | **open, worse-scoped** | `.storybook/test-runner.ts:138`; comment now quantifies "59 violations across 10 components"; no `lint:contrast` script, no GitHub issue | File issue + either remediate or periodic axe-contrast sweep against static Storybook |
| 5 | ADR status sweep (8 ADRs) | **resolved** | 0019/0021/0028(`superseded` by 0057)/0039/0044/0046/0057/0058 all `status: shipped` | Tighten `validation.status` next — 0019/0021/0039/0057/0058 still `unvalidated` despite shipped code |
| 6 | ADRs missing back-fill Revisions | **resolved** | 0003:127 (R-0058), 0004:148,158 (R-0058), 0023:198 (R-0061), 0030:205,229 (R-0061) | — |
| 7 | ADRs shipped but triggers unmet | **mixed** | 0020 corrected to `accepted-design`; **0002** still `shipped` (rehype-citation/autolink absent); **0026** still `shipped` (tailwindcss dep absent) | Drop 0002 + 0026 to `accepted-design` OR add Revision declaring actual posture |
| 8 | `renderChildrenToHtml` silent null fallback | **resolved** | `jsx-utils.ts:241-251` throws with audit-citing error; empty-children branch returns `""` legitimately | — |
| 9 | Global "expand depth content" toggle | **open** | No `data-sophie-expand-disclosures` anywhere; ViewModeToggle unchanged | ~1-2h CSS-only a11y accommodation gap |
| 10 | `extractDeepDives` mixed-anchor counter test | **resolved** | `deep-dives.test.ts:122-127` cites 2026-05-19 audit C1/P2 #10 | — |
| 11 | Renderer-consistency PR | **resolved (key-insights partial by design)** | `Aside.tsx:54,61` routes all kinds through `deriveAsideAnchor` from `@sophie/core/schema`; `proving-chapter.spec.ts:158-185` loops per-entry over definitions/misconceptions/interventions/deep-dives/OMI | Optional: title the 2 untitled smoke ki entries (~15min) |

### Surprises

1. **`__set*` resolution cleaner than asked** — root barrel kept
   explicit comment block at `index.ts:37-43` directing AI authors
   to the subpath, preserving ADR 0061 Rule 4 (filename-as-discovery).
   Better than the audit's recommendation.

2. **ADR 0028 went to `superseded` (by 0057), not `shipped`** —
   actually the right call; matches the supersedes pointer at
   `0057-visual-regression-baseline.md`. Sharper than the audit's
   lump-with-shipped framing.

3. **`color-contrast` got worse in measurement, not better in
   remediation.** Comment now quantifies the surface (59 violations,
   10 components) so the gap is harder to ignore — but no fix or
   issue-link is on the books.

4. **ADRs 0044 + 0046 validation now `in-progress`**
   (last_validated 2026-05-17) — better than `unvalidated`, but
   0046 evidence still says "v1 implementation sprint scheduled" —
   biography components are still TODO.

### Bonus: ADR 0058 deferred chapter-level audit invariant —
**graduated.** ADR 0063 lands it as OF-2; implementation at
`packages/astro/src/lib/pedagogy-audit/invariants/omi-flow.ts:47-48`;
tests in `omi-flow.test.ts:97-128`. CLAUDE.md table already cites it.

---

## P1–P5 backlog (rolled up across all three agents)

### P1 — block Sprint K commit

1. **Fix biome error in `clean-heading-text.ts:33`** —
   `noMisleadingCharacterClass` (ZWJ inside `[]`). Replace with
   alternation. *Sprint K scope.* (Agent 2 #1)
2. **Delete duplicate `.sophie-toc` block** —
   `packages/astro/src/styles/textbook-layout.css:721–724`. Dead;
   overridden 130 lines later. *Sprint K scope.* (Agent 2 #2)
3. **Update `KeyEquation.test.tsx:121` test** to match new
   `<InlineTex>` rendering. *Sprint K scope.* (Agent 2 #3)
4. **Fix `organizeImports` in `Figure.tsx:1`.** *Sprint K scope.*
   (Agent 2 #4)
5. **Run `biome format --write` on textbook-layout.css /
   Figure.tsx / KeyEquation.tsx.** *Sprint K scope.* (Agent 2 #5)
6. **Decide and document `data-toc="closed"` cap-cascade** —
   `textbook-layout.css:411–441` docs and code disagree. Pick (a)
   collapse `--sophie-right-w` when ToC closed + no asides, or (b)
   keep rev2 and adjust cap cascade. *Sprint K scope.* (Agent 1 #2)

### P1 — next hardening sprint (not Sprint K)

7. **Color-contrast 59-violation surface.**
   `packages/components/.storybook/test-runner.ts:138`. Either
   remediate (token sweep) or land compensating periodic
   axe-contrast workflow against static Storybook + open issue
   enumerating the 59 violations. ADR 0004 mandates axe coverage; an
   indefinite rule disable without a tracked compensating control is
   the gap. Half-to-one day discovery + N for fixes. (Agent 3 #4)

8. **Extract `<ChromeTitleBar>` primitive** for
   LO/Predict/Reflection/Callout. Four near-identical `.titleBar`
   shapes ship together; future variants must touch four files.
   *Next sprint scope.* (Agent 1 #1)

### P2 — should-fix before next PR

9. Sync Part-exclusion list drift between `TocSidebar.astro` and
   `textbook-layout.css`. Extract `PART_EXCLUSION_SLUGS` constant.
   (Agent 2 P2 #1)
10. Move `.tex {}` block above `.texRow > .tex {}` in
    `KeyEquation.module.css:114`. (Agent 2 P2 #2)
11. Clear three `noUselessFragments` infos in `OMIFlow.test.tsx`.
    (Agent 2 P2 #3)
12. Add vitest coverage for `<ChapterTitle>`, `<TocToggle>`,
    `rightSidebarPref`. Extract format helpers to
    `chapter-title-format.ts`. (Agent 1 #3)
13. ViewModeToggle expand-disclosures option — CSS-only a11y
    accommodation, ~1-2h. (Agent 3 #9)
14. ADR 0002 + 0026 status correction to `accepted-design` (or add
    Revision declaring actual posture). Mechanical, ~15min.
    (Agent 3 #7)
15. ADR validation tightening for shipped-but-`unvalidated`
    (0019/0021/0039/0057/0058). Back-fill evidence blocks following
    0002/0003/0004 shape. ~1h. (Agent 3 surprise #4)

### P3 — architectural debt

16. Split `textbook-layout.css` into shell / prose / chrome modules.
    Or extract breadcrumb/status-chip/chapter-glossary CSS to
    component-sibling `.module.css`. Follow-up PR. (Agent 2 #1)
17. Extract `InlineTex` + `formatUnitTex` from `KeyEquation.tsx` to
    sibling `KeyEquation.tex-helpers.ts`. Both used 4× in JSX.
    (Agent 2 #2)
18. Type the `sophie:search-open` CustomEvent contract in
    `runtime/events.ts`. (Agent 2 #3)
19. Add `id="sophie-right-region"` to `<aside>` in
    `RightColumn.astro:10` — fixes dangling `aria-controls`.
    (Agent 1 #5)
20. Integrate `<ChapterTitle>` subtitle/authors into pedagogy-index
    extractors so consumers don't re-parse MDX. (Agent 1 #4)
21. `<address>` semantics for `ChapterTitle.astro:106` byline.
    (Agent 1 #6)
22. Open follow-up issue for the SSR setter-ordering structural fix
    documented in commit `d0c3860`. (Agent 1 #4)

### P4 — minor / nice-to-have

23. Remove vestigial CSS in `LearningObjectives.module.css:94–137`.
    (Agent 1 #8)
24. Drop runtime guard in `ChapterTitle.astro:71–73` — trust Zod
    schema. (Agent 1 #7)
25. Shared `DOCK_BREAKPOINT_PX` constant in `@sophie/theme`.
    (Agent 2 #4)
26. VR baselines for Sprint K sidebars' new default-closed state.
    (Agent 3 P3)

### P5 — defer / track

27. Title the 2 untitled smoke ki entries to close the key-insight
    per-entry e2e gap in `proving-chapter.spec.ts:152-157`. ~15min.
    (Agent 3 #11)
28. ADR 0046 biography components v1 implementation (already
    tracked as in-progress validation).

---

## What Sprint K demonstrated

**Strengths the work shows.**
- HITL discipline: commit `d0c3860` documents the deferred
  structural fix instead of papering over.
- Schema-first thinking: `<ChapterTitle>` properly separates
  display-prefix (`chapter`) from sort-key (`order`).
- No-back-compat principle honored: chapter migration `29a86bb`
  drops legacy shape in the same PR.
- Pedagogical intent over CSS chrome: `<InlineTex>` for equation
  constants is a real authoring-quality win, not just polish.

**Patterns to watch.**
- DRY threshold breached on `.titleBar` (4 callsites, no extraction).
- CSS file accretion at 1412 LOC working against ADR 0061's
  AI-author-friendly file-shape principle.
- Hydration/SSR ordering bugs being patched rather than restructured
  (acknowledged by Anna, but the deferred-issue trail needs to be
  visible to future-AI authors).
- Test gaps for new components keep appearing (3 components in
  Sprint K alone). The "verify before claiming" spirit is the
  guardrail; component-level vitest is the easy implementation.

---

## Close-out checklist

- [ ] P1 #1–6 (Sprint K commit blockers) landed before Sprint K PR
      opens.
- [ ] P1 #7 (color-contrast) gets a tracked issue with the
      59-violation enumeration even if remediation defers.
- [ ] P1 #8 (`<ChromeTitleBar>` extraction) scoped as the next
      hardening sprint or folded into Sprint L scope.
- [ ] This review linked in `docs/reviews/README.md` table.
- [ ] Open items roll into the 2026-05-21 UI/UX review's synthesis
      section (Phase C).
