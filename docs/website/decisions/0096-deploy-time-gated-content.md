---
date: 2026-05-30T00:00:00.000Z
tags:
  - schema
  - astro
  - security
  - assessment
  - structural-defense
status: accepted-design
validation:
  status: in-progress
  last_validated_date: "2026-05-30"
  evidence:
    - kind: review
      ref: docs/plans/2026-05-30-deploy-time-gated-solutions-design.md
      date: "2026-05-30"
      notes: "Brainstorming-session design doc (§10 is this ADR's source). Two-layer architecture: a homework registry (`virtual:sophie/homework`, `T | null`, always-register) for assignment logistics, and chapter-scoped fail-closed solution reveal resolved as `explicit solutionsRevealDate ?? max(dueDate of homeworks touching the chapter)`. Approved in-thread 2026-05-30 (HITL gate, design doc §9 step 1)."
    - kind: review
      ref: docs/plans/2026-05-30-gated-solutions-implementation.md
      date: "2026-05-30"
      notes: "Three-PR implementation plan. PR 1: HomeworkRegistry schema + loader + `virtual:sophie/homework` module (platform core). PR 2: fail-closed chapter reveal resolver + gated `/units/[unit]/solutions` route + security acceptance test (the W4 gate: a future-dated chapter's `dist/` contains zero solution text, proven by grep). PR 3: astr201 consumer registry + pilot re-pedagogy. Not yet implemented — this ADR is `accepted-design`."
  notes: |
    Approved design, not yet shipped. Real protection depends on a
    private source repo (`astrobytes-edu/astr201`) plus a daily rebuild
    cadence; the gate is build-time exclusion from `dist/`, not a
    runtime check (Sophie has no server — ADR 0001). The
    security-acceptance test in PR 2 (grep `dist/` for a sentinel) is
    the proof obligation that flips `validation.status` to `validated`.
    Amends astr201 decision 0001 §4 + §6 (lecture solutions fold into
    readings; homework/exam solutions deferred as an assessment
    concern): solutions are now migrated, gated.
---

# ADR 0096: Deploy-time gated content + homework registry

:::{admonition} ADR metadata
- **Status**: accepted-design
- **Deciders**: anna
:::

## Context

Sophie is a build-time static-site generator with **no runtime auth and
no server** (ADR 0001 — standalone platform; courses are separate
consumer repos that build to static `dist/`). The 2026-05-30 security
audit (`docs/reviews/2026-05-30-security-audit.md`) confirmed the only
exposure surface of a consumer course is the deployed Pages artifact:
anything shipped into `dist/` is fetchable by anyone, and client-side
`hidden` toggles are cosmetic — a determined student reads the withheld
value out of the page source or the network tab.

The astr201 pilot has 15 end-of-lecture practice sets being
re-pedagogized into Sophie's formative-assessment family (ADR 0073
Amendment 1). Homeworks are drawn from these practice problems, so
**worked solutions must not be visible before the assignment due date**.
On a static site the only honest meaning of "hidden" is **"absent from
the deployed artifact"** — not a CSS class, not a JS gate. A correct
design must therefore decide *visibility at build time* and exclude
withheld content from `dist/` entirely.

This amends astr201 decision 0001 §4 ("Solutions fold into readings",
lecture-level) and §6 ("Assessments deferred", homework/exam-level),
which together declared lecture and homework solutions out of scope and
not migrated pending the ADR 0073 assessment surface. Solutions are now
migrated — **gated** — via the mechanism this ADR locks.

## Decision

Two decoupled layers separate *assignment logistics* from *solution
reveal*. They share dates by default but are independently editable.

