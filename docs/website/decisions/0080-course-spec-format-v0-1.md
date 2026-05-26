---
date: 2026-05-25T00:00:00.000Z
tags:
  - course-spec
  - schema
  - authoring
  - consumer-repos
  - spec-driven
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-26"
  evidence:
    - kind: test
      ref: packages/core/src/schema/course-spec.test.ts
      date: "2026-05-25"
      notes: "CourseSpecSchema acceptance against ASTR 201 design-doc draft + 13 rejection cases covering: weights-not-100 refine, unknown pedagogy.pattern enum, missing sections, .strict() unknown-keys at top-level and nested, empty terminal_goals, non-Slug voice_register, mismatched spec_version/schema literals."
    - kind: test
      ref: packages/core/src/schema/voice-contract.test.ts
      date: "2026-05-25"
      notes: "VoiceContractSchema acceptance + 6 rejection cases (empty registers, missing base_voice, unknown top-level keys, non-slug register id, empty rules)."
    - kind: deployment
      ref: packages/cli/src/commands/validate.ts
      date: "2026-05-25"
      notes: "`sophie validate <path>` CLI command smoke-tested end-to-end against the valid + weights-not-100 fixtures (exit 0 / exit 1 + path-prefixed error)."
    - kind: test
      ref: packages/core/src/schema/course-spec.test.ts
      date: "2026-05-26"
      notes: "Amendment 1 — 8 new discovery-shape tests pinning the ADR 0067 alignment: ADR 0067 shape accepted; optional registries.topics (ADR 0079) accepted when present; optional registries.misconceptions (ADR 0060) accepted when present; unknown top-level discovery keys rejected (.strict); unknown registry keys rejected (.strict on inner); legacy v0.1 module-shaped discovery rejected (pre-amendment regression guard); missing required discovery key rejected; missing required registries key rejected."
    - kind: deployment
      ref: packages/core/src/schema/__fixtures__/course-spec-astr-201.yaml
      date: "2026-05-26"
      notes: "Valid fixture's `discovery:` block reshaped to ADR 0067 (`sections` / `units` / `artifacts` globs + `registries: { equations, figures }`); CLI smoke `sophie validate` against the updated fixture still exits 0."
    - kind: test
      ref: packages/core/src/schema/course-spec.test.ts
      date: "2026-05-26"
      notes: "Amendment 2 — v0.2-shape cluster + clean-break tests (PR #199): grade_weights .strict() rejection pin (lines 94-105); grading.categories weights-sum-to-1.0 refine; assessment.category_refs cross-refine into grading.categories[*].id; objectives[*].assessed_by cross-refine (added per code-review I3); info_pages.compose strict-union (known-data-keys | prose-fragment regex); info_pages reserved-slug refine (units/sections/library/_astro/_server/_image/pagefind); landing.layout custom enum value; ObjectiveSchema/PrereqSchema/OfficeHourSchema/ContactSchema/AccessibilitySchema acceptance."
    - kind: deployment
      ref: packages/core/src/schema/course-spec-v02-grading.ts
      date: "2026-05-26"
      notes: "Amendment 2 — 8 sibling-file schemas shipped per ADR 0061 LOC budget (20–91 LOC each): course-spec-v02-{grading,info-pages,landing,objectives,prereqs,office-hours,contact,accessibility}.ts. course-spec.ts grew 371→404 LOC, within 500-warn budget. AI-author navigation by filename worked end-to-end across 14 sprint commits."
    - kind: deployment
      ref: packages/astro/src/lib/course-spec-virtual-module.ts
      date: "2026-05-26"
      notes: "Amendment 2 — virtual:sophie/course-spec virtual module (mirrors virtual:sophie/figures pattern from ADR 0082). Always-register shape: factory accepts CourseSpec | null, returns plugin unconditionally; integration null-guards route injection separately. Dispatcher routes type-narrow at entry per AGENTS.md R12."
    - kind: deployment
      ref: packages/astro/src/components/SyllabusPage.astro
      date: "2026-05-26"
      notes: "Amendment 2 — H7 = Option B projection pattern: 5 .astro layout orchestrators (Syllabus/Schedule/Instructor/Policies/Accommodations) + 6 React sub-components (ObjectivesSection/GradingTable/OfficeHoursTable/ContactCard/AccessibilitySection/PrereqsList) shipped. SchedulePage placeholder per H6 (iCal + schedule.yaml deferred to follow-up sprint). 5 MDX-authorable chrome components (Due/Points/Reading/OfficeHours/Week) at @sophie/components/chrome/ ship the useCourseSpec() hook via SSR-setter + script-tag store pattern."
