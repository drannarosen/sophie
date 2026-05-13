# Bucket B PR 2 audit — Phase 2 chrome foundation landed

**Date**: 2026-05-12
**Trigger**: Bucket B PRs 1 + 2 + the React-peerDeps fix + the
follow-up token-rename all merged in a single sweep
(PRs #28 → #29 → #30 → #31, plus 5 new ADRs). Fourth audit in
the series.
**Methodology**: Same as the prior three — fresh metric runs,
grep-verified P1/P2 fix presence, re-score by rubric.
**Verdict**: **A (93/100)** — up from A (91) at the
[Sprint-to-A audit](2026-05-10-sprint-to-a-audit.md). Two-point
lift, driven by the new chrome-state factory + 44-test e2e
suite. A+ ceiling stays out of reach until a second chapter
exists.

---

## What changed since the Sprint-to-A audit

Two days; four PRs; five ADRs; one direct-push docs sprint:

| PR / commit | Item | Effect |
|---|---|---|
| #28 (`ec56daf`) | React/React-DOM as `peerDependencies` across `@sophie/*` | Killed the multi-React-copy "Invalid hook call" in dev mode for `<CollapsibleCard>` via Radix. Production was always green; this restored dev iteration. TDD via new `package-deps` invariant tests in `@sophie/components` and `@sophie/astro`. |
| `0875b65` | `docs/website/overview.md` — 20-section big-picture brainstorm | Codified vision, audience priority, AI-as-author model, success criteria, STEM scope, course-design phase + 7 artifacts, multi-editor plugin marketplace distribution, one-way lifecycle v1, Sophie-vs-Quarto/MyST positioning, book-theme layout + 3 view modes, no-inequitable-normative-affordances principle, v1.0/v1.5/v2+ phased release, concept maps + mind maps on shared React Flow runtime. |
| #29 (`a7efa72`) | TextbookLayout shell + sidebar toggle (Bucket B PR 1) | Compound-component layout primitives (`<TextbookLayout>` + `<TextbookHead>` + `<TopBar>` + `<Sidebar>` + `<ContentColumn>` + `<RightColumn>` + `<SidebarToggle>`). CSS Grid + vanilla JS chrome state + `is:inline` boot script. Mobile-default-closed + empty-slot-collapse + content-overflow guard. 8 new e2e cases. |
| `ff7ef64` | ADRs 0030–0034 | Audience model + 4 Bucket B PR 1 patterns (compound-component, vanilla-JS chrome state, `is:inline`-outside-React, empty-slot-collapse). |
| #30 (`3209542`) | `definePreference` factory + `<ThemeToggle>` (Bucket B PR 2) | Generic chrome-state factory: localStorage round-trip + `data-*` attribute + cross-tab `storage` event + idempotent toggle binding + boot-script-as-IIFE-string. Tri-state theme (`system`/`light`/`dark`) with `matchMedia` live-sync while stored=system. `<SidebarToggle>` + `<TextbookHead>` migrated to the same factory (no dual-shape drift). 22 vitest factory + 18 vitest theme + 9 Playwright. |
| #31 (`944dc54`) | Wire `textbook-layout.css` to actual `@sophie/theme` tokens | PR 1 bug surfaced by PR 2's visual smoke: 4 fictional token names (`--sophie-color-*`) fell through to hardcoded fallbacks; dark mode never reached the shell. 13 line edits, 1 file, +1 Playwright regression that asserts `.sophie-shell` computed bg differs between light and dark and sits below luminance midpoint. |

Net code: ~700 LOC across `packages/astro` chrome + tests +
component theme wiring. Net docs: 5 ADRs + 1 design doc + 1
overview rewrite + 1 audit (this).

---

## Test metrics (fresh runs, post-merge)

| Layer | Sprint-to-A | Now | Δ |
|---|---|---|---|
| `@sophie/components` unit | 159 | **161** | +2 |
| `@sophie/astro` unit | 6 | **48** | **+42** |
| `@sophie/core` unit | 15 | 15 | — |
| `@sophie/theme` unit | 0 (build-emitted; no logic) | 0 | — |
| **Total unit + integration** | **180** | **224** | **+44** |
| `examples/smoke` e2e | 26 (8 files) | **44 (10 files)** | **+18 / +2 files** |
| Storybook test-runner | 45 axe-clean | 45 axe-clean | — |
| ADRs | 29 | **35** | +6 (0030–0034 + PR 2 design doc cited from 0035-pending) |
| Components in `@sophie/components` | 12 | 12 | — |
| Storybook stories | 12 | 12 | — |

`@sophie/astro` test coverage went from "barely-tested factory edge"
to **93.05% statements / 88.46% branches / 84.61% functions /
93.75% lines** via the new `define.ts` (22 cases) + `theme.ts`
(18 cases) + `components.tsx` (8 carryover) test files.

The boot-script-via-`new Function(script)()` testing pattern is a
new technique for Sophie: the factory emits a JS source string for
`<script is:inline>` in `<TextbookHead>`, and the unit test
evaluates that string in JSDOM to verify pre-paint behavior under
stored=null/valid/invalid plus localStorage-throws (Safari private
mode). Catches escape bugs in the generated source that would
otherwise only surface in production.

New e2e cases (10 in `theme-toggle.spec.ts`):
1. Toggle renders with default aria-label.
2. Empty localStorage + prefers-color-scheme:dark → data-theme=dark.
3. Empty localStorage + prefers-color-scheme:light → data-theme=light.
4. Full cycle (system → light → dark → system) with aria-label sync.
5. Reload preserves stored value.
6. Cross-tab via storage event (two BrowserContext pages).
7. matchMedia change while stored=system flips live.
8. matchMedia change while stored=light is ignored.
9. Shell background actually changes (luminance-asserted; the PR #31 regression net).
10. axe-core zero violations on the toggle.

8 new e2e cases in `textbook-layout.spec.ts` (PR 1) — top bar,
empty-slot collapse, sidebar toggle, mobile/desktop default-state,
axe-clean chrome.

---

## Quality grades

| Category | Sprint-to-A | Now | Δ | Evidence |
|---|---|---|---|---|
| Test coverage | 18 | **19** | +1 | +44 unit, +18 e2e, 93% stmts coverage on `@sophie/astro`. New boot-script-eval testing pattern. New cross-tab + matchMedia mocking patterns. Persisting: no genuine dual-tab BroadcastChannel test still (N-1), no large-array stress, no IDB-failure error-state tests. |
| Design system | 18 | **18** | — | NEW: book-theme layout shell + 7 layout primitives + theme toggle. Theme tokens now correctly wired post-#31 (full-shell dark mode visually works). Offsetting: just-discovered ADR 0005 naming-convention drift (the `--color-<kind>-*` convention sketched there was never adopted by `@sophie/theme`; deferred to the ADR currency sweep) means the design system still has unfinished documentation. `sa-` token namespace (P2-8) and `prefers-contrast` (P3-5) still outstanding. |
| Domain correctness | 18 | **18** | — | No domain work in this sprint. Capped by single-chapter scope as previously documented. Lifts when a second chapter exists. |
| Accessibility | 19 | **19** | — | NEW: `<ThemeToggle>` ships axe-clean with dynamic aria-label tracking stored state. `<SidebarToggle>` ships axe-clean with aria-controls + aria-expanded sync. PR 1 + PR 2 chrome both pass axe. Persisting: prefers-contrast (P3-5), arrow-key nav on radio groups (P3-4), jest-axe custom matcher (P3-3). |
| Architecture | 18 | **19** | +1 | NEW: `definePreference` factory — a generic chrome-state primitive that Bucket B PRs 5, 7, 8 will inherit (view-modes, search, glossary). Strong reuse. NEW compound-component pattern (ADR 0031), vanilla-JS chrome state (ADR 0032), `is:inline`-outside-React (ADR 0033), empty-slot-collapse (ADR 0034) — 4 ADRs ratifying shipped, well-justified patterns. PR 1 SidebarToggle migrated to the factory without dual-shape bridge (per Anna's no-back-compat-pre-launch). Persisting: `audit()` stubs (9 of 12), ProfileProvider context unreachable (P2-6), naming inconsistency (P2-7). |
| **Total** | **91/100** | **93/100** | **+2** | **A → A** (still A; band is 90–94) |

Grade band cutoffs: 90–94 = A; 95–100 = A+. **93/100** is mid-A.
A+ ceiling at current scope remains **~94** — domain correctness
capped at 18 and design system capped at 18 until the naming
convention drift is resolved.

---

## What's working (regression-prevention checklist)

Spot-verified by grep:

| Fix | Verification |
|---|---|
| `:focus-visible` on every interactive control | Present in 9 `.module.css` files in `@sophie/components` (Callout, CollapsibleCard, ComprehensionGate, ConfidenceCheck, EffortLog, InteractiveCheckbox, LearningObjectives, Predict, Reflection); also present in `textbook-layout.css` for `.sophie-sidebar-toggle` and `.sophie-theme-toggle`. |
| Zero hex/rgb in CSS Modules | `grep` returns 0 across all component CSS files; `textbook-layout.css` retains only one literal fallback (`#fbfaf7` on `--sophie-bg`) post-#31 rename. |
| HydrationAnnouncer wired | 27 component files reference `useInteractive` or `HydrationAnnouncer`. |
| `audit()` invariants | 3 contracts have non-trivial `audit()` (LO, Predict, MG); 9 keep `() => []`. |
| Schema rejection coverage | 12 component dirs have `safeParse` test coverage. |
| **NEW** — `definePreference` invariants enforced by tests | `data-sophie-pref-<key>` marker on bound buttons (idempotency); window-level guard for `storage` listener; window-level guard for `matchMedia` listener (`__sophieThemeMqlBound`); IIFE-wrapped `bootScript()` never throws. |
| **NEW** — `is:inline` boot scripts live outside React islands | `<TextbookHead>` is a separate Astro component placed by consumers in `<head>`, never inside `<SophieChapter client:load>`. ADR 0033. |
| **NEW** — Compound-component pattern | Both assembled `<TextbookLayout>` and primitives `<TopBar>`, `<Sidebar>`, `<ContentColumn>`, `<RightColumn>`, `<SidebarToggle>`, `<ThemeToggle>` are exported via `package.json` `exports`. ADR 0031. |
| **NEW** — Empty-slot-collapse | `Astro.slots.has('sidebar')` and `Astro.slots.has('right')` in `<TextbookLayout>` set CSS variables that collapse unused columns to 0 width. ADR 0034. |

---

## Capability inventory — what Sophie can do, end of Bucket B PR 2

A snapshot of what a chapter author or AI scaffolder can rely on
TODAY (not what's planned), grouped by layer.

### Pedagogy layer — `@sophie/components` (12 components, all axe-clean, all schema-validated)

| Component | What it does | Persistence |
|---|---|---|
| `<Callout>` | Tufte-style info/tip/warning/danger surface with variant tokens | none |
| `<CollapsibleCard>` | Click-to-expand card with Radix Collapsible underneath; Escape-to-close; axe-clean | IndexedDB via `useInteractive` |
| `<ComprehensionGate>` | Radio-group "did you understand?" gate (Yes/No/Maybe) | IndexedDB |
| `<ConfidenceCheck>` | 1–5 confidence rating with radio group | IndexedDB |
| `<EffortLog>` | "How much effort did this take?" radio group | IndexedDB |
| `<Figure>` | Image with caption + alt text + figure registry name resolution | none |
| `<InteractiveCheckbox>` | Persistent checkbox cell (used inside LearningObjectives + LMS-style affordances) | IndexedDB |
| `<KeyEquation>` | Equation card with derivation/intuition tabs + cross-ref-friendly anchor | none |
| `<LearningObjectives>` | Checklist of objectives with `audit()` duplicate-id invariant | IndexedDB per objective |
| `<MiniGlossary>` | dt/dd term list with per-term hash anchors + slug-collision audit | none |
| `<Predict>` | Multi-prompt prediction widget with duplicate-prompt-id audit | IndexedDB per prompt |
| `<Reflection>` | Long-form textarea for student reflection | IndexedDB |

All ship: Zod schema, axe-clean Storybook stories, focus-visible
rings, schema-rejection tests, useInteractive + HydrationAnnouncer
on persistent ones, BroadcastChannel LWW (ADR 0029), CSS Modules
with token-pure styles.

### Chrome layer — `@sophie/astro` (NEW in PRs 1+2; 7 primitives + 2 prefs + 1 factory)

| Primitive | What it does |
|---|---|
| `<TextbookLayout>` | Assembled book-theme shell (CSS Grid, top bar + sidebar + content + right column). One-line default. |
| `<TextbookHead>` | Emits per-preference `is:inline` boot scripts; lives in `<head>` outside any React island (ADR 0033). |
| `<TopBar>` | Sticky top row; default content = `<SidebarToggle>` (leading) + `<ThemeToggle>` (trailing). |
| `<Sidebar>` | Left column; empty in Bucket B PR 1+2, populated by PR 3 (module/chapter nav). |
| `<ContentColumn>` | Center column with `min(75ch, 100%)` reading-width cap; overflow-wrap guard. |
| `<RightColumn>` | Right column; empty in Bucket B PR 1+2, populated by PR 4 (ToC) + PR 6 (margin asides). |
| `<SidebarToggle>` | Hamburger button driving `data-sidebar` on `<html>` via `sidebarPref`. |
| `<ThemeToggle>` | Cycle button (system → light → dark) driving `data-theme` on `<html>` via `themePref`; 3 SVG icons; `matchMedia` live-sync while stored=system. |

| Library | What it does |
|---|---|
| `definePreference({key, attribute, default, values, parse, serialize, resolve?, resolveExpression?})` | Generic factory returning `{read, write, subscribe, bindToggle, bootScript}`. Cross-tab via `storage` event. Idempotent toggle binding. Boot-script-as-IIFE-string for `is:inline` pre-paint state. |
| `sidebarPref` | `definePreference` instance for `data-sidebar` ∈ {open, closed}. |
| `themePref` | `definePreference` instance for `data-theme` ∈ {light, dark}, stored ∈ {system, light, dark} with `matchMedia` resolve. |
| `installSystemThemeListener()` | Idempotent wiring for OS-level prefers-color-scheme change events (theme-specific extension on top of the generic factory). |

### Theme layer — `@sophie/theme`

- 57 CSS custom properties under `:root` (light defaults).
- 13 dark-aware properties overridden under `[data-theme="dark"]`
  and `@media (prefers-color-scheme: dark) :root:not([data-theme])`.
- Token kinds: color, brand, status, typography, spacing,
  radius, layout, focus.
- Color tokens use `color-mix(in oklch, ...)` derivations for
  consistent contrast across modes.
- Tailwind preset (`tailwind.css`) generated from the same TS
  tokens (ADR 0005).

### Runtime layer — `@sophie/core`

- IndexedDB via `idb-keyval` with `ResponseStore` repository (ADR 0007).
- BroadcastChannel LWW with per-write `Date.now()` timestamps
  (ADR 0029).
- `useInteractive` hook — single API for component persistence
  + cross-tab sync (ADR 0004).
- `HydrationAnnouncer` — per-component live-region for WCAG 4.1.3
  hydration announcements (added in Phase 1 hardening).
- Zod schema validation throughout.

### Renderer + integration — `@sophie/astro` (existing)

- Astro 6 + MDX 5 + React 19 (ADR 0002).
- `<SophieChapter client:load>` boundary (ADR 0027).
- `makeStaticComponents({figures})` factory for figure-registry-aware
  components in MDX scope.
- Smoke target at `examples/smoke` renders a real ASTR 201 first
  reading using these components.

### What's NOT yet possible (the gap to v1)

- **Multi-chapter routing** — smoke has one chapter (spoiler-alerts);
  no module/chapter tree navigation.
- **In-page ToC** — right column placeholder only.
- **Margin asides** — `<Aside>` Tufte-style notes (Bucket B PR 6).
- **Search** — no Pagefind integration (Bucket B PR 7).
- **Glossary popovers** — `<GlossaryTerm>` hover previews (PR 8).
- **Cross-reference previews** — `<ChapterRef>` / `<EqRef>` / `<FigureRef>` (PR 9).
- **View modes** — Default/Focused/Wide cycle button (PR 5).
- **Print stylesheet polish** — `@media print` (PR 10).
- **Concept maps / mind maps** — React Flow runtime per overview §X (Phase 2+).
- **CLI scaffolder** — `sophie create textbook` (Phase 7).
- **AI authoring surface** — schema-driven assistant per ADR 0030 (Phase 3).
- **LMS export / Quarto bridge / slides export** — Phase 4+.

---

## P1 / P2 / P3 backlog

### P1 — immediate, blocks consistency

(None this audit. Bucket B PR 2 closed cleanly; the token-mismatch
P1 from the PR #30 visual smoke was fixed in PR #31 before this
audit ran.)

### P2 — important; defer to Bucket B PR 3+ or fold into feature work

- **P2-NEW-1 — ADR 0035 (token naming convention)**: Codify the
  flat kind-less naming (`--sophie-bg`, `--sophie-text`,
  `--sophie-border`, `--sophie-surface-1/2/3`) that
  `@sophie/theme` actually emits, superseding ADR 0005's
  Triggers-section sketch of `--color-<kind>-*`. Lands as part
  of the broader ADR currency sweep. ~150–300 words; direct push
  to main per docs bypass.
- **P2-NEW-2 — ADR 0036 (definePreference factory pattern)**:
  Capture the resolve + resolveExpression pattern (runtime
  function paired with boot-time JS-expression-string) so PR 5's
  view-mode preference and PR 7's search preferences inherit it.
  Direct push.
- **P2-NEW-3 — ADR currency sweep for 0001–0029 against shipped
  reality**: Per handoff, continuous parallel work. The ADR 0005
  drift discovered this sprint is one example; others almost
  certainly exist. Each ADR gets a "still accurate?" check + a
  short note if it needs updating.
- **P2-NEW-4 — Bucket B PR 3 (sidebar module/chapter nav)**: Next
  planned PR. Will exercise Astro content collections for the
  first time in Sophie. Adds nav contents to the empty `<Sidebar>`
  slot.
- **P2-5** (carried): `useInteractive.status` UI exposure. Hook
  returns it; no component renders it. Defer until needed.
- **P2-6** (carried): `ProfileProvider` context unreachable from
  MDX islands. Blocks Phase 5 instructor toggle.
- **P2-7** (carried): Naming inconsistency (`title` vs `heading`
  vs `prompt`). Wait for clearer pattern.
- **P2-8** (carried): `sa-` token namespace shared across 4
  self-assessment components. Migrate to per-component prefixes.
- **N-1** (carried): Genuine dual-tab Playwright test for
  BroadcastChannel LWW. The new `theme-toggle` cross-tab test
  (using two pages in one BrowserContext + storage event) is a
  partial template for this.

### P3 — polish

- **P3-1** (carried): `:target` pulse on `CollapsibleCard` + `Figure`.
- **P3-3** (carried): Register `jest-axe`'s `toHaveNoViolations`.
- **P3-4** (carried): Arrow-key nav on radio groups.
- **P3-5** (carried): `prefers-contrast: more` support.
- **P3-6** (carried): Second chapter in smoke for per-chapter
  isolation + cross-chapter navigation testing. Lifts domain
  correctness cap.
- **N-2** (carried): Per-component focus-state Storybook stories.
- **P3-NEW-1 — Chrome toggle Storybook stories**: `<SidebarToggle>`
  and `<ThemeToggle>` don't yet have Storybook stories (they live
  in `@sophie/astro`, not `@sophie/components`; Storybook is
  React-only). Decide whether to surface as Astro Storybook
  setup or skip until visual regression generally lands.

### Out of scope (intentional caps)

- **A+ (95+) ceiling** — needs multi-chapter content + a second
  consumer (instructor-side or alternative course) to lift
  domain correctness AND finish the design-system naming
  convention work. Ceiling at current scope is ~94.
- **Storybook visual regression** — deferred per ADR 0028 until
  Linux-native baselines.

---

## Trajectory across four audits

| Audit | Date | Grade | Trigger |
|---|---|---|---|
| [Phase 1 hardening audit](2026-05-10-phase-1-hardening-audit.md) | 2026-05-10 | B− (73) | Trio 3 closed; pre-sprint baseline |
| [Post-hardening audit](2026-05-10-post-hardening-audit.md) | 2026-05-10 | B+ (84) | P1 sprint closed (PRs #17–#23) |
| [Sprint-to-A audit](2026-05-10-sprint-to-a-audit.md) | 2026-05-10 | A (91) | P2 sprint closed (PRs #24–#27) |
| **Bucket B PR 2 audit** (this) | **2026-05-12** | **A (93)** | **Bucket B PRs 1+2 closed (PRs #28–#31)** |

Net: **+20 points across three sprints**, 15 PRs, zero CI
failures on first push.

---

## What this enables

**Bucket B PRs 3–10 inherit a strong chrome foundation.** Each
remaining PR has a clear pattern to follow:

- **PR 3 (sidebar nav)**: slot Astro content-collection-derived nav
  into the empty `<Sidebar>` slot. Sidebar visibility already
  handled by `sidebarPref`.
- **PR 4 (in-page ToC)**: slot a ToC component into the empty
  `<RightColumn>` slot; auto-generated from MDX headings.
- **PR 5 (view modes)**: another `definePreference` call (stored
  ∈ {default, focused, wide}, attribute `data-view-mode`); cycle
  button in top bar.
- **PR 6 (margin asides)**: `<Aside>` component; right column
  shares space with ToC.
- **PR 7 (search UI)**: Pagefind + a Cmd-K modal. The ONE primitive
  that legitimately needs React (focus trapping, complex modal),
  per ADR 0032.
- **PR 8 (glossary popovers)**: hover previews on
  `<GlossaryTerm>`; reuse Radix Popover.
- **PR 9 (cross-reference previews)**: `<ChapterRef>` / `<EqRef>`
  / `<FigureRef>` with hover previews.
- **PR 10 (print polish)**: `@media print` rules; no JS.

The `definePreference` factory + the compound-component pattern
mean Bucket B PRs 3–10 each touch 1–2 new files and pattern-match
the existing two PRs. That's the architectural win this audit
captures.

**Next milestones to watch**:
- End of Bucket B (PR 10 merged) — entire book-theme shell done;
  audit refreshes likely jumps to A+ territory if the ADR
  currency sweep and second-chapter work land in parallel.
- Phase 3 kickoff — AI-authoring surface per ADR 0030. Schema +
  audit + template work all becomes more valuable when an AI
  agent is actually consuming it.

---

## References

- [Sprint-to-A audit](2026-05-10-sprint-to-a-audit.md) — prior
  state (A, 91).
- ADRs 0030–0034 — Bucket B PR 1 + audience model + chrome
  patterns.
- PRs #28 (`ec929fd`), #29 (`a7efa72`), #30 (`3209542`), #31
  (`944dc54`).
- Design docs:
  [PR 1 design](../plans/2026-05-12-layout-shell-foundation-design.md),
  [PR 2 design](../plans/2026-05-12-theme-toggle-design.md).