1. **Homework registry as the single source of truth.** A new virtual
   module `virtual:sophie/homework` exports `HomeworkRegistry | null`,
   sourced from a consumer-side `homework.sophie.yaml`. It is the
   per-term source of truth for each assignment's `assignedDate` /
   `dueDate` and its cross-chapter problem membership (problems grouped
   by `unit`, drawn from multiple chapters per homework). The module
   follows the **always-register** pattern — it is registered even when
   the registry is absent (exporting `null`), and dispatcher routes
   narrow the `T | null` export at frontmatter entry per **R12** (the
   predicted third nullable virtual module, after
   `virtual:sophie/course-spec` and the deferred `ScheduleSchema`
   family). Schema is Zod (ADR 0003): registry-side membership keeps the
   content MDX clean and reusable across terms — problems are never
   welded to assignments, so each term Anna edits only the registry.

2. **Chapter-scoped, fail-closed solution reveal.** A chapter's
   solutions reveal as a whole (the exam-study set), resolved as:

   ```
   revealed(chapter) =
     let d = explicit solutionsRevealDate
             ?? max(dueDate of homeworks touching the chapter)
     d is a concrete date  AND  buildTime >= d
   ```

   The default reveal date is the **latest** `dueDate` among homeworks
   that reference the chapter, so a chapter never posts until *all* of
   its assigned problems are past due (no leak via the
   reveal-the-whole-chapter rule). An explicit per-unit
   `solutionsRevealDate` overrides the derived date. The resolution is
   **fail-closed**: a `tbd`, absent, or future date keeps solutions
   **hidden**. This inverts the naive `null = always-on` default and is
   the single most important correctness rule — a missing date must
   never *expose* an answer.

3. **Build-time route-level gate.** Visibility is decided in
   `getStaticPaths` (build-time, route-level), not in CSS or client JS.
   For a chapter whose reveal date has not passed, the solutions
   artifact is **never rendered** — its content (worked `<Solution>`
   bodies, `<NumericQuestion>` answer values) never enters `dist/`, so
   it is unfetchable. `buildTime` is the build wall-clock (Node,
   build-time only — distinct from the determinism-motivated
   `Date.now()`-in-scripts ban). The reveal resolver itself takes `now`
   as an injected parameter, so it is pure and exhaustively testable;
   the route is the single place wall-clock is read.

4. **Separate `solutions` content collection (index/search side-channel
   defense).** Solutions live in a dedicated `solutions` content
   collection, kept out of the course-wide `artifacts` collection via a
   `!**/solutions.mdx` glob negation in the `artifacts` source pattern.
   Because no course-wide artifact sweep — Library rollups, the Pagefind
   search index, the pedagogy-index harvest — ever reads
   `getCollection("solutions")`, none of them can see a solution body,
   gated *or* revealed. This is **defense-in-depth** alongside the
   route-level gate (point 3): the route gate withholds the *page*; the
   separate collection withholds the *index/search side-channels* that
   would otherwise leak a withheld answer through a search hit or a
   Library rollup. This emerged as the **C1** hardening and is the
   primary index/search side-channel defense.

5. **Consumer-side rebuild cadence.** A daily GitHub Actions
   `schedule:` cron rebuild flips chapters on as their reveal dates
   pass; the existing manual `workflow_dispatch` is the backup. No
   reveal date passes silently — the gate re-evaluates every build.

## Rationale

- **Real protection, not cosmetic.** Build-time exclusion is the only
  honest gate on an auth-less SSG (ADR 0001). The PR-2 security
  acceptance test makes this an enforced obligation: a future-dated
  chapter's `dist/` must contain **zero** solution text (proven by
  `grep -r "<sentinel>" dist/` returning empty), and a past-dated
  chapter's must contain it.
- **Fail-closed by construction.** The resolver returns a `Date | null`;
  `null` (tbd / absent / no concrete homework date) means hidden. There
  is no code path where an un-dated solution renders.
- **Reusable content.** Registry-side membership (problems are not
  tagged with `homework="hw-3"` in MDX) keeps practice content clean and
  re-selectable each term by editing one registry file (ADR 0003 — Zod
  is the source of truth for the registry shape).
- **Forward-shaped for `ScheduleSchema`.** The registry's date fields
  are the seam the deferred `ScheduleSchema` family will source from,
  superseding hand-entered dates without reshaping the registry.

## Consequences