---

# ADR 0080: Course Spec format v0.1

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
- **Related**: [0001](./0001-platform-not-monorepo.md), [0003](./0003-schema-zod-vs-typebox.md), [0030](./0030-audience-and-ai-author-model.md), [0058](./0058-epistemic-component-contract.md), [0061](./0061-codebase-optimized-for-ai-coding.md), [0064](./0064-chapter-migration-playbook.md), [0067](./0067-section-level-artifacts.md) (Amendment 1), [0073](./0073-unified-assessment-schema.md) (Amendment 1), [0079](./0079-topic-registry-and-resolution-pattern.md) (Amendment 1)
:::

## Context

Sophie shipped the **content** layer (MDX components + pedagogy
index + audit invariants) and the **chrome** layer
([PR #168](https://github.com/drannarosen/sophie/pull/168) chrome
primitives), but had no **course-level spec** — no artifact declaring
what a course *is* (audience, terminal goals, pedagogy, principles,
quality bars) for AI authoring + audit + iteration to operate against.

The 2026-05-25 design doc
([`docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`](../../plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md))
locked nine Q1–Q9 decisions and produced a complete eight-section
draft Course Spec for ASTR 201. Two concrete consumers drive the need:

1. **ASTR 201 migration** ([ADR 0064](./0064-chapter-migration-playbook.md))
   — the Course Spec captures pedagogical intent that was implicit in
   the Quarto frontmatter.
2. **COMP 521 greenfield** (Fall 2026) — AI+HITL authoring of a course
   with no prior content. The same format must serve both loops.

The decision *now*: lock the v0.1 format so the schema becomes the
contract, ASTR 201 can author against it (Sprint 1 Day 3), and the
spec-driven workflow stages (specify / plan / tasks / implement / audit
/ iterate) have a stable target.

## Decision

Five locks govern Course Spec v0.1.

### 1. Eight-section format

The Course Spec is a single YAML file at the consumer-course repo
root: `course.sophie.yaml`. The `.sophie.yaml` extension marks the
file Sophie-recognizable. Eight non-nesting top-level sections:

| Section | Purpose |
| --- | --- |
| `identity` | course metadata + voice reference (`voice:` + `voice_register:`) |
| `audience` | level, prereqs, assumed-vs-scaffolded skills (audit `QB3` cites this), affective profile |
| `pedagogy` | registered pattern (`observable_model_inference` at v0.1), required moves, named tools, callouts, multi-track |
| `terminal_goals` | what students leave with — distilled from per-lecture objectives |
| `principles` | non-negotiables AI authoring + audit honor |
| `assessment` | philosophy + grade weights (must sum to 100) + workflow + exam policy (see Amendment 2 for the 2026-05-26 clean break: `grade_weights` removed; new top-level `grading.categories` weights sum to 1.0; `assessment.category_refs` audit-coverage pointer) |
| `quality_bars` | `required` (errors) + `recommended` (warnings) audit invariants |
| `discovery` | filesystem glob conventions Sophie uses to find Sections, Units, Artifacts, and registries (ADR 0067 hierarchy — see Amendment 1 for the v0.1 reshape applied 2026-05-26) |

Plus spec metadata at the top level: `spec_version: "0.1"` and
`schema: "@sophie/schemas/course-spec@0.1"`.

### 2. Voice contract as separate sibling artifact

The voice contract lives at `voices/<author-id>.yaml` in the
consumer-course repo, referenced by the Course Spec's `voice:` +
`voice_register:` fields. Voice belongs to the **instructor**, not the
course — one voice file is reused across an instructor's courses
(ASTR 201, ASTR 101, COMP 521 all share `voices/anna-rosen.yaml`).
Schema lives in
[`packages/core/src/schema/voice-contract.ts`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/voice-contract.ts).

Folded into this ADR rather than split into 0081: voice is a
sub-component of the spec-author surface; same authoring loop; same
audit downstream. The format gets its own ADR when a second instructor
authors a voice file and concrete extension pressure surfaces.

### 3. Zod is the source of truth (per ADR 0003); `@sophie/core/schema` is the implementation home

The Course Spec + Voice Contract schemas land as sibling files
alongside the ~30 existing Zod schemas in
[`packages/core/src/schema/`](https://github.com/drannarosen/sophie/tree/main/packages/core/src/schema)
and re-export from the existing `./schema` subpath barrel:

```ts
import { CourseSpecSchema, VoiceContractSchema, validateCourseSpec }
  from "@sophie/core/schema";
```

Sibling-of-30 placement matches [ADR 0061](./0061-codebase-optimized-for-ai-coding.md)
(focused files + filename routing). A `@sophie/schemas` package
extraction is **not** taken at v0.1 — premature per W2/YAGNI with only
one consumer (the CLI validator). The path stays decoupled from the
schema id string (§4) so a future extraction is non-breaking.

### 4. Logical schema id `@sophie/schemas/course-spec@0.1` (decoupled from JS path)

The YAML literal `schema: "@sophie/schemas/course-spec@0.1"` is a
**logical identifier** — the string consumer course YAML declares to
opt into the v0.1 contract. It does **not** bind to the JS package
path. The implementation currently lives at `@sophie/core/schema`
(§3); if/when a future `@sophie/schemas` package extraction lands, the
JS import path changes but consumer YAML does not.

Schema evolution is by `spec_version` bump (e.g. `0.2`, `1.0`) that
ships new schema files, **not** by in-place mutation of v0.1.

### 5. Strict-by-default: `.strict()` on every Zod object

Every object in the schema graph uses `.strict()`. Unknown keys fail
parse rather than being silently absorbed. The Course Spec is a
contract document; `pedaogy:` typo silent-absorption is the failure
mode the schema is designed to prevent. Future fields go through
explicit `spec_version` bumps (§4).

Plus one structural refine: `assessment.grade_weights` must sum to
exactly 100; deviation surfaces as `assessment.grade_weights:
grade_weights must sum to 100`.

**Amendment 2 (2026-05-26) supersedes this refine.** `assessment.grade_weights`
is removed; the new top-level `grading.categories[*].weight` invariant
is sum to 1.0 ±0.001 (Zod refine, not 100), smoke-tested via
[`__fixtures__/invalid/category-weights-not-one.yaml`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/__fixtures__/invalid/category-weights-not-one.yaml)
(file renamed in-place from `weights-not-100.yaml`). See Amendment 2.

## Rationale

**Why these five.** The design doc's Q1–Q9 brainstorm converged on
"keep presentation flexible, course repos extensible, and the
epistemic reasoning grammar stable" (design doc § Context). The
eight-section split + strict schema + decoupled schema id together
realize that frame: presentation is flexible (no chapter layout
constraints), course repos are extensible (the `discovery:` glob rules
let any layout work as long as Sophie can find the artifacts), and the
grammar is stable (`pedagogy.pattern` enum + `quality_bars` referencing
the eight-role contract per [ADR 0058](./0058-epistemic-component-contract.md)).

**Why now.** Anna teaches ASTR 201 Spring 2027 and COMP 521 Fall 2026.
ASTR 201 migration ([ADR 0064](./0064-chapter-migration-playbook.md))
is mid-flight on the chapter level. Without a course-level spec the
migration only ports content, not pedagogical intent. Locking v0.1 in
the same week the chrome primitives landed (PR #168) keeps the
spec-driven layer ahead of the next chapter pilot — the second pilot
will be the first one authored *against* a spec rather than free-hand.

**Why fold voice into this ADR.** Voice is a sub-component of the
spec-author surface (the Course Spec *references* it). One ADR is
enough until concrete divergence pressure surfaces. The voice file
gets its own future ADR when a second instructor authors one or the
voice contract grows pedagogy-specific structure.

**Why decoupled schema id.** A `@sophie/schemas` package extraction
might happen post-launch when COMP 521 or a future second-instructor
course demands shared schema-only deps. Pre-locking the YAML literal
to the current JS package path would force every consumer course's
YAML to update when the extraction happens. The decoupled string
buys forward compat at zero cost.

## Alternatives considered

- **One ADR per artifact (0080 Course Spec + 0081 Voice Contract).**
  Cleaner ADR scope-per-decision. Cost: two ADRs for one tightly-
  coupled artifact pair; the voice contract has no independent
  decision surface to justify a separate trail. Rejected: fold into
  0080 until divergence pressure justifies splitting.

- **YAML schema id matches JS import path (`@sophie/core/schema/course-spec@0.1`).**
  More truthful about where the code lives today. Cost: consumer YAML
  breaks when the schema extracts. Rejected: schema id is a logical
  identifier; coupling it to today's package shape is a footgun.

- **`@sophie/schemas` package at v0.1 (option 3 from the in-thread
  brainstorm).** Cleanest separation of schema-only deps. Cost: new
  package, new turbo wiring, new tsup config, new CI surface, new
  package-graph arrow from `@sophie/cli` — for two YAML schemas with
  one consumer. Rejected: premature per W2/YAGNI.

- **Permissive Zod (default, not `.strict()`).** Allows per-course
  extension fields without schema bumps. Cost: silent typo absorption
  (`pedaogy:`, `tonal_track_readings:`); the contract becomes
  advisory rather than enforced. Rejected: strict-by-default is the
  SoTA call for a contract document.

## Consequences

**Easier:**

- ASTR 201 (Sprint 1 Day 3) authors `course.sophie.yaml` +
  `voices/anna-rosen.yaml` against a locked schema; `sophie validate`
  is the gate.
- AI authoring (per [ADR 0030](./0030-audience-and-ai-author-model.md))
  has a concrete artifact to read for course-level intent —
  pedagogy.pattern, terminal goals, voice, quality bars.
- Audit invariants (`QB1`–`QB10` in the design doc draft) have a
  declarative home — no more "implicit in instructor's head."
- The spec-driven workflow stages (specify, plan, tasks, implement,
  audit, iterate per the design doc § "Sophie's spec-driven workflow")
  each have a stable input contract.

**Harder:**

- Adding fields after v0.1 means a `spec_version` bump + a new schema
  file, not an in-place edit. Authors get more friction.
- The `pedagogy.pattern` enum starts with one value
  (`observable_model_inference`). COMP 521 (Fall 2026) will need a
  `problem_algorithm_implementation_test` (or similar) — bump to
  `0.2` when that lands.
- Strict-by-default catches typos, but a per-course "experimental
  field" workflow no longer exists. Per-course extensions need to be
  proposed and folded into the spec, not bolted on by individual
  course repos.

**Triggers:**

- ASTR 201 Sprint 1 Day 3: author `astr201/course.sophie.yaml` +
  `astr201/voices/anna-rosen.yaml`; `pnpm validate` must exit 0.
- Future Module Spec / Lesson Spec formats (design doc § "Implementation
  sequencing" step 7) inherit the eight-section discipline pattern.
- COMP 521 introduction triggers `pedagogy.pattern` v0.2 expansion.
- `@sophie/schemas` package extraction trigger: when ≥3 packages
  consume the schemas standalone (today only `@sophie/cli` does).

## Amendments

### Amendment 1 — `discovery` reshape to ADR 0067 Section/Unit/Artifact (2026-05-26)

**Trigger.** Surfaced by ASTR 201's Sprint-1 Day 4 directory-hierarchy
brainstorm (course-local decision at
[`astr201/decisions/0001-directory-hierarchy.md`](https://github.com/astrobytes-edu/astr201/blob/main/decisions/0001-directory-hierarchy.md)).
The v0.1 `DiscoverySchema` (shipped 2026-05-25 in PR #169) was shaped
`modules: {pattern, children: {lectures, slides}}` plus required
`assignments` / `exams` / `course_info` / `handouts` / `schedule` globs.
That predated [ADR 0067](./0067-section-level-artifacts.md)'s
Section → Subsection → Unit → Artifact content model — `@sophie/astro`'s
`TextbookLayout` already path-derives `type / scope / unit_id /
section_id` from a Section/Unit/Artifact layout, demonstrated by
[`examples/smoke/src/content.config.ts`](https://github.com/drannarosen/sophie/blob/main/examples/smoke/src/content.config.ts).
The old schema was `.strict()`, so a consumer course's
`course.sophie.yaml` could not adopt the correct ADR 0067 shape
without `sophie validate` failing — the fix was platform-side.

**Reshape.** `DiscoverySchema` top-level becomes four required globs
plus a `registries` block:

```yaml
discovery:
  sections:  "src/content/sections/*.json"
  units:     "src/content/units/**/*.json"
  artifacts: "src/content/sections/**/*.mdx"
  registries:
    equations: "src/content/equations/**/*.mdx"      # required
    figures:   "src/content/figures.ts"              # required
    topics:    "src/content/topics/**/*.mdx"         # optional (ADR 0079)
    misconceptions: "src/content/misconceptions/**/*.mdx"  # optional (ADR 0060)
```

The recursive `artifacts:` glob catches **both** ADR 0067's section-level
artifacts (`sections/<sec>/<artifact>.mdx` — intro / synthesis /
practice-set / etc.) AND unit-level artifacts
(`sections/<sec>/units/<unit>/<artifact>.mdx` — reading / slides /
spec / rubric / etc.) in a single declaration.

`registries` carries two required keys (`equations` + `figures` — both
shipped registries today) and two optional keys (`topics` per
[ADR 0079](./0079-topic-registry-and-resolution-pattern.md);
`misconceptions` per [ADR 0060](./0060-registry-ecosystem.md), whose
schema is `accepted-design` not shipped). `.strict()` rejects any other
registry key, preserving the contract discipline (§5).

**Dropped fields.** `modules` / `assignments` / `exams` / `course_info` /
`handouts` / `schedule` are removed entirely. The assessment surfaces
(`assignments`, `exams`, `diagnostics`) require
[ADR 0073](./0073-unified-assessment-schema.md)'s unified `Assessment`
schema to ship first (currently `accepted-design`); the inline
amendment drops them rather than leaving forward-declared stubs that
can't be rendered. `modules` / `course_info` / `handouts` / `schedule`
were lecture-shape concepts orthogonal to the Section/Unit hierarchy.

**Why in-place mutation, not a `spec_version` bump.** §5 of this ADR
declared that schema evolution happens via `spec_version` bumps. That
discipline is the **post-launch** rule. Pre-launch with zero external
consumers (astr201 is the sole consumer and we control it), the
clean-break amendment is the right shape per
`feedback_no_backcompat_prelaunch`. `spec_version` and the schema id
literal both stay at `0.1`; the v0.1 contract is what's now in the
schema file, with this Amendment as the audit trail. Future
amendments to the v0.1 surface land here; cross-shape breaks (e.g.
when ADR 0073 ships and assessment surfaces re-enter) trigger a real
v0.2 bump.

**Why the amendment lives in 0080 rather than a new 0081.** Sophie's
ADR template (§"ADR lifecycle") notes that pre-implementation work is
freely editable in place. Course Spec v0.1 shipped less than 24 hours
before this amendment — it had one consumer (astr201, which hadn't
yet authored its `course.sophie.yaml`) and zero downstream tooling
beyond `sophie validate` itself. A separate 0081 would have created
two ADRs to grep for one decision surface; the audit trail lives in
git history + this Amendment block.

**Consequences.**

- ASTR 201 (Sprint-1 Day 4 follow-up) updates its
  `course.sophie.yaml` `discovery:` to the new shape; no
  `spec_version` bump in the consumer YAML.
- The original v0.1 doctrine (module-shaped discovery) is now
  **rejected** by the schema. Test
  [`course-spec.test.ts`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/course-spec.test.ts)
  pins this: "rejects the legacy v0.1 module-shaped discovery
  (pre-amendment)" — `.strict()` catches the dropped `modules` key.
- ADR 0073's eventual `Assessment` schema lands as a separate ADR;
  when it ships, a new amendment to this ADR (or a new course-spec
  ADR) re-adds the relevant discovery globs.
- `@sophie/astro`'s `TextbookLayout` path-derivation now has a
  declarative source-of-truth at the Course-Spec level matching its
  implementation.

### Amendment 2 — `assessment.grade_weights` clean break + course-info projection (2026-05-26)

**Trigger.** Course-info projection sprint
([PR #199](https://github.com/drannarosen/sophie/pull/199), commit
`4e0730e`). ASTR 201 (Sprint 2) needed Tier-2 course-website chrome
shipping from the platform — syllabus / schedule / instructor /
policies / accommodations pages projected from `course.sophie.yaml`
+ named MDX prose fragments, rather than hand-authored per course.
The v0.1 spec carried no structural fields for objectives, prereqs,
grading categories, office hours, contact, accessibility, info-page
declarations, or landing-layout choice — all eight clusters added in
this amendment. Authoritative companions:
[design doc](../../plans/2026-05-26-course-info-projection-design.md),
[implementation plan](../../plans/2026-05-26-course-info-projection-implementation.md),
[code review](../../reviews/2026-05-26-course-info-projection-phases-1-4.md).

**Clean break: `assessment.grade_weights` removed.** Per
`feedback_no_backcompat_prelaunch` (zero production students; one
consumer course; no in-flight content to migrate). The v0.1 shape
(`grade_weights: [{ category, weight, label }]` summing to 100) is
**removed** from `AssessmentSectionSchema`. Replacements:

- **Required**: top-level `grading: { categories[...], letter_scale[...],
  curve_policy_ref? }`. Each `categories[i]` carries `{ id, name,
  weight, count?, drop_lowest?, late_policy_ref? }`. Weights sum to
  **1.0 ± 0.001** (Zod refine), not 100.
- **Required**: `assessment.category_refs: [Slug]` as an
  audit-coverage pointer into `grading.categories[*].id`. Enables
  audit invariants (QB6/QB7) that the previous flat `grade_weights`
  shape couldn't express.
- **Test-fixture migration**: `weights-not-100.yaml → category-weights-not-one.yaml`
  (rename in place); existing test "rejects weights not summing to 100"
  renamed to "rejects grading.categories weights not summing to 1.0";
  one new test pins `.strict()` rejection of legacy `assessment.grade_weights`
  ([`course-spec.test.ts:94-105`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/course-spec.test.ts)).

**Seven new optional clusters (additive; courses opt in incrementally).**
All eight v0.2-shape clusters ship as **sibling files** per
[ADR 0061](./0061-codebase-optimized-for-ai-coding.md) LOC budget
(`course-spec.ts` grew 371 → 404 LOC, well within 500-warn):

| Cluster | Sibling file | Notes |
|---|---|---|
| `objectives` | `course-spec-v02-objectives.ts` | course-level LOs with optional `assessed_by: [category_id]` cross-refine |
| `prereqs` | `course-spec-v02-prereqs.ts` | course / skill / topic refs |
| `grading` | `course-spec-v02-grading.ts` | required at v0.2; replaces `grade_weights` (see Clean break above) |
| `office_hours` | `course-spec-v02-office-hours.ts` | modality enum, HH:MM regex, `by_appointment` boolean |
| `contact` | `course-spec-v02-contact.ts` | email validation, optional `async_channel` (slack / discord / canvas-msg) |
| `accessibility` | `course-spec-v02-accessibility.ts` | DRC link, `request_deadline_weeks`, optional prose ref |
| `info_pages` | `course-spec-v02-info-pages.ts` | drives route injection (see Projection pattern below) |
| `landing` | `course-spec-v02-landing.ts` | pluggable landing layout (see `"custom"` enum below) |

Each sibling file is 20–91 LOC; barrel re-exports at `course-spec.ts`.
Validates ADR 0061's "AI-author navigation by filename" claim
end-to-end across 14 sprint commits.

**Strict-union `info_pages.compose:` + reserved-slug refine (H4/B5).**
`info_pages.compose` is a `z.union([known_data_keys_enum,
prose-fragment-regex])`. Typos like `"objetctives"` fail at
schema-parse time, not at compose-evaluator render time. Defends the
class at the schema layer rather than via runtime branches in the
evaluator. Reserved `info_pages` slugs (`units`, `sections`,
`library`, `_astro`, `_server`, `_image`, `pagefind`) are rejected by
a second refine — defends slug collisions with Sophie-injected routes
and Astro / Pagefind internals.

**Three cross-refines on `CourseSpecSchema`.**

| Source | Target | Catches |
|---|---|---|
| `assessment.category_refs[]` | `grading.categories[*].id` | unreferenced grading category vs. unreferenced assessment surface |
| `objectives[*].assessed_by[]` | `grading.categories[*].id` | objective claims assessment by a category that doesn't exist (added per review I3 pre-merge) |
| `info_pages` keys + reserved set | (refine) | slug collision class defended at schema layer |

**Projection pattern operationalizes [ADR 0082](./0082-chapter-layout-extraction.md).**
`@sophie/astro` reads `course.sophie.yaml` at `astro:config:setup`
and `injectRoute`s up to seven routes:

- `/` — course landing (dispatcher to `hero-with-modules` |
  `simple-list` | `prose-with-toc` | `"custom"`-override)
- `/sections/[section]/` — section landing
- `/<slug>/` — one route per declared `info_pages` entry (five ship
  today: `/syllabus/`, `/schedule/`, `/instructor/`, `/policies/`,
  `/accommodations/`)

Layouts are **`.astro` orchestrators** in
[`packages/astro/src/components/`](https://github.com/drannarosen/sophie/tree/main/packages/astro/src/components)
composing **six React sub-components** in `@sophie/components`
(`ObjectivesSection`, `GradingTable`, `OfficeHoursTable`, `ContactCard`,
`AccessibilitySection`, `PrereqsList`). Per **H7 = Option B** — matches
the `ChapterLayout` precedent and lets prose fragments use the full
chrome-component set via `<Content components={chromeComponents}>`.
The original design-doc framing ("`@sophie/components` exports
`<SyllabusPage>`") is superseded.

A new **`virtual:sophie/course-spec` virtual module** mirrors the
`virtual:sophie/figures` pattern — second instance of the pattern
established by [ADR 0082](./0082-chapter-layout-extraction.md); the
deferred ScheduleSchema sprint will be the predicted third. Always-
register shape: factory takes `CourseSpec | null` and returns the
plugin unconditionally; consumers narrow at dispatcher entry per
AGENTS.md R12.

**Chrome vs. pedagogy: component-set split (operationalizes
[ADR 0058](./0058-epistemic-component-contract.md)).** Two factories
ship at [`packages/astro/src/components.tsx`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/components.tsx):

- `makeStaticComponents({ figures })` — chapter MDX; full set
  including the eight epistemic-role pedagogy primitives.
- `makeChromeComponents({ figures })` — course-info prose fragments
  at `src/content/course-info/`; excludes pedagogy primitives
  (`<OMIFlow>`, `<WorkedExample>`, `<MultiRep>`, `<Intervention>`)
  whose meaning depends on chapter context; **includes** the inline
  chrome subset (`<Callout>`, `<GlossaryTerm>`, `<KeyEquation>`,
  `<EquationRef>`, `<FigureRef>`, `<Aside>`).

Plus a separate family of **five MDX-authorable course-management
chrome components** at `@sophie/components/chrome/`: `<Due>`,
`<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`. These read course
data via the `useCourseSpec()` hook, which is backed by an SSR-setter
+ script-tag store (`pedagogy-store.ts:14-22` doctrine — no
`virtual:` imports in `@sophie/components`, which is framework-pure
per ADR 0001). All five are chrome with no epistemic role.

**`landing.layout: "custom"` enum value (H2).** Explicit schema
declaration that the integration-override path
(`defineSophieIntegration({ landings: { course, section } })`) is in
effect. Enum default is `"simple-list"`. The four-value enum guards
against typos in the override declaration at parse time.

**Schema location: `@sophie/core/schema` (clarification).**
`CourseInfoFragmentSchema` (Astro content-collection frontmatter
validator for prose fragments at `src/content/course-info/`) ships in
`@sophie/core/schema`, not `@sophie/astro` as the design doc proposed.
Convention clarification: all Zod schemas co-locate in `@sophie/core/schema`
even when only one package consumes them; `@sophie/astro` takes no
direct Zod dep.

**Deferred (out of scope).** iCal export (`/schedule.ics`) and
`schedule.yaml` source-of-truth deferred per **H6** to a follow-up
sprint with its own focused design pass + ADR. `SchedulePage.astro`
ships as a v0.2 placeholder. The `"schedule_overview"` value parses
clean inside `info_pages.compose` (it's in `KNOWN_COMPOSE_DATA_KEYS`)
but the compose evaluator throws a curated "not yet" error at render
time — forward-compatible without breaking the schema's closed union.

**Why `spec_version` stays at `"0.1"`.** Amendment 1's prose
predicted "cross-shape breaks trigger a real v0.2 bump"; Amendment 2
is a cross-shape break and the sprint still chose to keep
`COURSE_SPEC_VERSION = "0.1"`. Two reasons: (1) `feedback_no_backcompat_prelaunch`
remains the operative discipline — zero production students, one
consumer course (astr-201) which the sprint migrated in-place;
(2) the alternative (a `course-spec-v02.ts` file alongside the v0.1
schema, plus a separate `schema:` literal for consumer YAML) would
have multiplied surface area for an internal-only versioning marker.
The honest framing: pre-launch zero-consumer state still favors
clean-break-in-place over version-bump ceremony. A `spec_version`
bump to `"0.2"` becomes the right move when (a) COMP 521 or ASTR 101
land as a second Sophie-shaped course AND (b) ASTR 201 has authored
substantial content against the spec — i.e., when actual backward-
compat cost would exist. **Open follow-up**: revisit `spec_version`
on the second-consumer trigger.

**Why the amendment lives in 0080 rather than a new ADR.** Same
rationale as Amendment 1 + an additional constraint: ADR 0086 was
allocated to the multi-chapter glossary definitions sprint
([PR #202](https://github.com/drannarosen/sophie/pull/202),
2026-05-26). Consolidating into Amendment 2 preserves a single
decision trail across all course-spec amendments; cross-references
from ADRs 0082, 0058, 0061, 0004, 0030 all anchor here rather than
fragmenting across two course-spec ADRs.

**Consequences.**

- ASTR 201 `course.sophie.yaml` extended with `grading`,
  `objectives`, `office_hours`, `contact`, `accessibility`,
  `info_pages`, and `landing` clusters during Phase 6 of the sprint;
  the fixture at
  [`packages/core/src/schema/__fixtures__/course-spec-astr-201.yaml`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/__fixtures__/course-spec-astr-201.yaml)
  carries the migrated v0.1-shape with all v0.2-shape clusters
  populated.
- The original v0.1 `grade_weights` shape is **rejected** by the
  schema; new test pins
  [`course-spec.test.ts:94-105`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/course-spec.test.ts)
  catches any regression to the legacy shape.
- AGENTS.md gains **R12** (virtual-module type-narrowing at
  dispatcher entry) — defends the class of bugs surfaced as code-
  review issue C1 ("unguarded null deref on `courseSpec`" in three
  dispatchers, fixed pre-merge). Two virtual modules
  (`virtual:sophie/figures` + `virtual:sophie/course-spec`) establish
  the class; the deferred ScheduleSchema sprint is the predicted
  third instance.
- Code review C2 ("silent `prereqs` skip in `SyllabusPage.astro`")
  led to a **sixth** React sub-component (`PrereqsList`) shipping
  before merge — the design doc's "five sub-components" framing is
  out of date.
- Code review I3 led to the second cross-refine
  (`objectives[*].assessed_by` → `grading.categories[*].id`) shipping
  before merge.
- New author-facing reference doc lands at
  [`reference/course-info-schema.md`](../reference/course-info-schema.md)
  covering the v0.2-shape clusters, prose-fragment authoring
  conventions, and the chrome-vs-pedagogy component-set split.

## References

- 2026-05-25 design doc:
  [`docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`](../../plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md)
  — Q1–Q9 brainstorm + complete ASTR 201 draft Course Spec.
- [ADR 0003](./0003-schema-zod-vs-typebox.md) — Zod as source of
  truth; this ADR applies that to the course-level surface.
- [ADR 0030](./0030-audience-and-ai-author-model.md) — AI as primary
  author; the Course Spec is the artifact AI authoring operates against.
- [ADR 0058](./0058-epistemic-component-contract.md) — the eight-role
  contract `quality_bars` reference.
- [ADR 0061](./0061-codebase-optimized-for-ai-coding.md) — focused
  files + filename routing; explains why schemas land as siblings of
  the existing 30 in `@sophie/core/schema`.
- [ADR 0064](./0064-chapter-migration-playbook.md) — chapter
  migration playbook; Course Spec captures the pedagogical intent
  ADR 0064 cannot.
- spec-kit (constitution → specify → plan → tasks → implement):
  <https://github.com/github/spec-kit>
- autospec (YAML-first artifacts, token-isolated execution):
  <https://github.com/ariel-frischer/autospec>
