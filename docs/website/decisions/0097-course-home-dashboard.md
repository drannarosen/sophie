---
date: 2026-05-31T00:00:00.000Z
tags:
  - astro
  - components
  - theming
  - course-website
  - schema
status: accepted-design
validation:
  status: in-progress
  last_validated_date: "2026-05-31"
  evidence:
    - kind: review
      ref: docs/plans/2026-05-31-course-home-dashboard-design.md
      date: "2026-05-31"
      notes: "Brainstorming + frontend-design session design doc. Front door = calendar-aware (not student-aware) course-home dashboard; Deep Field aesthetic; vendored photometric starfield as the default pluggable theme; descriptive bands projecting course-spec data; top-right dropdown nav. Approved in-thread 2026-05-31 (HITL gate)."
    - kind: review
      ref: docs/plans/2026-05-31-course-home-dashboard-implementation.md
      date: "2026-05-31"
      notes: "Shell-first PR-1 plan: theme-slot seam + vendored starfield, CourseHomeShell + dashboard layout, global dropdown nav, descriptive-band projection, Due-Soon from the existing homework registry. ScheduleSchema (ADR 0098) and Announcements (ADR 0099) are fast-follow PRs. Not yet implemented — this ADR is accepted-design."
  notes: |
    Approved design, not yet shipped. The dashboard is the realized form
    of the course-spec `hero-with-modules` landing layout (astr201's spec
    anticipates the auto-upgrade); `dashboard` is its canonical name,
    `hero-with-modules` a documented alias. Cards needing schedule
    (ADR 0098) / announcements (ADR 0099) degrade to render-nothing until
    those land. Extends ADR 0080 (course-spec landing) and composes with
    ADR 0005 (theming); the home-background theme registry is the seam a
    future palette/multi-theme ADR extends.
---

# ADR 0097: Course-home dashboard layout

:::{admonition} ADR metadata
- **Status**: accepted-design
- **Deciders**: anna
:::

## Context

Sophie's chapter reading shell (`TextbookLayout`, ADR 0031) is mature, but the
**course-level front door** is the least-built surface — and the most
load-bearing for Sophie's goal of producing consumer *course websites*, not just
a textbook. Info pages currently use a minimal `InfoPageShell` that does not
match the reading shell, and there is no orienting course home.

Anna's decision: the front door is a **course home / dashboard** that orients a
student. Critically, Sophie is a build-time static site with **no server, no
auth, no per-student state** (ADR 0001; 2026-05-30 security audit). The
dashboard must therefore be **calendar-aware and student-agnostic** — it orients
by where the *course* is in time (build wall-clock, as in the ADR 0096 reveal
cron), never where the *student* is. This is the LDS (Learning **Design**
System) framing, explicitly **not** an LMS gradebook.

The design was validated against a working prototype in a frontend-design
session ([`docs/reviews/assets/2026-05-31-course-home-deep-field/`](../../reviews/assets/2026-05-31-course-home-deep-field/index.html)).

## Decision

### 1. `dashboard` layout realizes `hero-with-modules`

Add `landing.layout: "dashboard"` to the course-spec landing enum (ADR 0080) as
the **canonical** name for the orienting course home. The existing
`hero-with-modules` value is kept as a **documented alias** that resolves to the
same layout — honoring astr201's spec comment that `hero-with-modules`
*"auto-upgrades with no spec change"* once Sophie ships the real layout. One
layout, two spelt names; new courses use `dashboard`.

### 2. `CourseHomeShell` owns the home

A new shell (distinct from `InfoPageShell`) assembles: hero · orientation cards ·
descriptive bands · module list · global dropdown nav · theme background. Its
landmark is a named region per **R10** (`<section aria-labelledby>` /
appropriate landmarks — never a nested `<main>` collision).

### 3. Descriptive bands are course-spec *projections* (chrome, not pedagogy)

