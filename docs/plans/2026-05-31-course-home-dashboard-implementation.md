# Course-Home Dashboard — PR-1 Implementation Plan (shell-first)

> **For Claude:** REQUIRED SUB-SKILL: subagent-driven-development. Fresh subagent
> per task; code-review after each; TDD; frequent commits. Each subagent READS
> the actual code first (exact paths below are starting points, verified during
> the task). Design source: ADR 0097 + the design doc (same date).

**Goal:** Ship the Deep Field course-home dashboard for astr201 — hero, modules,
descriptive bands, dropdown nav, and the vendored starfield (default theme) —
with Due-Soon live from the homework registry and schedule/announcement cards
degrading to nothing until ADRs 0098/0099 land.

**Architecture:** New `dashboard` course-spec landing layout (alias of
`hero-with-modules`) → `CourseHomeShell` assembled from chrome components, with a
pluggable `HomeBackground` theme slot (one entry: vendored `starfield`).
Calendar-aware, student-agnostic (LDS). Reading pages untouched.

## Status (PR 1)

| Task | Status | Commit |
|---|---|---|
| 1 — `dashboard` landing-layout enum | done | `4128d9a` |
| 2 — vendored starfield + `HomeBackground` seam | done | `7e46555` |
| 3 — `CourseHomeShell` + dashboard assembly | done | `4ca9461` |
| 4 — global dropdown nav (`CourseMenu`) | done | `9bfffdc` |
| 5 — descriptive bands (course-spec projection) | done | `0288f9d` |
| 6 — Due-Soon + graceful degradation | done | `377a54f` |
| 7 — dispatcher wiring + section-landing background | done | `0efeee0` |
| 8 — astr201 consumer adoption | **post-merge** | separate astr201 PR (after this PR squash-merges) |
| 9 — docs + full verification | done | this commit |

Task 8 is the consumer step in the **astr201** repo (`landing.layout:
"dashboard"`, sophie SHA re-pin, `pnpm install --frozen-lockfile`, smoke green) —
coordinated after this platform PR merges, same discipline as the gravity pilot.
All Sophie-side gates verified in Task 9 (biome 0/0 · typecheck clean · unit
green with coverage floors bumped on `@sophie/core` + `@sophie/astro` · R11/R12/
R13/R14 clean · MyST 0 ⚠ · smoke build renders `sophie-home` + `id="starfield"` ·
smoke e2e 191 passed / 2 pre-existing skips).

**Tech stack:** `@sophie/core` (Zod schema) · `@sophie/astro` (routes, shell,
chrome `.astro`) · `@sophie/components` (if a React island is needed) · vanilla
canvas JS for the starfield · astr201 consumer.

**Standing rules in scope:** R10 (landmarks) · R12 (nullable virtual-module
narrowing) · R13 (epistemic-role: starfield/nav/bands are chrome → allowlist) ·
R14 (no raw `dangerouslySetInnerHTML`) · biome zero-warnings · coverage ratchet ·
docs-no-drift · validation regen on ADR add.

---

## Task 1 — `dashboard` landing layout in the course-spec schema

**Files:** `@sophie/core` course-spec landing schema (verify:
`packages/core/src/schema/**` — the `landing.layout` enum from ADR 0080) + its
test + sibling type.

- Add `"dashboard"` to the `landing.layout` enum; document `"hero-with-modules"`
  as an alias (both resolve to the dashboard downstream).
- TDD: failing test that a spec with `landing.layout: "dashboard"` parses; that
  `hero-with-modules` still parses. Update any course-spec snapshot fixtures.
- Verify `pnpm turbo run test --filter=@sophie/core` green; biome clean.

## Task 2 — Vendored starfield + `HomeBackground` theme seam

**Files (new):** `packages/astro/src/components/backgrounds/Starfield.astro`
(+ inline vendored JS, header-credited to cosmic-playground) ·
`packages/astro/src/components/backgrounds/HomeBackground.astro` (resolver:
theme id → background; default `starfield`) · tests.

- Vendor the photometric field (power-law magnitudes, spectral colors,
  multi-harmonic twinkle, sprite halos, subtle Milky Way + nebulae, diffraction
  spikes, shooting stars; two-layer compositing). Port faithfully from the
  prototype `index.html` script.
- **Required behaviors (test each):** CSS nebula-mesh ground renders with **no
  JS** (fallback); `prefers-reduced-motion` → one static frame, no rAF loop;
  `visibilitychange` hidden → loop paused; ambient-plus density + vertical mask
  falloff.
- `HomeBackground` resolver unit test: unknown/absent id → `starfield`; a stub
  second id resolves without editing the shell (proves the seam).
- **R13:** add `Starfield` + `HomeBackground` to the `CHROME` allowlist in
  `scripts/lint-epistemic-role.ts` with a one-line rationale. **R14:** no raw
  inner HTML.
