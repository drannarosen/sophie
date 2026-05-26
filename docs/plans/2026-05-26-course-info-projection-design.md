# Course-info projection — design

- **Date**: 2026-05-26
- **Status**: validated, ready for implementation
- **Authors**: Anna Rosen + Claude
- **Related**: ADR 0080 (course-spec v0.1), ADR 0067 (section-level artifacts), ADR 0068 (bridge rooms), ADR 0082 (ChapterLayout extraction), ADR 0058 (eight-role contract); roadmap memory `course-website-roadmap` (Anna-approved 2026-05-21, plan at `~/.claude/plans/we-need-to-continue-lazy-ripple.md`)
- **Brainstorm**: this session, 2026-05-26 (post WS-A/B/C/E triage merge)

## Context

ASTR 201 ships with one injected route (`/units/[unit]/reading`) and one
hand-rolled landing (`src/pages/index.astro`). The course has no syllabus
page, no schedule page, no instructor page, no policies page — none of
the shells a student or accreditor expects at a course URL. The roadmap
locks the strategy (Tier 2: course-website chrome at course root); this
sprint chooses the first entry-point inside it.

The failure mode this design forecloses: **syllabus drift.** Every
university course platform I know lets the web syllabus say one thing,
the PDF handout another, the Canvas import a third, and the office-hours
page lag two weeks behind. Sophie already prevents this for chapter
content via the pedagogy-index extraction pattern (single source →
many views). Course-info should follow the same shape from the start.

## Locked decisions

1. **Projection pattern** (not monolithic, split, or bridge-section). Course info is a *projection* from `course.sophie.yaml` + named MDX prose fragments. Sophie ships layouts that compose data + fragments into pages. One source, many views.
2. **Pragmatic schema** (not aggressive or minimal). Structure the universally-structural fields (grading, objectives, prereqs, contact, office hours, schedule); prose fragments for ambiguous-structure content (policies wording, accommodations specifics, instructor bio, late-work prose). Graduate prose to structured fields when a second course validates the schema shape.
3. **Spec-driven root URLs** (not bridge-nested). `course.sophie.yaml` declares `info_pages: { syllabus, schedule, instructor, policies, accommodations }`; `@sophie/astro` injects each at `/<slug>/`. Bridge-section pattern reserved for cross-cutting rooms (Library, Math-fundamentals).
4. **Pluggable landings.** Ship 2-3 canonical layouts (`hero-with-modules`, `simple-list`, `prose-with-toc`); consumer picks via spec; integration accepts a fully-custom override component for unusual shapes.
5. **iCal in scope; PDF deferred.** iCal is small + high-value; PDF needs CI integration that pays off only once layouts stabilize.

## Architecture — three layers

**Layer 1: `course.sophie.yaml` v0.2.** Extends v0.1's identity block with structural clusters (`objectives`, `prereqs`, `grading`, `office_hours`, `contact`, `accessibility`, `schedule_ref`, `info_pages`, `landing`). Validated by an extended `CourseSpecSchema` in `@sophie/core` (Zod source of truth per ADR 0003).

**Layer 2: Prose fragments.** New Astro content collection at
`src/content/course-info/`. Each fragment is small MDX:
`policies.mdx`, `instructor-bio.mdx`, `accommodations.mdx`, `late-work.mdx`,
`course-thesis.mdx`. Referenced from the spec by string ref
(`"prose/instructor-bio"`). Validated by `CourseInfoFragmentSchema`
shipped from `@sophie/astro`.

**Layer 3: Composition layouts.** `@sophie/components` exports
`<SyllabusPage>`, `<SchedulePage>`, `<InstructorPage>`,
`<PoliciesPage>`, `<AccommodationsPage>`, `<CourseLanding*>`,
`<SectionLanding>`. Each reads from the spec + relevant fragments and
composes a page. Layouts are pure projections — no page-specific
authoring in the consumer's `src/pages/`.

