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
  status: in-progress
  last_validated_date: "2026-05-25"
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
---

# ADR 0080: Course Spec format v0.1

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
- **Related**: [0001](./0001-platform-not-monorepo.md), [0003](./0003-schema-zod-vs-typebox.md), [0030](./0030-audience-and-ai-author-model.md), [0058](./0058-epistemic-component-contract.md), [0061](./0061-codebase-optimized-for-ai-coding.md), [0064](./0064-chapter-migration-playbook.md)
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
| `assessment` | philosophy + grade weights (must sum to 100) + workflow + exam policy |
| `quality_bars` | `required` (errors) + `recommended` (warnings) audit invariants |
| `discovery` | filesystem glob conventions Sophie uses to find chapters/registries |

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
grade_weights must sum to 100` (smoke-tested via
[`__fixtures__/invalid/weights-not-100.yaml`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/__fixtures__/invalid/weights-not-100.yaml)).

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