- axe-clean render test (`aria-hidden` canvas, no a11y violations).

## Task 3 — `CourseHomeShell` + dashboard assembly

**Files (new):** `packages/astro/src/components/CourseHomeShell.astro` +
sub-pieces (`CourseHero.astro`, `OrientationCards.astro`, `ModuleList.astro`,
`HomeQuickLinks.astro`). Reuse `SophieHead` (ADR 0095).

- Assemble hero (eyebrow instructor-first · Fraunces title · tagline · meta) +
  orientation-cards row + module list (real sections/units, orbit motif) +
  quick-links, over `HomeBackground`.
- **R10 landmark:** the home content is a named region; the nav is its own
  landmark; no nested `<main>` collision.
- Props are course-spec projections (title, instructor, term, sections, units).
- axe-clean; renders with the astr201 fixture; biome clean.

## Task 4 — Global dropdown nav

**Files (new):** `packages/astro/src/components/CourseMenu.astro` (top-right
dropdown) + a11y test.

- Grouped Course / The Course / Reference & Help; links from course-spec
  `info_pages` + sections + units. Include the "Math & Physics Review · Optional"
  placeholder entry (future prereqs section).
- Accessible: `aria-haspopup`, `aria-expanded`, `aria-controls`; Escape +
  click-outside close; focus returns to trigger on close. Vanilla JS (ADR 0032
  chrome-state pattern). **R13** chrome allowlist.
- axe-clean open and closed.

## Task 5 — Descriptive bands (course-spec projection)

**Files (new):** `WhyBand.astro` + `HowBand.astro` (or one
`CourseDescription.astro`); wire through the chrome-component path
(`makeChromeComponents`, per the chrome-vs-pedagogy split).

- "Why" pillars + "How each lecture works" flow project from
  `identity.description`, `pedagogy.required_moves` (Observable→Model→Inference→
  Assumption), `named_tools`, `multi_track_readings`. Degrade cleanly if a field
  is absent.
- Confirm these render as **chrome** (excluded from the pedagogy-index /
  Library), not pedagogy primitives. axe-clean.

## Task 6 — Due-Soon (homework registry) + graceful degradation

**Files:** `OrientationCards.astro` (from Task 3) + a Due-Soon resolver reading
`virtual:sophie/homework` (ADR 0096).

- "Due Soon" lists upcoming homeworks (assigned + dated) from the registry,
  build-wall-clock aware. **R12:** narrow the nullable module at the dispatcher.
- "This Week" + the announcement banner consume not-yet-existing modules →
  **render nothing when null** (fail-closed). Test: null schedule/announcements →
  no card, no crash; populated homework → Due-Soon list.
- "Start Reading" points to the first/next non-draft unit (static; always works).

## Task 7 — Dispatcher wiring + section-landing background

**Files:** `packages/astro/src/routes/course-landing.astro` (+ `section-landing
.astro`) — the `landing.layout` dispatcher (verify exact path).

- Route `landing.layout: "dashboard"` (and the `hero-with-modules` alias) →
  `CourseHomeShell`. Section landings get `HomeBackground` (scope rule); reading
  routes do **not**.
- **R12** narrowing on any nullable virtual-module imports at frontmatter entry.
- Smoke: the smoke example builds a dashboard home; `examples/smoke` e2e passes.

## Task 8 — astr201 consumer adoption

**Files (astr201 repo, separate PR):** `course.sophie.yaml`
(`landing.layout: "dashboard"`), `deploy.yml` sophie pin bump + lockfile.

- Set `landing.layout: "dashboard"`; confirm the home renders with real data.
- Re-pin sophie to the merged SHA; `pnpm install --frozen-lockfile`; build
  warning-clean; Playwright smoke green.
- (Coordinated after the Sophie PR merges — same discipline as the gravity pilot.)

## Task 9 — Docs + gates

**Files:** ADR 0097 (written) · `docs/website/status/validation.md` (regen via
`pnpm tsx scripts/regenerate-validation-index.mts`) · `docs/website/reference/
chapter-components.md` or a course-website reference (dashboard layout + theme
slot) · `myst.yml` TOC entry for ADR 0097 · `docs/reviews/assets/2026-05-31-
course-home-deep-field/` prototype committed as the design reference.

- **Verify gates:** `pnpm biome check` zero warnings (grep output) · `pnpm
  typecheck` · `npx mystmd build --html` then `grep -c "⚠"` = 0 · coverage
  ratchet held/bumped · `pnpm lint:axe-render` + `pnpm lint:epistemic-role` +
  `pnpm lint:no-raw-inner-html` green.

---

## Final review

After all tasks: full-suite green, smoke build renders the dashboard, axe clean
on home + section landing, reduced-motion + no-JS fallbacks verified, then
finishing-a-development-branch → PR. ScheduleSchema (ADR 0098) and Announcements
(ADR 0099) follow as PR 2 / PR 3.
