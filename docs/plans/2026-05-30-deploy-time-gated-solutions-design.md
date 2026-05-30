# Design — Deploy-Time Gated Solutions + Homework Registry

**Date:** 2026-05-30
**Status:** DRAFT — pending ADR 0096 approval (HITL). No code until sign-off.
**Author:** Claude Code (brainstorming session with Anna)
**Repos touched:** `sophie` (platform capability + ADR) · `astr201` (consumer:
homework registry + practice re-pedagogy)
**Drives:** the deferred `ScheduleSchema` family; the astr201 "finish course
content" objective.

---

## 1. Problem & context

The astr201 pilot has 15 end-of-lecture practice sets (currently ⭐-rated
prose). We are re-pedagogizing them into Sophie's formative family AND adding a
**Solutions** surface. Because homeworks are drawn from these practice problems,
**solutions must not be visible before the assignment due date** — and the
honest version of "hidden" on a build-time static site (no server, no auth;
confirmed by the 2026-05-30 security audit) is **"not in the deployed
artifact,"** not a client-side `hidden` toggle.

Anna's stated needs (decisions captured this session):

1. **Build-time gate, real protection** — solutions absent from `dist/` until a
   scheduled/manual rebuild after the reveal date. (`astrobytes-edu/astr201` is
   private → source never leaks early; the deployed Pages site is the only
   exposure surface.)
2. **Re-pedagogy (max improvement)** over a faithful Quarto port.
3. **Homework registry** as the single source of truth for assignments.
4. **Fail-closed**: a `tbd` or missing date keeps solutions **hidden**.
5. **Posting (`assignedDate`) + due (`dueDate`) dates** per homework.
6. **Cross-chapter homeworks** — each assignment is a subset drawn from multiple
   chapters (up to ~10 problems).
7. **Chapter-level reveal** — after the due date, ALL of a chapter's practice
   solutions post together (exam-study set), not just the assigned subset.
8. **Versatility** — Anna tweaks assignments/dates throughout the semester by
   editing one registry + redeploying.

## 2. Design overview — two decoupled layers

The key structural decision: **separate assignment logistics from solution
reveal.** They share dates by default but are independently editable.

### Layer 1 — Homework registry (assignment logistics)

`astr201/homework.sophie.yaml` (own file — `ScheduleSchema`-ready; not buried in
the course spec):

```yaml
homework:
  - id: hw-3
    title: "Homework 3 — Gravity & Stellar Timescales"
    assignedDate: 2027-02-06        # when the assignment posts to students
    dueDate: 2027-02-20             # ISO date | "tbd"
    problems:                        # subset across MULTIPLE chapters
      - { unit: lecture-03-gravity-and-orbits, ids: [grav-pr-04, grav-pr-09, grav-pr-11] }
      - { unit: lecture-01-ages-lifetimes,     ids: [ages-pr-03] }
      - { unit: lecture-04-light-as-information, ids: [light-pr-02, light-pr-05] }
```

**Shape rationale (array-of-groups over flat pairs or a YAML map):** grouped by
chapter (compact, ~one line per chapter, mirrors how Anna selects problems),
**order-stable** (students see a deterministic order), and a **clean Zod schema**
(`z.array(z.object({ unit, ids }))`) — Zod is the source of truth (ADR 0003). A
plain map `{unit: [ids]}` is terser but can't list a unit twice and has
parser-dependent key order.

