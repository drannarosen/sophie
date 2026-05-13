# Bucket B PR 6 audit — book-theme chrome layer complete

**Date**: 2026-05-13
**Trigger**: Bucket B PRs 3, 4, 5, 6 all merged since the prior
audit; ADRs 0035–0037 direct-pushed; vite peerDep + content-width
calibration shipped. Fifth audit in the series.
**Methodology**: Same as prior four — fresh metric runs, grep-
verified P2/P3 fix presence, re-score by rubric. The
[reviewing-project-quality](file:///Users/anna/.claude/skills/reviewing-project-quality)
skill structured the process.
**Verdict**: **A+ (96/100)** — up from A (93) at the
[Bucket B PR 2 audit](2026-05-12-bucket-b-pr2-audit.md). Three-
point lift, driven by (a) the multi-chapter smoke target lifting
the domain-correctness cap, (b) ADRs 0035–0037 closing the
design-system drift cap, and (c) two genuinely new
architectural patterns shipped + codified (cross-bundle DOM
observation, DOM-coordinate-driven layout adapter).

---

## What changed since the Bucket B PR 2 audit (2026-05-12 → 2026-05-13)

Roughly 24 hours; **four PRs**; **three new ADRs**; **one direct-
push docs review**.

| PR / commit | Item | Effect |
|---|---|---|
| #32 (`ec8d251`) | Sidebar module/chapter nav (Bucket B PR 3) | New `ModuleSchema` in `@sophie/core` (required `module: Slug` on ChapterSchema, optional `order: number`); pure `chaptersForModule` helper; data-driven `<ModuleNav>` primitive. Smoke target reshuffled to 3 chapters across 2 modules. 26 new vitest + 6 new Playwright cases. |
| #33 (`b26c4c6`) | In-page ToC + mobile drawer (Bucket B PR 4) | Pure helper `lib/group-headings.ts` (7 vitest); `<TocSidebar>` pure-Astro primitive (scroll-spy via IntersectionObserver); `<TocDrawer>` mobile slide-over with vanilla-JS focus trap. 9 new Playwright cases. |
| #34 (`1fac6bb`) | View modes (Bucket B PR 5) + Lucide icon adapter | Third `definePreference` consumer — Default/Focused/Wide cycle with `v` keyboard shortcut + input-focus guard. `lucide-static` introduced as icon vocabulary for chrome; `SidebarToggle` + `ThemeToggle` SVGs refactored to use it. 41 new vitest + 12 new Playwright. Hit + fixed CI's first dep-related lockfile drift surfacing (vite peerDep widened to `^7 \|\| ^8`). |
| #35 (`26488d1`) | `<Aside>` Tufte-style margin notes (Bucket B PR 6) + content-width calibration | First Bucket B PR in `@sophie/components` (React content layer) — 4-variant aside docked in the right column via vanilla-JS scroll-spy + collision-avoidance cascade. Inline `<details>` fallback on mobile/Focused/Wide. Content widens to `min(95ch, 100%)` when sidebar collapsed (responsive to user agency). 24 component + 13 positioning vitest + 5 content-width + 12 aside e2e. |
| `aa1a3f4` | docs(reviews) peerDep ↔ lockfile sweep | Codified the latent-drift pattern that PR #34 surfaced; documented the local frozen-lockfile pre-PR check; saved as project memory (`feedback_pre_pr_lockfile_check`). |
| `86326d1` | ADR 0035 (flat kind-less token naming) + ADR 0036 (`definePreference` factory) | Codified shipped patterns from PRs 1–2. |
| `1a10fd9` | ADR 0037 (cross-bundle DOM attribute observation) | Codified the pattern that emerged in PR #35: Astro bundles each `<script>` tag separately, so module singletons are per-bundle; cross-bundle observation must go through DOM-level signals (MutationObserver on `<html>` attributes). |

Net code: **~1500 LOC** across `@sophie/components/Aside` (~400),
`@sophie/astro/lib + preferences + components` (~500), CSS (~120),
smoke chapter MDX + e2e (~500). Net docs: **3 ADRs + 4 design
docs + 2 reviews**.

---

## Test metrics (fresh runs, post-merge)

| Layer | PR 2 audit | Now | Δ |
|---|---|---|---|
| `@sophie/components` unit (tests/files) | 161 / 32 | **185 / 33** | +24 / +1 |
| `@sophie/astro` unit (tests/files) | 48 / 6 | **102 / 8** | **+54 / +2** |
| `@sophie/core` unit (tests/files) | 15 / 3 | **34 / 4** | **+19 / +1** |
| `@sophie/theme` unit | 0 (build-emitted) | 0 | — |
| **Total unit** | **224** | **321** | **+97** |
| `examples/smoke` e2e (cases / files) | 44 / 10 | **87 / 15** | **+43 / +5** |
| Storybook test-runner | 45 axe-clean | 45 axe-clean (+1 component pending stories) | +0 |
| ADRs | 35 | **38** | +3 |
| Components in `@sophie/components` | 12 | **13** | +1 (`<Aside>`) |
| Chrome primitives in `@sophie/astro/components` | 7 | **12** | **+5** (`ModuleNav`, `TocSidebar`, `TocDrawer`, `ViewModeToggle`, `TextbookHead` was already there but its role is more central now) |
| Smoke target chapters | 1 | **3** | +2 (1 real + 2 stubs across 2 modules) |
| Smoke modules | 0 (single chapter) | **2** | +2 |

`@sophie/astro` test count more than doubled (48 → 102) driven by
the new `view-mode.ts` (26 cases), `aside-positioning.ts` (13),
`icons.test.ts` (8), plus carryover from prior ADRs. Coverage
breakdown (`pnpm --filter=@sophie/astro test --coverage`):

- `src/preferences/` — **91.91% statements / 89.33% branches /
  84.84% functions / 94.04% lines** (factory + 3 prefs heavily
  tested; one or two error paths uncovered)
- `src/lib/` — **50.96% statements** (pure algorithms fully
  tested; `installAsidePositioning` lifecycle helpers covered
  by Playwright e2e, not vitest unit — by design per the
  testing-anti-patterns memory)
- `src/icons/` — **100% statements** (shape-smoke covers all 8
  exports)
- `src/components/*.astro` — excluded from vitest coverage
  (.astro files don't compile to vitest-friendly format; covered
  by e2e instead)

---

## Quality grades

| Category | PR 2 audit | Now | Δ | Evidence |
|---|---|---|---|---|
| Test coverage | 19 | **19** | — | +97 unit + 43 e2e (~50% growth across both layers). Three new testing patterns codified: (1) boot-script-eval via `new Function(script)()` in JSDOM; (2) keyboard-shortcut + input-focus-guard tests via synthetic KeyboardEvent + JSDOM contentEditable workaround; (3) DOM-clone-positioning algorithm via deterministic pure-function inputs. Lib coverage 51% is *honest* — lifecycle helpers (MutationObserver, ResizeObserver, rAF) belong in e2e per testing-anti-patterns discipline; coverage gap is intentional. Holding at 19 because the ProfileProvider context unreachable + genuine dual-tab BroadcastChannel test gaps still apply. |
| Design system | 18 | **19** | **+1** | ADR 0035 (flat kind-less tokens) + ADR 0036 (`definePreference` factory) + ADR 0037 (cross-bundle observation) close the prior cap. The `sa-` token namespace (PR 2's P2-8) still hasn't migrated; the new `lucide-static` icon adapter (PR 5) is a workspace-wide vocabulary now used by 3 chrome primitives. Holding back from 20 because the 2-adapter icon convention (lucide-static for chrome + lucide-react for pedagogy) still needs ADR codification (slated as 0038). |
| Domain correctness | 18 | **19** | **+1** | The cap "lifts when a second chapter exists" from PR 2 → 3 chapters across 2 modules now ship. PR 3's `<ModuleNav>` exercises real chapter discovery; PR 4's `<TocSidebar>` works across the smoke chapter's H2/H3 structure; PR 6's `<Aside>` instances anchor to real prose in spoiler-alerts. Holding back from 20 because 2 of 3 chapters are still stubs (measuring-the-sky + stellar-evolution are placeholders for nav demos, not full chapters with their own asides + ToCs). |
| Accessibility | 19 | **19** | — | NEW: `<Aside>` ships axe-clean across all 4 kinds in both docked + inline modes; WCAG 2.1 SC 2.5.5 (44px touch target) explicitly tested. `<ViewModeToggle>` axe-clean. `<TocDrawer>` mobile slide-over keyboard-trap + Escape + click-outside per ADR. Persisting: `prefers-contrast: more` still unsupported (P3-5 carryover); arrow-key nav on radio groups (P3-4); jest-axe matcher (P3-3). |
| Architecture | 19 | **20** | **+1** | NEW: cross-bundle DOM-attribute observation pattern (ADR 0037) is a genuine architectural insight — the per-script Astro bundling gotcha surfaced organically in PR 6 and now has a load-bearing rule. NEW: DOM-coordinate-driven layout adapter pattern via `aside-positioning.ts` (pure function + lifecycle). NEW: two-adapter Lucide icon convention split by package. PR 5's `<ViewModeToggle>` is the canonical "minimum-shape" `definePreference` consumer — the AI-author template. The chrome layer now has clean separations: data attribute = truth source; JS singletons = per-bundle conveniences; CSS = orchestration. 20/20 is appropriate. |
| **Total** | **93/100** | **96/100** | **+3** | **A → A+** |

Grade band cutoffs: 95–100 = A+. **A+ entered for the first time.**
The ceiling for the next audit is now 98–100 — to reach 99+ would
need: domain-correctness 20 (more real chapters with cross-chapter
references, e.g. citations / glossary links / Refs), design-system
20 (the lucide-react adoption + sa- migration), accessibility 20
(prefers-contrast support).

---

## What's working (regression-prevention checklist)

Spot-verified by grep + fresh test runs:

| Fix | Verification |
|---|---|
| `:focus-visible` on every interactive control | Present in 13 `.module.css` files across `@sophie/components` + 3 toggle types in `textbook-layout.css`. |
| Zero hex/rgb in CSS Modules | `grep` returns 0 across all component CSS files; chrome CSS has 1 fallback literal (post-PR-31). |
| `audit()` invariants | 3 contracts have non-trivial `audit()` (LO, Predict, MG); 10 keep `() => []` stubs — same shape as PR 2 audit. |
| Schema rejection coverage | 12 component dirs have `safeParse` test coverage. `<Aside>` adds 8 schema cases on first ship. |
| **NEW** — `definePreference` invariants enforced by tests | Idempotency marker `data-sophie-pref-<key>`; window-level guards for storage, matchMedia, view-mode keyboard shortcut, aside-positioning. |
| **NEW** — `<Aside>` MDX block-level constraint documented | In design doc + component docstring; positioning script reliance on `previousElementSibling` is now explicit. |
| **NEW** — Lucide-static workspace-wide | `SidebarToggle` Menu, `ThemeToggle` Sun/Moon/SunMoon. PR 5's icons module is the single import surface for chrome. |
| **NEW** — Cross-bundle DOM observation via MutationObserver | PR 6's aside-positioning script observes `data-view-mode` + `data-sidebar` on `<html>` instead of subscribing to per-bundle singletons. Codified as ADR 0037. |
| **NEW** — Content-width responsive to sidebar state | `min(75ch, 100%)` open / `min(95ch, 100%)` closed; 5 e2e cases pin this contract. |
| **NEW** — Pre-PR lockfile check | Project memory `feedback_pre_pr_lockfile_check` saves the local-vs-CI strictness asymmetry that surfaced in PR #34. |

---

## Capability inventory — what Sophie can do, end of Bucket B PR 6

Grouped by layer, snapshot of what a chapter author or AI
scaffolder can rely on TODAY.

### Pedagogy layer — `@sophie/components` (13 components)

12 carryover from PR 2 + new `<Aside>` (4 kinds: note,
definition, digression, key-insight; optional title; renders as
`<details>` for native disclosure semantics). All ship: Zod
schema, axe-clean Storybook stories, focus-visible rings,
schema-rejection tests, `useInteractive` + `HydrationAnnouncer`
on persistent ones, BroadcastChannel LWW (ADR 0029), CSS Modules
with token-pure styles.

### Chrome layer — `@sophie/astro` (12 primitives + 4 preferences + 1 icon adapter + 2 lib modules)

| Primitive | What it does |
|---|---|
| `<TextbookLayout>` | Assembled book-theme shell; CSS Grid; default `topbar-trailing` = `<ViewModeToggle />` + `<ThemeToggle />`; default `topbar-leading` = `<SidebarToggle />`. Wires the aside-positioning lifecycle. |
| `<TextbookHead>` | Emits per-preference `is:inline` boot scripts for sidebar + theme + view-mode. Lives in `<head>` outside any React island (ADR 0033). |
| `<TopBar>` / `<Sidebar>` / `<ContentColumn>` / `<RightColumn>` | Layout primitives. Empty-slot-collapse pattern (ADR 0034). |
| `<SidebarToggle>` | Hamburger button (Lucide `Menu`) driving `data-sidebar`. |
| `<ThemeToggle>` | Cycle button driving `data-theme` (system → light → dark → system). Lucide `Sun` / `Moon` / `SunMoon`. matchMedia live-sync while stored=system. |
| `<ViewModeToggle>` | Cycle button driving `data-view-mode` (default → focused → wide → default). Bespoke 3-icon column shapes. Keyboard shortcut `v` with input-focus guard. |
| `<ModuleNav>` | Sidebar-slot nav of modules + chapters from Astro content collection. Data-driven from `@sophie/core`'s `chaptersForModule`. |
| `<TocSidebar>` | Right-column in-page ToC; scroll-spy via IntersectionObserver; `aria-current="location"` highlight. |
| `<TocDrawer>` | Mobile FAB + slide-over wrapping `<TocSidebar>` for narrow viewports. Vanilla-JS focus trap + Escape + click-outside. |

| Library | What it does |
|---|---|
| `definePreference({key, attribute, default, values, parse, serialize, resolve?, resolveExpression?})` | Factory for chrome state. Returns `{read, write, subscribe, bindToggle, bootScript}`. (ADR 0036) |
| `sidebarPref` / `themePref` / `viewModePref` | Concrete `definePreference` instances. Sidebar uses viewport-aware default; theme uses matchMedia resolve; view-mode is the minimum-shape (no resolve indirection). |
| `installSystemThemeListener()` | matchMedia change → re-apply `data-theme` when stored=system. |
| `installViewModeKeyboardShortcut()` | Global `v` keyboard shortcut with input-focus guard. |
| `installAsidePositioning()` | Vanilla-JS docking lifecycle for `<Aside>`. Pure `computeAsidePositions` algorithm + rAF-debounced reposition + MutationObserver on `<html>` (cross-bundle pattern per ADR 0037) + MutationObserver on `.sophie-content`. |
| `lib/group-headings.ts` | Pure `groupHeadings(headings)` for ToC nesting (H3 under H2). |
| `icons/index.ts` | Uniform icon export surface: `Menu`, `Sun`, `Moon`, `SunMoon`, `X` from `lucide-static`; bespoke `ViewModeDefault` / `Focused` / `Wide`. |

### Theme layer — `@sophie/theme`

- 57 CSS custom properties under `:root` (light defaults).
- 13 dark-aware properties; `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)` defaults.
- Token kinds: color, brand, status, typography, spacing, radius, layout, focus.
- Color tokens use `color-mix(in oklch, ...)` for consistent contrast.
- Tailwind preset generated from the same TS tokens (ADR 0005, naming finalized in ADR 0035).

### Runtime layer — `@sophie/core`

- IndexedDB via `idb-keyval` with `ResponseStore` repository (ADR 0007).
- BroadcastChannel LWW with per-write `Date.now()` timestamps (ADR 0029).
- `useInteractive` hook — single API for component persistence + cross-tab sync (ADR 0004).
- `HydrationAnnouncer` — per-component live-region for WCAG 4.1.3.
- **NEW** — `ChapterSchema.module` field + `chaptersForModule` helper (PR 3).
- Zod schema validation throughout.

### Renderer + integration — `@sophie/astro` (existing + chapter wiring)

- Astro 6 + MDX 5 + React 19 (ADR 0002).
- `<SophieChapter client:load>` boundary (ADR 0027).
- `makeStaticComponents({figures})` registers Aside, Callout, KeyEquation, MiniGlossary, Figure in MDX scope.
- 3 chapters in smoke target: `spoiler-alerts` (real, full content; 3 asides; ToC; module nav), `measuring-the-sky` (stub), `stellar-evolution` (stub).

### What's NOT yet possible (the gap to v1)

- **Search** — no Pagefind integration (Bucket B PR 7; the *one* primitive that legitimately needs React per ADR 0032).
- **Glossary popovers** — `<GlossaryTerm>` hover previews (Bucket B PR 8).
- **Cross-reference previews** — `<ChapterRef>` / `<EqRef>` / `<FigureRef>` (Bucket B PR 9).
- **Print stylesheet polish** — `@media print` rules (Bucket B PR 10).
- **Multi-chapter as real chapters** — 2 of 3 smoke chapters are stubs.
- **Concept maps / mind maps** — React Flow runtime per overview §X (Phase 2+).
- **CLI scaffolder** — `sophie create textbook` (Phase 7).
- **AI authoring surface** — schema-driven assistant per ADR 0030 (Phase 3).
- **LMS export / Quarto bridge / slides export** — Phase 4+.

---

## P1 / P2 / P3 backlog

### P1 — immediate, blocks consistency

**(None this audit.)** The vite peerDep drift surfaced in PR #34
is closed via the `^7 || ^8` widening + a project-memory entry
that documents the pre-PR check. Bucket B PR 6 closed cleanly.

### P2 — important; defer to Bucket B PR 7+ or fold into feature work

- **P2-NEW-1 — ADR 0038 (two-adapter Lucide icon convention)**:
  Codify `lucide-static` (chrome) + `lucide-react` (pedagogy
  follow-up) decision shipped in PR #34. Direct-push. ~200 words.
- **P2-NEW-2 — `lucide-react` adoption in `@sophie/components`**:
  Pedagogy components currently inline a few SVGs (KeyEquation,
  CollapsibleCard expander, others). Mechanical refactor; matches
  the icon convention. Separate PR scope, low risk.
- **P2-NEW-3 — `<aside class="margin-note">` audit**: PR #35
  migrated one hand-rolled aside to `<Aside>`; check whether any
  others exist in `spoiler-alerts.mdx` or future chapters. Brief
  grep + replace.
- **P2-NEW-4 — Bucket B PR 7 (Pagefind search)**: Next planned
  PR. The single primitive in Bucket B that legitimately needs
  React (Radix Dialog for focus trap + arrow-nav modal per ADR
  0032). Pagefind index built at `astro build` time; modal opens
  via `Cmd/Ctrl+K`. Will inherit ADR 0037 cross-bundle pattern
  if the modal needs to read view-mode for behavior.
- **P2-NEW-5 — ADR currency sweep for 0001–0029**: Continuing
  carryover. ADR 0005 (theming) is the known drift — its
  Triggers-section sketch of `--color-<kind>-*` was superseded
  by ADR 0035's flat kind-less naming. Other ADRs likely also
  drift; each needs a "still accurate?" review.
- **P2-5** (carried): `useInteractive.status` UI exposure. Hook
  returns it; no component renders it. Defer until needed.
- **P2-6** (carried): `ProfileProvider` context unreachable from
  MDX islands. Blocks Phase 5 instructor toggle.
- **P2-7** (carried): Naming inconsistency (`title` vs `heading`
  vs `prompt`). Wait for clearer pattern.
- **P2-8** (carried): `sa-` token namespace shared across 4
  self-assessment components. Migrate to per-component prefixes.
  Still in EffortLog.module.css (grep at audit time).
- **N-1** (carried): Genuine dual-tab Playwright test for
  BroadcastChannel LWW. Theme + view-mode storage-event cross-tab
  tests are partial templates.

### P3 — polish

- **P3-NEW-1** — Pre-PR `pnpm install --frozen-lockfile` git
  pre-push hook to surface lockfile drift before CI does.
  Currently a manual checklist item in project memory.
- **P3-NEW-2** — Asides in stub chapters: `measuring-the-sky` +
  `stellar-evolution` don't exercise `<Aside>`. If those become
  real chapters, add asides to round out the cross-chapter test
  surface.
- **P3-1** (carried): `:target` pulse on `CollapsibleCard` +
  `Figure`.
- **P3-3** (carried): Register `jest-axe`'s `toHaveNoViolations`.
- **P3-4** (carried): Arrow-key nav on radio groups.
- **P3-5** (carried): `prefers-contrast: more` support.
- **P3-6** (carried): Convert smoke target stubs into real
  chapters with their own LOs/asides/ToCs. Lifts domain
  correctness to 20.
- **N-2** (carried): Per-component focus-state Storybook stories.

### Out of scope (intentional caps)

- **A+ (95+) ceiling — REACHED.** Headroom for 97–98 requires:
  - Domain correctness to 20: 2 of 3 chapters become real
  - Design system to 20: `lucide-react` adoption + `sa-`
    migration + ADR 0005 currency
  - Accessibility to 20: prefers-contrast + arrow-key radio nav

- **Storybook visual regression** — deferred per ADR 0028 until
  Linux-native baselines. No change.

---

## Trajectory across five audits

| Audit | Date | Grade | Trigger |
|---|---|---|---|
| [Phase 1 hardening audit](2026-05-10-phase-1-hardening-audit.md) | 2026-05-10 | B− (73) | Trio 3 closed; pre-sprint baseline |
| [Post-hardening audit](2026-05-10-post-hardening-audit.md) | 2026-05-10 | B+ (84) | P1 sprint closed (PRs #17–#23) |
| [Sprint-to-A audit](2026-05-10-sprint-to-a-audit.md) | 2026-05-10 | A (91) | P2 sprint closed (PRs #24–#27) |
| [Bucket B PR 2 audit](2026-05-12-bucket-b-pr2-audit.md) | 2026-05-12 | A (93) | Bucket B PRs 1+2 closed (PRs #28–#31) |
| **Bucket B PR 6 audit** (this) | **2026-05-13** | **A+ (96)** | **Bucket B PRs 3+4+5+6 closed (PRs #32–#35)** |

Net: **+23 points across four sprints**, 19 PRs, **zero CI
failures on second push** (PR #34 hit the pre-existing vite
peerDep drift on first push; the rest landed green on first try).

---

## What this enables

**The chrome foundation is complete.** Bucket B PRs 7–10 each
have a clear pattern to follow + a clear architectural lane:

- **PR 7 (Pagefind search)**: React island via Radix Dialog;
  Cmd/Ctrl+K modal; index built by Pagefind at `astro build`
  time. Inherits cross-bundle DOM-observation if it needs to
  react to view-mode.
- **PR 8 (glossary popovers)**: Hover preview on `<GlossaryTerm>`;
  Radix Popover (already a dep via Callout's CollapsibleCard).
  Probably no cross-bundle state needed.
- **PR 9 (cross-reference previews)**: `<ChapterRef>` / `<EqRef>`
  / `<FigureRef>` with hover previews. Positioning is analogous
  to `<Aside>` docking — DOM-coordinate adapter pattern (per
  PR 6) likely reused.
- **PR 10 (print polish)**: `@media print` rules + view-mode
  override to render print-as-Wide. No JS.

**Bucket C onward**: AI-authoring surface, multi-chapter
authoring, CLI scaffolder. The 8-file component pattern (schema
+ contract + module.css + test + story + tsx + index) is
documented enough that AI authors per ADR 0030 can scaffold
new components against it.

**Next milestone**: PR 7 closure + ADR 0038 + ADR currency sweep
should drive the next audit to **A+ (97–98)**. Real chapter
content for chapters #2 and #3 of the smoke target is the
clearest path to **99+**.

---

## TL;DR — executive summary

Sophie is a **schema-driven, AI-authorable platform for
interactive scientific textbooks**. As of 2026-05-13, after
6 of 10 Bucket B PRs:

**Grade: A+ (96/100).** First A+ in the project's history.

**What works today:**
- 13 pedagogy components + 12 chrome primitives + 4 preferences
- Full book-theme layout: sidebar nav (module/chapter tree) +
  content column (responsive 75ch / 85ch / 95ch / 105ch) + right
  column (sticky ToC + docked asides) + top bar (sidebar / view-
  mode / theme toggles)
- 3 chapters across 2 modules in the smoke target (1 real, 2
  stubs)
- 321 unit tests + 87 Playwright e2e cases, all green
- 225 source files biome-clean, zero warnings
- 38 ADRs codifying all load-bearing decisions

**What's load-bearing:**
- `definePreference` factory (ADR 0036) — 3 consumers across
  chrome (sidebar / theme / view-mode)
- Cross-bundle DOM observation (ADR 0037) — the architectural
  insight from PR 6
- Vanilla-JS chrome (ADR 0032) — no React islands for chrome
  state; ~150 LOC of vanilla JS + factory invariants
- Compound-component primitives (ADR 0031) — assembled
  `<TextbookLayout>` + individually-exported primitives

**What's missing for v1:**
- Search, glossary popovers, cross-ref previews, print
  stylesheet (Bucket B PRs 7–10)
- Real chapter content for the 2 stub chapters
- AI-authoring surface (Phase 3)
- CLI scaffolder (Phase 7)
- LMS/Quarto/slides export (Phase 4+)

**Architectural maturity:**
The chrome layer has stable separations: data attribute = truth
source; JS singletons = per-bundle conveniences; CSS = orchestr-
ation; no JS reaches across preferences. Three independent
state machines (sidebar / theme / view-mode) coexist with two
DOM-coordinate layout adapters (TocSidebar scroll-spy + Aside
positioning). The factory + compound-component patterns are
documented enough that AI authors can produce new components
without re-inventing the contract.

**Trajectory:**
B− (73) → B+ (84) → A (91) → A (93) → **A+ (96)**, across four
sprints, ~3 days of focused work. The A+ ceiling at current
scope is ~98; reaching 99+ needs cross-PR content + 3-of-3
real-chapter coverage.

---

## References

- [Bucket B PR 2 audit](2026-05-12-bucket-b-pr2-audit.md) — prior
  state (A, 93/100).
- ADRs 0035 / 0036 / 0037 — token naming + factory + cross-bundle.
- PRs #32 (`ec8d251`), #33 (`b26c4c6`), #34 (`1fac6bb`),
  #35 (`26488d1`).
- Design docs: [PR 3 sidebar nav](../plans/2026-05-12-sidebar-module-nav-design.md),
  [PR 4 in-page ToC](../plans/2026-05-12-in-page-toc-design.md),
  [PR 5 view modes](../plans/2026-05-12-view-modes-design.md),
  [PR 6 Aside](../plans/2026-05-13-aside-design.md).
- [peerDep ↔ lockfile sweep](2026-05-13-peerdep-lockfile-sweep.md).