- **Positive.** Solutions can be authored once and posted automatically
  after due dates; the same `revealed(chapter)` result gates both the
  Solutions route and practice-tab auto-check reveal; the registry
  becomes the single editable surface for per-term assignment changes.
- **Index/search side-channel closed by construction.** The dedicated
  `solutions` collection (excluded from `artifacts` via the
  `!**/solutions.mdx` negation) means Library rollups, Pagefind, and the
  pedagogy-index harvest never enumerate a solution body — so a withheld
  answer cannot leak through a search hit or a Library rollup even if the
  route gate were bypassed. Defense-in-depth: the route-level gate gates
  the page, the separate collection gates the index/search.
- **Operational cost.** Real protection requires (a) a **private source
  repo** (so withheld content does not leak from source — confirmed:
  `astrobytes-edu/astr201` is private) and (b) a **rebuild cadence**
  (the cron) so a passed reveal date actually publishes. A skipped
  rebuild means a chapter stays hidden past its date — fail-closed, the
  safe direction.
- **AS-2 suppression is per-unit, not per-problem.** The existence-only
  signal that makes the formative AS-2 audit gated-solution-aware (ADR
  0073) is the *set of unit ids* owning a `solutions.mdx`, so one gated
  solution silences AS-2 for *every* answerless formative in that unit
  (including a reading-tab `<QuickCheck>` that genuinely should carry an
  inline `<Solution>`) — a deliberate tradeoff, since per-problem
  precision would require reading the solution body the security
  constraint here forbids; unit granularity is the correct ceiling.
- **Future date source.** `ScheduleSchema` (future, deferred per the
  implementation plan's out-of-scope list) becomes the date source,
  superseding hand-entered registry dates; the registry is shaped to
  accept that substitution without a migration.
- **Amends astr201 decision 0001 §4 + §6.** Lecture/homework solutions move
  from "not migrated (assessment concern, deferred)" to "migrated,
  gated." This ADR is the Sophie-platform capability that unblocks that
  consumer change.

## Alternatives rejected

- **Client-side date toggle.** A JS/CSS `hidden` flip keyed on the
  current date is **cosmetic and bypassable** — the answer ships in
  `dist/` and is readable from page source or the network tab. Fails the
  "honest hidden" requirement on an auth-less SSG (ADR 0001).
- **Per-problem AST strip.** Gating each `<Solution>` / answer node
  individually (a remark transform that strips withheld subtrees) is
  **higher leak-risk and higher complexity**: one missed node type or
  ungated sibling exposes an answer, and the chapter-scope study-set
  rule (post the whole chapter together) makes per-problem granularity
  pointless. Chapter-scoped route-level gating is the safer, simpler
  structural boundary.
- **Separate instructor-only artifact.** Building solutions into a
  separate, differently-deployed artifact protects them but **loses the
  on-site student study value** — the whole point is that after the due
  date the chapter's solutions become in-context exam-study material on
  the public site.

## References

- [ADR 0001 — Repo shape: standalone platform, separate consumer repos](./0001-platform-not-monorepo.md)
  — the auth-less SSG model that forces build-time gating.
- [ADR 0003 — Zod as schema source of truth](./0003-zod-as-source-of-truth.md)
  — the `HomeworkRegistrySchema` contract.
- [ADR 0073 — Unified assessment schema (formative-with-reveal v1)](./0073-unified-assessment-schema.md)
  — the `<Solution>` / `<NumericQuestion>` / `<Hint>` family the gate protects.
- [ADR 0080 — Course-spec format](./0080-course-spec-format-v0-1.md)
  — the `virtual:sophie/course-spec` always-register precedent this registry mirrors.
- `docs/reviews/2026-05-30-security-audit.md` — confirms `dist/` is the only exposure surface.
- `docs/plans/2026-05-30-deploy-time-gated-solutions-design.md` — full design (§10 is this ADR's source).
- `docs/plans/2026-05-30-gated-solutions-implementation.md` — three-PR implementation plan.
- astr201 decision 0001 §4 ("Solutions fold into readings") + §6 ("Assessments deferred") — amended by this ADR.