**Route injection.** `defineSophieIntegration` reads `course.sophie.yaml`
at `astro:config:setup` and calls `injectRoute` per declared page.
Same precedent as the existing `/units/[unit]/reading` injection
(ADR 0082). Consumer can shadow any injected route via
`src/pages/<slug>.astro` and Sophie warns + steps aside (mirrors
ADR 0082 §A2.6).

## Schema design — `course.sophie.yaml` v0.2

Additive to v0.1's `identity:` block. New clusters:

```yaml
objectives:                  # course-level LOs
  - { id, verb, body, assessed_by?: [unit_ids] }
prereqs:
  - { kind: "course"|"skill"|"topic", ref, required: bool, note? }
grading:
  categories:
    - { id, name, weight, count?, drop_lowest?, late_policy_ref? }
  letter_scale:
    - { grade, min }
  curve_policy_ref?: "prose/grading-curve"
office_hours:
  - { day, start_time, end_time, location, modality: "in-person"|"online"|"hybrid", by_appointment: bool, note? }
contact:
  email
  phone?
  response_window_hours
  async_channel?: { kind: "slack"|"discord"|"canvas-msg", ref }
accessibility:
  drc_link
  contact_email
  request_deadline_weeks
  prose_ref?: "prose/accommodations"
schedule_ref: "./schedule.yaml"   # iCal-source-of-truth; separate file per roadmap

info_pages:                  # drives route injection + layout composition
  syllabus:
    layout: SyllabusPage
    compose: [objectives, prereqs, grading, office_hours, accessibility, schedule_overview, "prose/policies", "prose/course-thesis"]
  schedule:    { layout: SchedulePage }
  instructor:  { layout: InstructorPage, prose: "prose/instructor-bio" }
  policies:    { layout: PoliciesPage, prose: "prose/policies" }
  accommodations: { layout: AccommodationsPage, prose: "prose/accommodations" }

landing:                     # pluggable landing layout
  layout: "hero-with-modules"   # or "simple-list" | "prose-with-toc" | custom override via integration
  hero?: { title?, tagline?, image_ref?, cta? }
  show_announcements?: bool
```

**`info_pages.compose:` is explicit on purpose.** Each layout's input list mixes structural-data keys with prose-fragment refs in author-controlled order. Verbose, but AI-authorable end-to-end: the spec literally describes what's on the page. The alternative (each layout knows its own inputs) hides composition in component source, which an LLM can't navigate without source access.

**Slug-collision validation.** Each `info_pages` key validated against a reserved set (`units`, `sections`, `library`, `_astro`, `_server`, `_image`, `pagefind`, plus the bridge slugs the course declares). Build-time error on collision. Defends the class at the schema layer.

## Prose-fragment convention

**Location.** `src/content/course-info/<slug>.mdx`. New Astro content collection; schema shipped by `@sophie/astro` so consumers don't redeclare.

**Reference syntax.** `"prose/<slug>"` resolves to `src/content/course-info/<slug>.mdx`. The `prose/` prefix is reserved by Sophie to mean "named prose fragment" and distinguish from registry entries. Future `data/` prefix reserved for structured YAML in `src/content/course-data/` (out of v0.2 scope).

**Frontmatter (minimal but typed).**

```yaml
---
title: "Instructor — Anna Rosen"
description?: "Background, research, teaching philosophy."
last_revised?: "2026-05-26"
ai_contribution?: { visibility, models?, review_depth? }   # ADR 0042 mirror
---
```

Filename slug *is* the id; no `id:` field. Validated at build time.

**Components allowed inside fragments.** Subset of the chapter component set: `<Callout>`, `<GlossaryTerm>`, `<KeyEquation>`, `<EquationRef>`, `<FigureRef>`, `<Aside>`. **Excluded:** `<OMIFlow>`, `<WorkedExample>`, `<MultiRep>`, `<Intervention>` — these are pedagogy primitives whose meaning depends on chapter context (ADR 0058). A new `makeChromeComponents({ figures })` factory ships alongside the existing `makeStaticComponents`.