**Why registry-side membership (not a `homework="hw-3"` prop on the problem):**
the content MDX stays clean and **reusable across terms**. Each term, Anna edits
only `homework.sophie.yaml` to re-select problems and dates. Problems are never
welded to assignments. This is the versatility requirement (#8).

### Layer 2 — Per-chapter solution reveal (study material)

Each chapter (unit) has a `solutionsRevealDate`:

- **Default**: the **latest `dueDate`** among homeworks that reference that
  chapter — so a chapter's solutions never post until *all* of its assigned
  problems are past due (no leak via the "post the whole chapter" rule).
- **Override**: an explicit `solutionsRevealDate` on the unit (for the cases
  where Anna wants a different date, e.g. a chapter with no homework but wanted
  as exam-study material, or a deliberately later/earlier post).
- **Fail-closed**: if the resolved date is `tbd`, absent, or in the future →
  **hidden**.

```
revealed(chapter) =
  let d = explicit solutionsRevealDate ?? max(dueDate of homeworks touching chapter)
  d is a concrete date  AND  buildTime >= d
```

When `revealed` flips true, the **entire chapter's** practice solutions +
auto-checks post together.

## 3. Reveal semantics — what's visible when

| Surface / element | Before chapter reveal | After chapter reveal |
|---|---|---|
| Practice tab — problem prompt | ✅ visible | ✅ visible |
| Practice tab — `<Hint>` ladders | ✅ visible (scaffold, not answer) | ✅ visible |
| Practice tab — `<NumericQuestion>` auto-check | ❌ withheld (final number protected) | ✅ live |
| Practice tab — inline worked `<Solution>` | ❌ withheld | ✅ (or shown on Solutions tab) |
| **Solutions tab** (`/units/<unit>/solutions/`) | "Available after `<date>`" / "TBD" placeholder | ✅ full worked solutions for the chapter |

**Fail-closed everywhere:** the default for any un-dated solution is HIDDEN.
Security defaults must fail closed — a missing date must never *expose* an
answer. (This inverts the naive `null = always-on` default and is the single
most important correctness rule in this design.)

## 4. Build-time mechanism

- The gate is a **build-time transform**, not CSS. For a chapter whose
  `revealed` is false, the renderer **does not emit** `<NumericQuestion.Answer>`
  values or `<Solution>` bodies into `dist/` — withheld content never enters the
  artifact, so it is unfetchable (real protection, given the private repo).
- `buildTime` = wall-clock at build (Node, build-time only — safe; not the
  `Date.now()`-in-scripts ban, which concerns workflow-script determinism).
- **Rebuild cadence**: a daily GitHub Actions `schedule:` cron rebuild flips
  chapters on as dates pass; the existing manual `workflow_dispatch` is the
  backup. No reveal date passes silently.

## 5. Schema additions (Zod — `@sophie/core`)

- `HomeworkRegistrySchema`: `z.array(HomeworkSchema)`.
- `HomeworkSchema`: `{ id, title, assignedDate: DateOrTbd, dueDate: DateOrTbd,
  problems: z.array(ProblemGroupSchema) }`.
- `ProblemGroupSchema`: `{ unit: z.string(), ids: z.array(z.string()).min(1) }`.
- `DateOrTbd`: `z.union([z.string().date(), z.literal("tbd")])`.
- **Cross-refines:** (a) every `unit` resolves to a real unit; (b) every `id`
  exists in that unit's practice set; (c) each problem is claimed by **at most
  one** homework (no ambiguous reveal date); (d) `assignedDate <= dueDate` when
  both concrete.
- New virtual module `virtual:sophie/homework` (`HomeworkRegistry | null`,
  always-register pattern; dispatcher narrows at entry per **R12** — the
  predicted third nullable virtual module).

## 6. Surfaces

- New route after `practice/`: `/units/<unit>/solutions/` — a per-chapter
  Solutions tab. Renders worked solutions when `revealed`, else a placeholder
  card ("Solutions available after Feb 20, 2027" / "Solutions TBD").
- Practice-tab gating consumes the same `revealed(chapter)` result.
- **Deferred (W2 — not built now):** a per-homework assembled view
  (`/homework/hw-3/solutions/`). The registry already groups problems by
  homework, so this is a cheap future add; noted, not built.

## 7. Re-pedagogy content model (the practice problems themselves)

Pattern vocabulary (validated this session), keeping the
Conceptual/Calculation/Synthesis structure, constants block, and ⭐ ratings:

| Problem type | → Component | Scaffold |
|---|---|---|
| Misconception (e.g. centripetal force) | `<MCQ>` (wrong statement = distractor) | `<Solution>` names the misconception (`Misconception` epistemic role, ADR 0058) |
| Numeric calculation | `<NumericQuestion>` `value/tolerance/unit` (auto-check) | `<Hint>` ladder: formula → setup → substitution |
| Conceptual / derivation / explanation | `<PracticeProblem>` + `<Solution>` | optional single `<Hint>` |
| Sanity-check / interpretation | `<Predict>` or binary `<MCQ>` | reveal explains the physics |
| Unit / dimensional check | `<PracticeProblem>` + `<Solution>` | reinforces `dimensional-analysis` named tool |

**Locked rules:** (1) every numeric answer gets a `<Hint>` ladder (≥1) so the
page tutors, not just answers; (2) ids follow `course/unit/id` convention
(`grav-pr-NN`). `<Hint>` has **0 uses in astr201 today** → this is its first
deployment (good gap-surfacing signal; mild risk — verify it renders in the
practice/solutions routes during the pilot).

## 8. Pilot plan (ADR 0064 discipline — pilot one, validate, batch)

**Pilot target:** `foundations/lecture-03-gravity-and-orbits` (richest set —
exercises every component type: misconception→MCQ, conceptual/derivation,
numeric, synthesis).

**Verification (dominant risk — most newly-authored physics):** use the
`lecture-writing` (ASTR 201) + `check-science` skills; **show CGS work for every
numeric answer / distractor** for Anna's spot-check. No answer ships unverified
(CLAUDE.md standard). Each numeric `<NumericQuestion.Answer>` value traceable to
a shown calculation.

**Success criteria (W4):**
- All 11 gravity-and-orbits problems re-pedagogized; every numeric answer
  verified + work shown.
- Practice route renders the interactive layer; Solutions route renders
  gated/placeholder correctly for both a concrete-date and a `tbd` homework.
- Build emits NO solution/auto-check content for a future-dated chapter (grep
  `dist/` to prove absence — real-protection check).
- axe-core clean on both routes; `pnpm validate` green on `homework.sophie.yaml`.
- Anna sign-off on pilot before batching the other 14 sets.

**Sophie-gap watchlist (the pilot's purpose):** practice/solutions route
existence (#189 may be stale), `<Hint>` rendering, virtual-module wiring, the
build-time gate transform, cron rebuild.

## 9. Sequencing

1. **ADR 0096 approval** (this doc's §10) — HITL gate.
2. Sophie: schema + virtual module + gate transform + Solutions route + cron
   (platform PRs).
3. astr201: `homework.sophie.yaml` + re-pedagogize the pilot chapter.
4. Validate against §8 criteria → Anna sign-off.
5. Batch the remaining 14 sets + wire real homework dates.
6. (Bundled "finish content" follow-ons: frontend-design findings, info-page
   base-path bug — separate, after the pilot.)

---

## 10. ADR 0096 PROPOSAL (not yet written to `decisions/` — awaiting approval)

> **Title:** Deploy-time gated content + homework registry
> **Status (proposed):** accepted-design
> **Context:** Sophie is a build-time SSG with no runtime auth (ADR 0001;
> 2026-05-30 security audit). Courses need solutions hidden until an assignment
> due date. The only honest "hidden" is build-time exclusion from the artifact.
> **Decision:**
> 1. A **homework registry** (`virtual:sophie/homework`, `T | null`,
>    always-register; R12 dispatcher narrowing) is the single source of truth
>    for assignment posting/due dates + cross-chapter problem membership.
> 2. Solution reveal is **chapter-scoped**, resolved as `explicit
>    solutionsRevealDate ?? max(dueDate of homeworks touching the chapter)`,
>    **fail-closed** (tbd/absent/future → hidden).
> 3. The gate is a **build-time transform** (withheld content never enters
>    `dist/`), refreshed by a daily `schedule:` cron + manual `workflow_dispatch`.
> 4. Amends the "lecture solutions not migrated (assessment concern)" decision
>    (astr201 decision 0001 §6): solutions are now migrated **gated**.
> **Consequences:** real protection only with a private source repo; a rebuild
> cadence is required; `ScheduleSchema` (future) becomes the date source,
> superseding hand-entered dates without reshaping the registry.
> **Alternatives rejected:** client-side date toggle (cosmetic, bypassable);
> per-problem reveal (leak risk via ungated siblings; chapter-scope is safer);
> separate instructor artifact (loses on-site student study value).

**Open question for Anna:** confirm chapter-level reveal (default = homework due
date) vs. per-problem reveal. This doc assumes **chapter-level**.