The "Why this course is different" and "How each lecture works" bands render
from existing course-spec fields (`identity.description`, `pedagogy.
required_moves` — the Observable→Model→Inference→Assumption flow — `named_tools`,
`multi_track_readings`). These are **chrome projections** of course-info, built
via the `makeChromeComponents` path, not new pedagogy primitives. No new schema;
the chrome-vs-pedagogy boundary (ADR 0058) is respected.

### 4. Home background is a pluggable theme slot; **starfield is the default**

The background is resolved through a `HomeBackground` seam keyed by a theme id,
with a registry containing exactly one entry now: **`starfield`** (the Deep Field
aesthetic), used as the default when no theme is set. This is the SoTA shape
(no hardwired background) with W2-minimal code (one implementation, no
speculative themes). **Deferred:** additional themes and color-palette expansion
— a future ADR extending ADR 0005's token system. Motivation: cross-discipline
versatility (LDS horizontal positioning) — a non-astronomy STEM instructor can
later select a different background/palette without a shell refactor.

### 5. Starfield is vendored chrome

The photometric Canvas 2D starfield is **vendored** (a self-contained copy
adapted from Anna's `cosmic-playground` `packages/runtime/src/starfield.ts`) —
**not** a shared cross-repo package. The two projects stay independent (ADR
0001). Properties: scope = **course home + section landings only** (never
reading/practice); **CSS nebula-mesh no-JS fallback**; **`prefers-reduced-motion`
→ single static frame**; **pauses on hidden tab**. It is chrome (role-less by
ADR 0058) — allowlisted in `lint-epistemic-role.ts` (**R13**), no raw
`dangerouslySetInnerHTML` (**R14**).

### 6. Global dropdown nav, top-right

A "Menu" dropdown in the **top-right** lists all pages (grouped Course / The
Course / Reference & Help). Top-right because it is a *utility dropdown*, not a
left-sidebar toggle: brand anchors top-left, navigation/actions anchor
top-right — matching Quarto, MyST, and Sophie's own `TextbookLayout` topbar
(left = breadcrumb/sidebar toggle, right = chrome/actions). Accessible:
`aria-expanded`, `aria-controls`, Escape + click-outside close.

### 7. Schedule/announcement cards degrade gracefully

"This Week" + module week-ranges consume `virtual:sophie/schedule` (ADR 0098,
`T | null`); the announcement banner consumes announcements (ADR 0099). Both are
**nullable virtual modules** narrowed at the dispatcher per **R12**, and **render
nothing when null** (fail-closed — no empty chrome, no crash). "Due Soon" reads
the **existing** homework registry (ADR 0096), so it is live from PR 1.

## Consequences

- The course home and section landings gain a distinctive, AA-clean
  (high-contrast on near-black) front door; reading pages are unaffected.
- A second theme is a registry addition, not a refactor — palette/multi-theme
  work is unblocked but unbuilt (deferred ADR).
- `dashboard`/`hero-with-modules` aliasing means astr201 upgrades with no spec
  change; the schema enum update + dispatcher are the only platform touch points.
- Shell-first means a visible home ships before schedule/announcement data,
  validating the orientation concept early (ADR 0023).

## Alternatives rejected

- **Hardwired starfield background** — blocks the cross-discipline goal; replaced
  by the theme slot (decision 4).
- **Shared `@sophie/starfield` package across repos** — couples two intentionally
  independent projects (ADR 0001); vendoring is correct for a single in-repo
  consumer (decision 5).
- **Two distinct layouts (`hero-with-modules` *and* `dashboard`)** — needless
  duplication; aliasing one onto the other is cleaner and honors the existing
  spec comment (decision 1).
- **Top-left menu** — signals a left-sidebar drawer the home doesn't have;
  conflicts with the brand-left/nav-right convention (decision 6).
- **LMS-style personalized dashboard** (progress, grades) — impossible without a
  backend and off-mission (LDS, not LMS).