**Not indexed.** Prose fragments do NOT enter `PedagogyIndex` (they're chrome, not pedagogy — ADR 0058 boundary). Cross-refs (`<GlossaryTerm name="cosmic-ray">`) still resolve against the chapter glossary so hover/link behavior matches chapters; no derived entries land in the index.

## Route injection + shells

```ts
// integration.ts, after the existing reading-route injection:
injectRoute({ pattern: "/", entrypoint: "@sophie/astro/routes/course-landing.astro" });
injectRoute({ pattern: "/sections/[section]/", entrypoint: "@sophie/astro/routes/section-landing.astro" });
for (const [slug, decl] of Object.entries(courseSpec.info_pages ?? {})) {
  injectRoute({ pattern: `/${slug}/`, entrypoint: "@sophie/astro/routes/info-page.astro" });
}
injectRoute({ pattern: "/schedule.ics", entrypoint: "@sophie/astro/routes/schedule-ics.ts" });
```

Routes for ASTR 201 post-sprint:

| URL | Shell | Source |
|---|---|---|
| `/` | `<CourseLanding*>` (pluggable) | spec identity + landing config + sections |
| `/sections/[section]/` | `<SectionLanding>` | section JSON + its units + optional `intro.mdx` |
| `/units/[unit]/reading/` | `<ChapterLayout>` | existing (ADR 0082) |
| `/syllabus/` | `<SyllabusPage>` | spec + fragments via `info_pages.syllabus.compose` |
| `/schedule/` | `<SchedulePage>` | `schedule.yaml` + per-unit due dates |
| `/instructor/` | `<InstructorPage>` | spec.contact + office_hours + `prose/instructor-bio` |
| `/policies/` | `<PoliciesPage>` | `prose/policies` + grading.late_policy_ref |
| `/accommodations/` | `<AccommodationsPage>` | spec.accessibility + `prose/accommodations` |
| `/schedule.ics` | iCal emitter | `schedule.yaml` + per-unit due dates + office_hours recurrence |

**Pluggable landings.** Sophie ships three canonical built-ins (`hero-with-modules`, `simple-list`, `prose-with-toc`); consumer picks via `course.sophie.yaml`. For courses needing a fully custom shape:

```ts
defineSophieIntegration({
  figures,
  landings: { course: MyCustomCourseLanding, section: MyCustomSectionLanding },
});
```

Override takes precedence over the spec's `layout` field; absent both, defaults to `simple-list`. All built-ins (and the override path) read the same spec + collections — only presentation differs.

**Conflict handling.** At config-setup, walk `<consumer>/src/pages/` for shadows of injected slugs; emit `logger.warn` per shadow + skip injection for that slug. Mirrors ADR 0082 §A2.6.

## Course-management chrome components (the C pack)

Five components, ship together so chapter chrome composes coherently:

```mdx
<Due />                                              {/* schema lookup by chapter context */}
<Due date="2026-09-15" of="reading" />               {/* explicit override (rare) */}
<Points value={20} category="problem-set" />
<Reading source="Carroll & Ostlie §6.3" pages="247-260" />
<OfficeHours />                                      {/* renders next upcoming slot(s) */}
<Week n={4} />                                       {/* week label from schedule.yaml */}
```

**Hybrid props-or-schema.** Each component defaults to schema lookup (chapter context + `course.sophie.yaml` + `schedule.yaml`); props override for edge cases. Schema-default is the universal path; explicit form is the escape hatch.

**Implementation.** Ship in `@sophie/components` (framework-pure React per ADR 0001). Each component reads spec data via a new `useCourseSpec()` hook backed by a `virtual:sophie/course-spec` virtual module — mirrors the `virtual:sophie/figures` pattern from ADR 0082.

**Eight-role contract (ADR 0058).** These are *chrome*, not pedagogy — no epistemic role declared. The chapter-components reference doc gets a new "Course-management chrome" section, separate from the eight-role pedagogy primitives.

**`<Reading>` is prose-string-typed for v1.** YAGNI: structured `{ textbook_id, chapter, pages: { start, end } }` has no second caller until the textbook-reading-list page exists. Graduate later when a real consumer appears (same SoTA call as the WS B+D `InlineRefKind` extension).

## Non-web projections

**iCal export (in this sprint).** `/schedule.ics` route reads `schedule.yaml` + per-unit due fields and emits standards-compliant iCal. One `VEVENT` per unit, one per assignment, one office-hours recurrence rule (RRULE). Students subscribe once; their calendar updates on each course rebuild. **Hand-rolled emitter** (~50 LOC) — avoids the new-dep HITL gate.

**PDF (deferred).** `/syllabus.pdf` would render `<SyllabusPage>` with a `print: true` flag toggling existing `@media print` CSS, then a CI step runs `playwright pdf` against the rendered HTML. Defer until layouts stabilize — no point optimizing print CSS for layouts that haven't seen real content.

## Testing

Three layers, mirroring existing Sophie patterns:

| Layer | What | Where |
|---|---|---|
| Schema unit tests | `CourseSpecSchema` v0.2 valid + invalid; slug-collision; `info_pages.compose` validation; prose-fragment ref resolution | `packages/core/src/schema/course-spec.test.ts` |
| Layout axe tests | each layout rendered with realistic data → axe-core clean per ADR 0004 + R11; R10 (landmark choice) for each shell | `packages/components/src/components/<Layout>.axe.test.ts` |
| Integration + E2E | `defineSophieIntegration` injects the right routes given a course spec; new `examples/smoke/e2e/info-pages.spec.ts` covers all info-page routes at desktop + 375 px; `packed-smoke` adds astr201's real routes | smoke + packed-smoke |

iCal output validated by a focused unit test (parse emitted text with `node-ical` dev-only, assert event count + dates).

**Mobile-axe coverage** per WS A's `mobile-chapter-a11y.spec.ts` precedent: each new route gets a 375-px assertion. Reuse the existing `expectChapterA11y` + new `expectInfoPageA11y` helper.

## Sprint sequencing

~6 working days end-to-end:

| Phase | What | Days |
|---|---|---|
| 1 | `CourseSpecSchema` v0.2 + `CourseInfoFragmentSchema` + slug-collision + `virtual:sophie/course-spec` | 1.0 |
| 2 | Route injection + 3 pluggable landings + section landing | 1.5 |
| 3 | Info-page layouts + `compose:` evaluator | 1.5 |
| 4 | C chrome components + `useCourseSpec()` hook | 1.0 |
| 5 | iCal route + emitter | 0.5 |
| 6 | astr201 integration: prose fragments + spec fill-out + verification | 0.5 |
| 7 | ADRs + docs: ADR 0080 v0.2 amendment + new ADR (projection pattern + chrome-vs-pedagogy boundary) + chapter-components.md updates | 0.5 |

**Parallel-session compatibility.** Phases 1–5 are platform-only; the
other session migrating chapters to astr201/ stays unblocked. Phase 6
touches astr201 — coordinate at that point (overlap is unlikely since
new files don't collide with chapter content).

## Critical files to touch

- `packages/core/src/schema/course-spec.ts` (extend `CourseSpecSchema`)
- `packages/core/src/schema/course-spec.test.ts` (new tests)
- `packages/core/src/schema/index.ts` (re-exports)
- `packages/astro/src/integration.ts` (new route injections + virtual-module wire-up + slug-collision check)
- `packages/astro/src/lib/course-spec-virtual-module.ts` (new — mirrors `figures-virtual-module.ts`)
- `packages/astro/src/lib/course-spec-loader.ts` (new — reads `course.sophie.yaml` at config-setup)
- `packages/astro/src/routes/course-landing.astro` (new dispatcher → built-in or override)
- `packages/astro/src/routes/section-landing.astro` (new)
- `packages/astro/src/routes/info-page.astro` (new — dispatches to the spec's `info_pages[slug].layout`)
- `packages/astro/src/routes/schedule-ics.ts` (new)
- `packages/astro/src/lib/ical-emitter.ts` (new — hand-rolled)
- `packages/components/src/components/SyllabusPage/` (new)
- `packages/components/src/components/SchedulePage/` (new)
- `packages/components/src/components/InstructorPage/` (new)
- `packages/components/src/components/PoliciesPage/` (new)
- `packages/components/src/components/AccommodationsPage/` (new)
- `packages/components/src/components/CourseLanding/` (new — 3 layouts)
- `packages/components/src/components/SectionLanding/` (new)
- `packages/components/src/components/chrome/Due.tsx` etc. (new — 5 chrome components)
- `packages/components/src/hooks/useCourseSpec.ts` (new)
- `examples/smoke/course.sophie.yaml` (extend with v0.2 fields for testing)
- `examples/smoke/src/content/course-info/*.mdx` (new fixtures)
- `examples/smoke/e2e/info-pages.spec.ts` (new)
- `docs/website/decisions/0080-course-spec-format-v0-1.md` → amend to v0.2 OR new ADR 0086
- `docs/website/decisions/0086-course-info-projection-pattern.md` (new — locks the projection pattern + chrome-vs-pedagogy boundary)
- `docs/website/reference/chapter-components.md` (new "Course-management chrome" section)

## Out of scope (deferred)

| Item | Why deferred | Next trigger |
|---|---|---|
| PDF syllabus generation | CI integration cost; print CSS premature before layouts stabilize | After layouts ship + first real syllabus authored |
| Content-addressable cross-course policy registry | Premature; only one Sophie-shaped course exists today | When COMP 521 or ASTR 101 land in Sophie |
| Tier-3 Instructor room (Console + Prep tabs) | Tier-3 per roadmap; depends on assessment cluster | After Assessment cluster ships (ADR 0073 path) |
| Assessment cluster | Separate sprint; ADR 0073 unimplemented | Next major sprint after this one |
| `<Canvas>` chrome component | Institution-specific; no real consumer yet | When LTI integration starts (Tier-3 per roadmap) |
| Slides authoring (`@sophie/slides`) | Separate sprint; orthogonal to course-info | Decoupled — own sprint |

## ADRs to write

- **ADR 0080 v0.2 amendment** (or new ADR if changes are substantial): extended `CourseSpecSchema` with the v0.2 clusters; `info_pages` declaration shape; slug-collision invariant.
- **ADR 0086 (new)**: projection pattern for course-level chrome — locks "course info is data + prose fragments projected by layouts" + the chrome-vs-pedagogy component boundary (which components allowed in `course-info/` MDX). Cites this design doc as evidence.

## Verification — sprint definition of done

- All 8 routes injected by `@sophie/astro` render in astr201 dev + build modes.
- axe-core clean (0 violations, WCAG 2.1 AA) at desktop + 375 px on all 8 routes.
- iCal output validates against RFC 5545 (unit test).
- `pnpm exec biome check` 0/0 warnings.
- `pnpm vitest run` clean across `@sophie/core` + `@sophie/components` + `@sophie/astro`.
- `npx mystmd build --html` in `docs/website/` 0 ⚠ content warnings.
- ADR 0080 v0.2 amendment (or ADR 0086) + ADR 0086 (projection pattern) both shipped.
- `docs/website/status/validation.md` regenerated per the AGENTS.md rule.
- ASTR 201's `course.sophie.yaml` filled out with real grading scheme, objectives, prereqs, office hours, accessibility info, and 4-5 prose fragments authored.
- Manual: Anna confirms the syllabus page reads cleanly + matches what she'd hand a student on day 1.
