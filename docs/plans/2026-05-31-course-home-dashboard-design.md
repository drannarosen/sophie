# Design — Course-Home Dashboard (Deep Field shell)

**Date:** 2026-05-31
**Status:** Validated in brainstorming session (HITL); ADR 0097 proposed.
**Author:** Claude Code (frontend-design + brainstorming session with Anna)
**Repos touched:** `sophie` (platform: dashboard layout + theme slot + nav +
vendored starfield) · `astr201` (consumer: `landing.layout: dashboard`,
later `schedule` + `announcements`).
**Prototype:** [`docs/reviews/assets/2026-05-31-course-home-deep-field/`](../reviews/assets/2026-05-31-course-home-deep-field/index.html)
(throwaway standalone HTML — the aesthetic + interaction reference this design
formalizes).

---

## 1. Problem & context

Sophie's **chapter reading experience** (`TextbookLayout`) is mature and A+
hardened. But the **course-level front door** is the least-built, most
load-bearing surface for the actual goal — *building consumer course websites,
not just a textbook*. Today info pages use a minimal `InfoPageShell` that does
not match the reading shell, and there is no orienting course home.

Anna's decision (this session): the front door is a **course home /
dashboard** that orients a student — *where the course is, what's active, what's
due, what this course is, how it works*.

**Hard constraint — LDS, not LMS.** Sophie is a build-time static site with no
server, no auth, no per-student state (2026-05-30 security audit). The dashboard
is therefore **calendar-aware, student-agnostic**: it orients by *where the
course is in time* (evaluated at build wall-clock, like the ADR 0096 reveal
cron), never *where the student is*. No grades, no progress tracking, no
submissions. This is a Learning **Design** System surface — "the course as a
designed experience" — not a Learning Management System gradebook.

## 2. Decisions locked this session (HITL)

1. **Front door = dashboard** (vs syllabus-forward or textbook-cover).
2. **Aesthetic = "Deep Field"** — dramatic, dark-first, luminous; planetarium
   feel. Chosen over "Observatory Almanac" (refined editorial) and "Lab
   Notebook" (brutalist). Reading pages stay light regardless.
3. **Starfield = photometric Canvas 2D** (power-law magnitudes, spectral colors,
   multi-harmonic twinkle, sprite halos, subtle Milky Way + nebulae, diffraction
   spikes, shooting stars), **adapted from Anna's `cosmic-playground`**
   (`packages/runtime/src/starfield.ts`). Tuned **ambient-plus**: richer through
   the hero, masked to ~45% over the working area (CSS vertical mask falloff).
4. **Vendored, not shared** — a self-contained copy lives in Sophie. The two
   projects stay independent (ADR 0001); no cross-repo package dependency.
5. **Scope = course home + section landings only.** Never reading/practice
   pages (legibility; the reading surface is intentionally light).
6. **Background = pluggable theme slot, starfield is the default.** Build the
   *seam* now (a `HomeBackground` resolved by a theme id; registry of one);
   defer additional themes + color-palette expansion to a future ADR extending
   ADR 0005. Motivation: cross-discipline versatility — a chemistry/CS prof
   should be able to pick a different background later without a refactor.
7. **Descriptive, not just a dashboard.** The home carries course-describing
   bands borrowed from Anna's prior Quarto site (`astr201-sp26`), elevated:
   a **"Why this course is different"** band and a **"How each lecture works"**
   band (the real Observable→Model→Inference→Assumption flow + Track A/B). These
   *project existing course-spec data* (`pedagogy.required_moves`, `named_tools`,
   `multi_track_readings`) — chrome projection, not new pedagogy components.
8. **Top-right dropdown nav** (MyST/Quarto-style "all pages" menu), grouped
   Course / The Course / Reference & Help. Top-right because it is a utility
   dropdown (brand anchors left, navigation/actions anchor right — matches
   Quarto, MyST, and Sophie's own `TextbookLayout` topbar). The "Math & Physics
   Review · Optional" entry is the placeholder for the future
   prerequisites/fundamentals section.
9. **Eyebrow line leads with the instructor** ("Anna Rosen · San Diego State
   University · Spring 2027").

## 3. Capabilities & ADR split

The shell needs three new platform concerns. Per the **shell-first** sequence
(ADR 0023 vertical-slice), only the layout lands first:

| # | Capability | ADR | Lands in |
|---|---|---|---|
| A | **Course-home dashboard layout** (shell, theme slot, nav, starfield, descriptive bands) | **0097** (this) | PR 1 |
| B | **ScheduleSchema** (3rd `T \| null` virtual module → "This Week" + week-ranges) | 0098 (proposed w/ PR 2) | PR 2 |
| C | **Announcements** (banner; registry vs spec-cluster fork) | 0099 (proposed w/ PR 3) | PR 3 |

**Graceful degradation is the contract that makes shell-first work:** in PR 1,
the cards that need B/C simply don't render (fail-closed). "Due Soon" *does*
render — it reads the **existing** homework registry (ADR 0096). So PR 1 ships a
substantive home (hero · Due Soon · modules · why/how bands · nav · starfield),
and "This Week" + the announcement banner light up when B/C land.

## 4. Build sequence (shell-first, ADR 0023)

- **PR 1 (this arc):** theme-slot seam + vendored starfield; `CourseHomeShell` +
  `dashboard` layout assembly; global dropdown nav; descriptive-band projection;
  Due-Soon from the homework registry; `landing.layout: "dashboard"` dispatcher
  + schema enum; astr201 adopts; ADR 0097 + validation regen + reference docs.
- **PR 2:** ScheduleSchema (ADR 0098) → "This Week" + module week-ranges + a
  schedule surface.
- **PR 3:** Announcements (ADR 0099) → the banner.

## 5. Success criteria (W4)

- `/` renders the Deep Field dashboard for astr201 with **real course-spec data**
  (title, instructor, modules, counts, why/how projections).
- Starfield: animates with reduced-motion fallback (static frame) + no-JS
  fallback (CSS mesh) + pauses on hidden tab; **axe-core clean**; scoped to home +
  section landings only.
- Theme slot resolves `starfield` by default; a second (stub) theme id would
  resolve without touching the shell — proven by a unit test on the resolver.
- Dropdown nav: keyboard-operable (Escape + click-outside close, `aria-expanded`),
  axe-clean.
- "Due Soon" reflects the homework registry; "This Week"/banner render nothing
  when their modules are null (no crash, no empty chrome).
- `pnpm biome check` zero warnings; `pnpm typecheck` clean; MyST 0 ⚠; coverage
  ratchet held; astr201 builds warning-clean against the new Sophie SHA.
- Landmarks per R10; nullable virtual-module consumers narrow per R12; no raw
  `dangerouslySetInnerHTML` (R14); new components declare epistemic role or are
  allowlisted as chrome (R13).
