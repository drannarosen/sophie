---
title: Course-info schema reference
short_title: Course-info schema
description: >-
  course.sophie.yaml v0.2-shape clusters (objectives, prereqs, office_hours,
  contact, accessibility, info_pages, landing) + prose fragments at
  src/content/course-info/, and how the course-info projection renders them.
tags:
  - schema
  - course-info
  - reference
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
status: shipped
---

# Course-info schema reference

Reference for authoring Sophie course-info pages: `course.sophie.yaml`
v0.2-shape clusters + prose fragments at `src/content/course-info/`.
Shipped in PR #199 (course-info projection sprint, commit `4e0730e`,
2026-05-26).

**Related:** [chapter-components.md § Course-management chrome](./chapter-components.md#course-management-chrome-course-info-projection-2026-05-26)
for the 5 MDX-authorable chrome components;
[ADR 0080 Amendment 2](../decisions/0080-course-spec-format-v0-1.md#amendment-2-assessment-grade-weights-clean-break-course-info-projection-2026-05-26)
for the locked-decision audit trail.

## Three-layer architecture

| Layer | What | Where |
| --- | --- | --- |
| 1. Spec | structural data (identity, grading, objectives, prereqs, contact, office hours, accessibility, info_pages, landing) | `course.sophie.yaml` at the consumer-repo root |
| 2. Prose | authored prose for unstructured content (policies, instructor bio, accommodations specifics, late-work, course thesis) | `src/content/course-info/<slug>.mdx` |
| 3. Layouts | composition orchestrators that read both and render pages | `@sophie/astro/src/components/<Page>.astro` (shipped; authors don't touch) |

Each layout reads from layers 1 + 2 via the spec's `info_pages.compose:`
declaration. Single source of truth; updating the spec updates web +
iCal (future, per H6) + PDF (future) in lockstep.

## `course.sophie.yaml` v0.2-shape clusters

> **`spec_version`** stays at `"0.1"`; the schema id literal stays
> `"@sophie/schemas/course-spec@0.1"`. The "v0.2-shape" framing
> describes the **cluster set added by Amendment 2** to the v0.1
> spec, not a version bump. See [ADR 0080 § "Why `spec_version` stays
> at 0.1"](../decisions/0080-course-spec-format-v0-1.md#amendment-2-assessment-grade-weights-clean-break-course-info-projection-2026-05-26)
> for the rationale.

### Identity (v0.1, unchanged)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | Slug | yes | course id, lowercase-kebab |
| `title` | string | yes | display title |
| `code` | string | yes | e.g. `"ASTR 201"` |
| `term` | string | yes | e.g. `"Spring 2027"` |
| `institution` | string | yes | display name |
| `instructor` | string | yes | display name |
| `voice` | Slug | yes | reference into `voices/<id>.yaml` |
| `voice_register` | Slug | yes | registered tone for this course |
| `subtitle`, `description` | string | optional | short + long blurb |

### Grading (required at v0.2; replaces v0.1 `assessment.grade_weights`)

```yaml
grading:
  categories:
    - { id: "hw", name: "Homework", weight: 0.30, drop_lowest: 1, late_policy_ref: "prose/late-policy" }
    - { id: "exams", name: "Exams", weight: 0.40, count: 2 }
    - { id: "final-project", name: "Final Project", weight: 0.30 }
  letter_scale:
    - { grade: "A", min: 93 }
    - { grade: "A-", min: 90 }
    - { grade: "B+", min: 87 }
    # ...
  curve_policy_ref: "prose/grading-curve"   # optional
```

**Invariants** (all enforced at schema-parse time):

- `categories[*].weight` values sum to **1.0 ± 0.001** (Zod refine).
- `assessment.category_refs[]` (declared on the existing `assessment:`
  block, now required at v0.2) must reference declared
  `categories[*].id`.
- `objectives[*].assessed_by[]` (when populated) must reference
  declared `categories[*].id`.
- `late_policy_ref` and `curve_policy_ref` must match
  `/^prose\/[a-z][a-z0-9-]*$/` (the prose-fragment slug convention).

### Objectives

```yaml
objectives:
  - id: "lo-1"
    verb: "Apply"
    body: "Newton's three laws to extracted observables."
    assessed_by: ["exams", "hw"]   # category_refs; optional
  - id: "lo-2"
    verb: "Diagnose"
    body: "When the small-angle approximation breaks."
    assessed_by: ["exams"]
```

| Field | Type | Required |
| --- | --- | --- |
| `id` | Slug | yes |
| `verb` | string | yes (Bloom action verb is the convention) |
| `body` | string | yes |
| `assessed_by` | array of `grading.categories[*].id` refs | optional; cross-refined |

### Prereqs

```yaml
prereqs:
  - kind: "course"
    ref: "PHYS 197"
    required: true
  - kind: "skill"
    ref: "algebra-substitution"
    required: false
    note: "Comfort with symbolic substitution helps but isn't required."
```

`kind` is one of `"course"` | `"skill"` | `"topic"`.

### Office hours

```yaml
office_hours:
  - day: "Wednesday"
    start_time: "14:00"
    end_time: "15:30"
    location: "P-241"
    modality: "in-person"
    by_appointment: false
  - day: "Friday"
    start_time: "10:00"
    end_time: "11:00"
    location: "https://sdsu.zoom.us/j/..."
    modality: "online"
    by_appointment: true
    note: "Slot bookable via Calendly."
```

`modality` is one of `"in-person"` | `"online"` | `"hybrid"`. Times
must match `HH:MM` (24-hour).

### Contact

```yaml
contact:
  email: "alrosen@sdsu.edu"
  phone: "+1-619-594-XXXX"            # optional
  response_window_hours: 24
  async_channel:                       # optional
    kind: "slack"
    ref: "https://sdsu-astr201.slack.com"
```

`async_channel.kind` is one of `"slack"` | `"discord"` | `"canvas-msg"`.

### Accessibility

```yaml
accessibility:
  drc_link: "https://sdsu.edu/drc"
  contact_email: "drc@sdsu.edu"
  request_deadline_weeks: 2
  prose_ref: "prose/accommodations"   # optional
```

`drc_link` and `contact_email` are validated by Zod's `z.url()` /
`z.email()` builders.

### `info_pages` — drives route injection

```yaml
info_pages:
  syllabus:
    layout: "SyllabusPage"
    compose:
      - objectives
      - prereqs
      - grading
      - office_hours
      - accessibility
      - "prose/policies"
      - "prose/course-thesis"
  schedule:
    layout: "SchedulePage"             # v0.2 placeholder; iCal deferred per H6
  instructor:
    layout: "InstructorPage"
    prose: "prose/instructor-bio"
  policies:
    layout: "PoliciesPage"
    prose: "prose/policies"
  accommodations:
    layout: "AccommodationsPage"
    prose: "prose/accommodations"
```

`@sophie/astro` `injectRoute`s one `/<slug>/` per declared
`info_pages` entry at `astro:config:setup`.

**`compose:` is a strict union (per H4/B5):**

- Known data keys: `objectives` | `prereqs` | `grading` |
  `office_hours` | `accessibility` | `contact` | `schedule_overview`.
- Prose refs matching `/^prose\/[a-z][a-z0-9-]*$/`.

Typos like `"objetctives"` fail at schema-parse time, not at
compose-evaluator render time.

> **`schedule_overview` is a deferred-throw.** The schema accepts it
> (it's in `KNOWN_COMPOSE_DATA_KEYS`), but the compose evaluator
> throws a curated "not yet" error at render time. Forward-compatible
> with the iCal sprint per H6.

**Reserved `info_pages` slugs** (rejected at parse time): `units`,
`sections`, `library`, `_astro`, `_server`, `_image`, `pagefind`.
Defends slug collisions with Sophie-injected routes and Astro /
Pagefind internals.

**Available layouts (v0.2):** `SyllabusPage`, `SchedulePage`,
`InstructorPage`, `PoliciesPage`, `AccommodationsPage`. Layout
identifiers are case-sensitive strings; an unrecognized value
validates schema-clean but throws at the dispatcher (see the
**Layouts** overview below).

### `landing` — pluggable course landing

```yaml
landing:
  layout: "hero-with-modules"
  hero:
    title: "ASTR 201 — Astronomy for Science Majors"
    tagline: "Wonder-first. Physics-second."
    image_ref: "registry/figures/galaxy-hero"
    cta:
      label: "Start with §1"
      href: "/sections/foundations/"
  show_announcements: true
```

| Layout enum value | Meaning |
| --- | --- |
| `"simple-list"` | default; renders title + sections + units list |
| `"dashboard"` | **course-home dashboard** (ADR 0097): hero · orientation cards (Due Soon, Start Reading) · module list · descriptive "why/how" bands · dropdown nav, over a pluggable background. The realized form of the modules-grid landing. |
| `"hero-with-modules"` | **alias of `"dashboard"`** — resolves to the same dashboard layout downstream. New courses should write `"dashboard"`; existing `hero-with-modules` specs auto-upgrade with no change. |
| `"prose-with-toc"` | landing-as-narrative + table of contents |
| `"custom"` | **explicit** declaration that `defineSophieIntegration({ landings: { course, section } })` provides the override component; schema enum guards against typos in the override declaration |

Default is `"simple-list"` when `landing.layout` is omitted.

#### Home-background theme slot

The `dashboard` layout paints over a **pluggable background theme** (ADR 0097
#4). It ships with one theme, **`starfield`** (the dark-first "Deep Field"
photometric Canvas field), used as the default. The theme is resolved through a
single registry, so a future palette/multi-theme ADR (extending ADR 0005) can
add a second background and expose an author-facing selector without touching
the shell. **Multi-theme selection and the per-course palette field are deferred
to that ADR;** today every dashboard renders the `starfield` default. The
background is scoped to the course home and section landings only — reading and
practice pages stay light.

## Prose fragments at `src/content/course-info/`

Authored as small MDX files under the consumer repo's content
directory. Filename slug *is* the id; no `id:` frontmatter field.

### Location convention

```
src/content/course-info/
├── policies.mdx
├── instructor-bio.mdx
├── accommodations.mdx
├── late-work.mdx
└── course-thesis.mdx
```

Referenced from `course.sophie.yaml` (and from inside other prose
fragments) as `"prose/<slug>"`. The `prose/` prefix is reserved by
Sophie to mean "named prose fragment in `src/content/course-info/`."
Future `data/` prefix reserved for structured YAML at
`src/content/course-data/` (out of v0.2 scope).

### Frontmatter (validated by `CourseInfoFragmentSchema`)

```yaml
---
title: "Course policies"
description: "Late-work, attendance, academic integrity."   # optional
last_revised: "2026-05-26"                                   # optional, YYYY-MM-DD
ai_contribution:                                             # optional, mirrors ADR 0042
  visibility: "public"
  models: ["claude-opus-4-7"]
  review_depth: "manual"
---
```

`CourseInfoFragmentSchema` lives in `@sophie/core/schema` (all Zod
schemas co-locate in core; `@sophie/astro` takes no direct Zod dep).
See [ADR 0003 R-0080-A2](../decisions/0003-zod-as-source-of-truth.md#r-0080-a2-schema-placement-rule-clarification-2026-05-26)
for the placement-rule clarification.

### Allowed components

The `makeChromeComponents({ figures })` factory exposes this subset:

- Inline chrome from the chapter-component set: `<Callout>`,
  `<GlossaryTerm>`, `<KeyEquation>`, `<EquationRef>`, `<FigureRef>`,
  `<Aside>`.
- All five MDX-authorable course-management chrome components:
  `<Due>`, `<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`.

See
[chapter-components.md § Course-management chrome](./chapter-components.md#course-management-chrome-course-info-projection-2026-05-26)
for component-by-component reference (props, examples, edge cases).

### Excluded components (chrome ≠ pedagogy boundary)

The factory deliberately omits pedagogy primitives — their meaning
depends on chapter context:

- `<OMIFlow>` — observable / model / inference flow primitive
- `<WorkedExample>` — solved-example primitive
- `<MultiRep>` — multi-representation primitive
- `<Intervention>` — misconception-intervention primitive

Per [ADR 0058 R-0080-A2](../decisions/0058-epistemic-component-contract.md#r-0080-a2-chrome-vs-pedagogy-component-set-split-2026-05-26).
The boundary is structurally enforced: trying to render `<OMIFlow>`
inside a course-info prose fragment fails at MDX compile because the
component isn't bound in the factory.

### Cross-references inside prose fragments

`<GlossaryTerm name="cosmic-ray">` resolves against the chapter
glossary across the course — hover/link behavior matches chapter
prose. `<EquationRef name="hubble-law">` resolves against the
equation registry. `<FigureRef name="planck-blackbody">` resolves
against the figure registry. **Prose fragments do NOT enter
`PedagogyIndex`** — they are chrome, not pedagogy — but cross-refs
still resolve because the registries operate independently of the
index.

## Layouts (overview; not author-facing API)

| Layout | Source | Composes |
| --- | --- | --- |
| `SyllabusPage.astro` | `packages/astro/src/components/SyllabusPage.astro` | spec data + prose fragments via `info_pages.syllabus.compose:` |
| `SchedulePage.astro` | same dir | v0.2 placeholder; iCal + schedule.yaml deferred per H6 |
| `InstructorPage.astro` | same dir | `spec.contact` + `office_hours` + `prose/instructor-bio` |
| `PoliciesPage.astro` | same dir | `prose/policies` + `grading.late_policy_ref` |
| `AccommodationsPage.astro` | same dir | `spec.accessibility` + `prose/accommodations` |

Each `.astro` layout composes six React sub-components from
`@sophie/components`: `ObjectivesSection`, `GradingTable`,
`OfficeHoursTable`, `ContactCard`, `AccessibilitySection`,
`PrereqsList`. Authors don't touch these directly.

Landing layouts: 3 built-ins (`dashboard` — alias `hero-with-modules`,
`simple-list`, `prose-with-toc`) + the `"custom"` integration-override
path. The override component receives the spec, the section list, and the
unit list as props — same contract as the built-ins.

## Deferred (out of v0.2 scope)

| Item | Why deferred | Next trigger |
| --- | --- | --- |
| iCal export (`/schedule.ics`) | Needs own focused design pass + ADR per H6 | Follow-up sprint |
| `schedule.yaml` source-of-truth | Same as iCal | Follow-up sprint |
| `<Canvas>` chrome component | Institution-specific; no LTI consumer yet | When LTI integration starts (Tier-3) |
| PDF syllabus generation | Print CSS premature before layouts stabilize | After layouts ship + first real syllabus authored |
| Structured `<Reading>` shape | YAGNI (no second consumer) | When textbook-reading-list page exists |
| Content-addressable cross-course policy registry | Premature (only one Sophie-shaped course today) | When COMP 521 or ASTR 101 land in Sophie |

## Related ADRs

- [ADR 0080 Amendment 2](../decisions/0080-course-spec-format-v0-1.md#amendment-2-assessment-grade-weights-clean-break-course-info-projection-2026-05-26)
  — projection-pattern + clean-break decision trail
- [ADR 0082](../decisions/0082-chapter-layout-extraction.md) —
  route-injection + virtual-module precedent
- [ADR 0058](../decisions/0058-epistemic-component-contract.md) —
  chrome-vs-pedagogy boundary
- [ADR 0061](../decisions/0061-ai-optimized-codebase-design.md) —
  sibling-file LOC budget (validated by the 8 schema sibling files
  for v0.2 clusters)
- [ADR 0003](../decisions/0003-zod-as-source-of-truth.md) — Zod
  placement rule (single home in `@sophie/core/schema`)
- [ADR 0067](../decisions/0067-section-level-artifacts.md) — Section
  / Unit / Artifact hierarchy (course-info fragments are
  course-level singletons, NOT artifacts)
