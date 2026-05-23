# Wedge B-followup W4c Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Default batch size 3; report after each batch and await Anna's HITL confirm.

**Goal:** Close Wedge B-followup by shipping the Library room chrome (shell + 5 refactor + 3 new CourseX + 8 Spec routes), graduating PRA-2 to honor `audit_overrides`, deriving a stable KeyInsightEntry.slug, and inlining the pre-W4c audit's actionable findings as Batch 0.

**Architecture:** Hybrid `<LibraryCollectionShell>` (text props + named slots) wraps 5 flat-list Course\* components; CourseObjectives stays outside (3-level grouping exception). 3 new CourseX siblings roll up OMIFlowEntry slot data (Observable/Model/Inference per ADR 0058). 8 per-entry Spec routes render rich-where-data-exists (Equations gets `<BiographyRender>`; Topics gain card-body render per W4b R+CR N5). PRA-2 honors `audit_overrides` on TopicEntry; KeyInsightEntry gets a derived `slug` field. R6–R9 doctrine codified into AGENTS.md.

**Tech Stack:** Astro 6 + MDX, Zod schemas, vitest + axe-core, pnpm + Turbo, biome, Playwright.

**Design source:** [2026-05-23-wedge-b-followup-w4c-design.md](./2026-05-23-wedge-b-followup-w4c-design.md). Read first for context.

**Audit source:** [2026-05-23-post-w4b-audit.md](../reviews/2026-05-23-post-w4b-audit.md). Batch 0 closes its actionable findings.

**Worktree:** `/Users/anna/Teaching/sophie/.worktrees/wedge-b-followup-w4c/` — branch `feat/wedge-b-followup-w4c` tracking `origin/main` at `e128316`.

---

## Standing discipline (apply throughout)

- **TDD per task.** Write test → run-fail → minimal-impl → run-pass → commit. No exceptions.
- **Pre-batch gates.** Before opening any batch's first task: `pnpm exec biome check 2>&1 | grep -cE "(error|warning)"` must be 0.
- **HITL.** After each batch, summarize what changed; wait for Anna's confirm before starting the next batch.
- **R6–R9 standing checklist on every code change:**
  - R6: any new MyST doc link uses heading-slug, not `#L\d+`.
  - R7: any new extractor silent-skip has a paired-invariant OR `findings.push` disposition.
  - R8: any new module-scoped cache has the HMR-strategy header comment.
  - R9-production: any new named interface = exactly one declaration in production source.
  - R9-test: prefer importing canonical type over redeclaring in tests.
- **Pre-PR gates** (Batch 11) per `feedback_pre_pr_lockfile_check` + W3 surprises #5 + #6 + `project_local_dev_pagefind_e2e_pitfall`. Smoke build filter is `pnpm --filter smoke build` (NOT `@sophie/astro-smoke`).
- **R+CR before PR open** via `superpowers:requesting-code-review`. Address Critical + Important before opening.
- **Squash-merge per ADR 0055.** PR-open + merge require explicit Anna text confirm per `feedback_no_questions_mode_scope`.
- **Docs no drift per `feedback_docs_no_drift`.** All docs touched land in same PR (Batch 10).
- **validation.md regen** per `feedback_validation_dashboard_regen` if any ADR `validation:` block touches.

---

## Batch 0 — Audit cleanup (5 tasks)

Closes the 4 pre-W4c Phase B candidates + the 2 doctrine-codification items from the 2026-05-23 audit. Independent of W4c feature work; commits land first to establish a clean baseline.

### Task 0.1 — Fix R6 MyST line-anchor in component-contract.md + ADR 0004

**Files:**
- Modify: `docs/website/reference/component-contract.md:424`
- Modify: `docs/website/decisions/0004-component-contract-revisions.md:169`

**Step 1.** Read each cited line; identify the relative-path link with `#L36-L53` GitHub anchor.

**Step 2.** Replace with plain file link (no anchor) + inline prose pointing readers to "the `PedagogyIndex` schema declaration." Example transform:

```diff
- [packages/core/src/schema/pedagogy-index.ts:36-53](../../packages/core/src/schema/pedagogy-index.ts#L36-L53)
+ [`packages/core/src/schema/pedagogy-index.ts`](../../packages/core/src/schema/pedagogy-index.ts)
+ (search for the `PedagogyIndex` type declaration)
```

**Step 3.** `cd docs/website && npx mystmd build --html 2>&1 | grep -iE "warning|error"` — expect 0.

**Step 4.** Commit:

```bash
git add docs/website/reference/component-contract.md docs/website/decisions/0004-component-contract-revisions.md
git commit -m "docs(R6): replace 2× MyST-unresolvable #L line-anchors with plain links

Per post-W4b audit A2-R6 finding. MyST doesn't resolve GitHub-style
#L\d+ line anchors; replace with plain file links + inline prose
pointing to the relevant section."
```

### Task 0.2 — Refactor ModuleNav.astro to import NavChapter + NavModule from helpers (R9-production)

**Files:**
- Modify: `packages/astro/src/components/ModuleNav.astro:15-30` (drop local declarations + add import)

**Step 1.** At the top of the frontmatter, add:

```ts
import type { NavChapter, NavModule } from "../lib/module-nav-helpers.ts";
```

**Step 2.** Delete the local `export interface NavChapter {...}` and `export interface NavModule {...}` declarations (lines ~17–30).

**Step 3.** Verify the existing `Props` interface still references `NavChapter` + `NavModule` correctly (it should — they're now imported types).

**Step 4.** Re-export the types for downstream consumers (some smoke routes may import `NavChapter` from ModuleNav.astro):

```ts
export type { NavChapter, NavModule };
```

**Step 5.** `pnpm turbo run typecheck --force` — expect green.

**Step 6.** `pnpm turbo run test --filter='@sophie/*' --force` — expect green (no behavior change).

**Step 7.** Commit:

```bash
git add packages/astro/src/components/ModuleNav.astro
git commit -m "refactor(R9): ModuleNav imports NavChapter+NavModule from helpers

Per post-W4b audit A2-R9 Important finding. W4b R+CR I5 extracted
module-nav-helpers.ts but left ModuleNav.astro's local declarations
in place — R9-production violation (one canonical home per interface).
Import canonical types + re-export for downstream consumers."
```

### Task 0.3 — Codify R6–R9 in AGENTS.md + refine memory

**Files:**
- Modify: `AGENTS.md` (add new subsection under "Discipline (multi-line)"; update ADR count on line 156)
- Modify: `~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_review_rules_r6_r9.md`

**Step 1.** In AGENTS.md, locate the "Discipline (multi-line)" section. Append a new sub-section:

```markdown
- **Standing PR-review rules (R6–R9).** Apply on every PR; cite by
  number in review comments.
  - **R6 — MyST anchor verification.** Cited ADR sections use
    MyST heading-slug, not `#L\d+` GitHub line-anchors. Catch:
    grep `docs/website/**/*.md` for `#L[0-9]+`. Originating
    finding: W4b R+CR I1.
  - **R7 — Silent-skip extractor disposition.** Every
    `if (!matched) return;` filter in an extractor has either a
    paired audit invariant OR a `findings.push` at the filter
    site. Bare silent-skips produce dead-code audits.
    Originating finding: W4b R+CR C1.
  - **R8 — Module-scoped MDX caches declare HMR strategy.** Any
    module-level cache (`Map`, `Set`, `WeakMap`) in the
    MDX-compile pipeline includes a header comment naming when
    it's invalidated in production builds + dev-mode HMR + the
    companion plugin/hook. Originating finding: W4b R+CR C3.
  - **R9-production — one canonical declaration per named
    interface (hard rule).** Every named interface has exactly
    one declaration in `packages/**/src/**/*.ts` excluding
    tests. Pre-merge grep gate: `grep -rE "^(export )?interface <Name>" packages/*/src/`
    returns 1. Originating finding: W4b R+CR C2.
  - **R9-test — prefer canonical import in tests (preference).**
    Test files import the canonical type rather than
    redeclaring. Redeclare only when isolation is deliberate
    AND documented in a sibling comment. Refinement source:
    post-W4b audit A2-R9 (test-mock duplications across 6 test
    files).

  See [feedback_review_rules_r6_r9.md](~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_review_rules_r6_r9.md)
  for origin story + class-of-issue patterns each rule formalizes.
```

**Step 2.** In AGENTS.md line 156, change `(77 ADRs, 0001–0078 with 0050 a reserved gap)` to `(78 ADRs, 0001–0079 with 0050 a reserved gap)`.

**Step 3.** In `feedback_review_rules_r6_r9.md` memory, refine the R9 entry to split into R9-production + R9-test + point at AGENTS.md as canonical home. Keep W4b R+CR origin context.

**Step 4.** Commit:

```bash
git add AGENTS.md
git commit -m "docs(AGENTS): codify R6-R9 PR-review rules as standing discipline

Per post-W4b audit A2 + Q7 Phase C lock. R9 splits into
R9-production (hard rule) + R9-test (preference). Memory file
points at AGENTS.md as canonical home + retains origin story."
```

Memory file commit is separate (different scope — user-level not project-level):

```bash
# Manual save of memory file via the Write tool; not via git
# (memory lives outside the project repo)
```

### Task 0.4 — Fix R7 disposition comment in inline-refs.ts:56

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts:30-35` (comment block above visitor)

**Step 1.** Read lines 30–35; identify the inaccurate comment about D4/E4/F2/C1 catching empty-prop case.

**Step 2.** Rewrite to accurately describe disposition:

```ts
   * Empty / missing lookup props are silently dropped — the
   * authoring shape (e.g., `<GlossaryTerm>` with no `name=`) is
   * malformed JSX that TypeScript's prop-type check should flag
   * at the call site. The audit pass D4/E4/F2/C1 invariants do
   * catch *different* shapes: they check that referenced target
   * IDs resolve to populated registry entries (a missing
   * glossary entry, a missing equation refId). Bare-source-side
   * malformed JSX is out of scope here.
```

**Step 3.** Commit:

```bash
git add packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts
git commit -m "docs(R7): correct disposition comment on inline-refs:56 silent-skip

Per post-W4b audit A2-R7 Minor finding. Comment claimed D4/E4/F2/C1
catch the empty-prop case; they actually catch missing-target case.
Rewrite to accurately describe what the silent-skip handles."
```

### Task 0.5 — Add R7 disposition to topic.ts:51 missing-id silent skip

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index/extractors/topic.ts:46-52`

**Step 1.** Add an inline comment above line 51 explaining the disposition:

```ts
    // R7 disposition: a `<SkillReview.Card>` with no `id=` attribute is
    // malformed JSX — TypeScript prop-type check should flag it at the
    // call site (the prop is required per the component schema). We
    // silently skip here rather than emit a PRA-2 finding because the
    // finding would be confusing for an author who's mid-edit (no id
    // yet); the prop-type gate is the better surface for this error.
    if (!idAttr || typeof idAttr.value !== "string") return;
```

**Step 2.** Commit:

```bash
git add packages/astro/src/lib/pedagogy-index/extractors/topic.ts
git commit -m "docs(R7): add disposition comment to topic.ts:51 missing-id skip

Per post-W4b audit A2-R7 Minor finding. Document why the silent
skip is appropriate: malformed JSX is TS-prop-type-flagged at call
site; PRA-2 finding would confuse mid-edit authors."
```

### Task 0.6 — Run Batch 0 gates + report

**Step 1.** Run all hygiene gates:

```bash
pnpm exec biome check 2>&1 | grep -cE "(error|warning)"   # expect 0
pnpm turbo run typecheck --force                          # expect green
pnpm turbo run test --filter='@sophie/*' --force          # expect green
```

**Step 2.** Report batch summary to Anna. Wait for HITL confirm before starting Batch 1.

---

## Batch 1 — Schema extensions (TDD)

### Task 1.1 — KeyInsightEntry.slug derivation (red)

**Files:**
- Modify: `packages/core/src/schema/pedagogy-index-entries/key-insight.ts`
- Test: `packages/core/src/schema/pedagogy-index-entries/key-insight.test.ts`

**Step 1.** Read the existing schema + test file. Note current shape (title?, body, unit, anchor).

**Step 2.** Write failing test:

```ts
import { describe, expect, test } from "vitest";
import { KeyInsightEntrySchema } from "./key-insight";

describe("KeyInsightEntry slug derivation", () => {
  test("requires a slug field", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "ki-1",
      title: "Light is information",
      body: "<p>...</p>",
      slug: "light-is-information",
    };
    expect(KeyInsightEntrySchema.parse(entry).slug).toBe("light-is-information");
  });

  test("rejects entries without slug", () => {
    const entry = {
      unit: "spectra-and-composition",
      anchor: "ki-1",
      body: "<p>...</p>",
    };
    expect(() => KeyInsightEntrySchema.parse(entry)).toThrow();
  });
});
```

**Step 3.** Run: `pnpm --filter @sophie/core test key-insight -- --run` — expect FAIL ("slug field undefined").

**Step 4.** Add `slug: Slug` field to the schema:

```ts
export const KeyInsightEntrySchema = z.object({
  // ... existing fields
  slug: Slug,
});
```

**Step 5.** Run: `pnpm --filter @sophie/core test key-insight -- --run` — expect PASS.

**Step 6.** Commit:

```bash
git add packages/core/src/schema/pedagogy-index-entries/key-insight.ts \
        packages/core/src/schema/pedagogy-index-entries/key-insight.test.ts
git commit -m "feat(W4c): KeyInsightEntry gains required slug field

Per W4c design doc D4. Slug derived at extraction time (Batch 2
extractor update). Schema enforces presence; downstream audit
invariant KI-slug-unique catches collisions."
```

### Task 1.2 — TopicEntry.audit_overrides extension (red)

**Files:**
- Modify: `packages/core/src/schema/pedagogy-index-entries/topic.ts`
- Test: `packages/core/src/schema/pedagogy-index-entries/topic.test.ts`

**Step 1.** Read existing TopicEntrySchema + AuditOverride schema (shared with UnitEntry per W4b).

**Step 2.** Write failing test (mirror UnitEntry's audit_overrides test):

```ts
test("TopicEntry accepts optional audit_overrides per ADR 0053", () => {
  const entry = {
    id: "logarithms",
    label: "Logarithms",
    summary: "Inverses of exponentiation.",
    cards: [],
    prereq_topic_ids: [],
    linked_equation_ids: [],
    linked_misconception_ids: [],
    audit_overrides: [
      {
        invariant: "PRA-2",
        anchor: "product-rule",
        tdr: "TDR-W4c-test-fixture",
        reason: "Mid-refactor: card body in flight before frontmatter update.",
      },
    ],
  };
  expect(TopicEntrySchema.parse(entry).audit_overrides).toHaveLength(1);
});

test("TopicEntry.audit_overrides defaults to undefined when omitted", () => {
  const entry = { /* same minus audit_overrides */ };
  expect(TopicEntrySchema.parse(entry).audit_overrides).toBeUndefined();
});
```

**Step 3.** Run: expect FAIL.

**Step 4.** Add field to schema:

```ts
import { AuditOverrideSchema } from "../audit-override";
// ...
export const TopicEntrySchema = z.object({
  // ... existing fields
  audit_overrides: z.array(AuditOverrideSchema).optional(),
});
```

**Step 5.** Run: expect PASS.

**Step 6.** Commit:

```bash
git add packages/core/src/schema/pedagogy-index-entries/topic.ts \
        packages/core/src/schema/pedagogy-index-entries/topic.test.ts
git commit -m "feat(W4c): TopicEntry.audit_overrides extension per ADR 0053

Per W4c design doc D5. Mirrors UnitEntry.audit_overrides shape
(W4b precedent). PRA-2 honoring lands in Batch 2 (extractor +
audit). Optional with ?? [] consumer fallback per W4b Surprise #2."
```

### Task 1.3 — Batch 1 gates + report

Run typecheck + full unit suite + report. Wait for Anna HITL.

---

## Batch 2 — Audit invariants (TDD)

### Task 2.1 — KeyInsightEntry extractor populates slug (red)

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index/extractors/key-insights.ts`
- Test: `packages/astro/src/lib/pedagogy-index/extractors/key-insights.test.ts`

**Step 1.** Read existing extractor; identify where KeyInsightEntry is constructed.

**Step 2.** Write failing test:

```ts
test("slug derives from title via slugify when title present", () => {
  // ... fixture with title="Light is information"
  expect(result.slug).toBe("light-is-information");
});

test("slug falls back to ${unit}-${anchor} when title absent", () => {
  // ... fixture with no title, unit="spectra-and-composition", anchor="ki-1"
  expect(result.slug).toBe("spectra-and-composition-ki-1");
});
```

**Step 3.** Run: expect FAIL.

**Step 4.** Implement: import `slugify` from `@sophie/core/schema` (or wherever shared); derive in extractor:

```ts
slug: title ? slugify(title) : `${unit}-${anchor}`,
```

**Step 5.** Run: expect PASS.

**Step 6.** Run full extractor test suite to verify no regression.

**Step 7.** Commit.

### Task 2.2 — KI-slug-unique audit invariant (red)

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-audit/invariants/key-insights.ts` (or create if file doesn't exist for KI)
- Test: same file's `.test.ts` sibling
- Modify: `packages/astro/src/lib/pedagogy-audit/runner.ts` (wire invariant if not already wired)

**Step 1.** Inspect existing key-insights invariant file. If missing, create following the W4b `topic-consistency.ts` shape.

**Step 2.** Write failing test:

```ts
test("KI-slug-unique fires when two KeyInsights derive the same slug", () => {
  const index = {
    keyInsights: [
      { unit: "u1", anchor: "ki-1", title: "Light", slug: "light", body: "<p/>" },
      { unit: "u2", anchor: "ki-2", title: "Light", slug: "light", body: "<p/>" },
    ],
    // ... empty other collections
  };
  const sink = { errors: [], warnings: [], info: [] };
  checkKeyInsights(index, sink);
  expect(sink.errors).toContainEqual(expect.objectContaining({
    code: "KI-slug-unique",
    severity: "ERROR",
  }));
});

test("KI-slug-unique stays quiet when all slugs distinct", () => {
  // ... two distinct slugs
  expect(sink.errors).toHaveLength(0);
});
```

**Step 3.** Run: expect FAIL.

**Step 4.** Implement invariant: walk `index.keyInsights`, build slug→entries Map, emit ERROR for any slug with >1 entry, naming all colliding (unit, anchor) pairs in the message.

**Step 5.** Wire into runner if not already wired. Run: expect PASS.

**Step 6.** Commit:

```bash
git commit -m "feat(W4c): KI-slug-unique audit invariant per ADR 0070

Per W4c design doc D4. Catches KeyInsight slug collisions that
the derived-slug fallback (Task 2.1) could otherwise allow silently."
```

### Task 2.3 — PRA-2 honors audit_overrides on TopicEntry — extractor side (red)

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index/extractors/topic.ts`
- Test: same file's `.test.ts` sibling

**Step 1.** Write failing test (orphan body card with matching audit_overrides entry → no finding):

```ts
test("PRA-2 extractor honors audit_overrides on TopicEntry", () => {
  const topic = {
    id: "logarithms",
    cards: [],  // frontmatter declares no cards
    audit_overrides: [
      { invariant: "PRA-2", anchor: "product-rule", tdr: "TDR-X", reason: "..." },
    ],
    // ... other fields
  };
  const tree = parseFixtureTopicWithBodyCard("product-rule");
  const result = extractTopicAndCards(tree, topic);
  expect(result.findings).toHaveLength(0);  // override suppresses
});

test("PRA-2 extractor still fires when override anchor doesn't match", () => {
  // ... override anchor "different-card"; body card id "product-rule"
  expect(result.findings).toHaveLength(1);
});
```

**Step 2.** Run: expect FAIL.

**Step 3.** Implement: in `extractTopicAndCards`, before the existing `findings.push({code: "PRA-2", ...})`, check `topic.audit_overrides ?? []` for matching `(invariant === "PRA-2", anchor === idAttr.value)` entry; skip the push if matched.

**Step 4.** Run: expect PASS.

**Step 5.** Commit.

### Task 2.4 — PRA-2 honors audit_overrides — audit side (red)

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.ts`
- Test: same file's `.test.ts` sibling

**Step 1.** Write failing test (frontmatter-declared card with no body block + matching audit_overrides → no finding).

**Step 2.** Implement: in `checkPRA2`, walk topic entries; for each frontmatter→body orphan, check the topic's `audit_overrides` per the same anchor convention; skip emission if matched.

**Step 3.** Run: expect PASS.

**Step 4.** Commit:

```bash
git commit -m "feat(W4c): PRA-2 honors audit_overrides on TopicEntry (both directions)

Per W4c design doc D5. Mirrors PRA-1 W4b graduation shape. Override
anchor = card id; both extractor (body→frontmatter) and audit
(frontmatter→body) check before emitting. ADR 0079 revision-history
entry lands in Batch 10 docs sweep."
```

### Task 2.5 — Batch 2 gates + report

Run all hygiene gates + report. Wait for Anna HITL.

---

## Batch 3 — `<LibraryCollectionShell>` (TDD)

### Task 3.1 — Shell component + axe test (red)

**Files:**
- Create: `packages/astro/src/components/LibraryCollectionShell.astro`
- Create: `packages/astro/src/components/LibraryCollectionShell.axe.test.ts`

**Step 1.** Write failing axe test using Astro's Container API (mirror existing `admonition-plugin.axe.test.ts` precedent):

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { axe } from "vitest-axe";  // or whatever the project uses
import { describe, expect, test } from "vitest";
import LibraryCollectionShell from "./LibraryCollectionShell.astro";

describe("LibraryCollectionShell — axe-core a11y", () => {
  test("renders heading + content slot with zero violations", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LibraryCollectionShell, {
      props: {
        collection: "glossary",
        heading: "Glossary",
        emptyText: "No definitions yet.",
        isEmpty: false,
      },
      slots: { default: "<dl><dt>term</dt><dd>def</dd></dl>" },
    });
    const results = await axe(html);
    expect(results.violations).toHaveLength(0);
  });

  test("renders empty-state with zero violations", async () => {
    // ... isEmpty: true
  });
});
```

**Step 2.** Run: expect FAIL (component doesn't exist).

**Step 3.** Implement the component (~30 LOC):

```astro
---
export interface Props {
  collection: string;       // slug for data-* + BEM modifier
  heading: string;
  emptyText: string;
  isEmpty: boolean;
}
const { collection, heading, emptyText, isEmpty } = Astro.props;
const rootClass = `sophie-library-collection sophie-library-collection--${collection}`;
---

<main
  class={rootClass}
  data-sophie-library-collection={collection}
  aria-labelledby={`sophie-library-collection-heading-${collection}`}
>
  <header class="sophie-library-collection__header">
    <h1 id={`sophie-library-collection-heading-${collection}`}
        class="sophie-library-collection__heading">
      {heading}
    </h1>
    <slot name="intro" />
  </header>
  <slot name="secondary-nav" />
  {isEmpty ? (
    <p class="sophie-library-collection__empty">{emptyText}</p>
  ) : (
    <slot />
  )}
</main>
```

**Step 4.** Run: expect PASS.

**Step 5.** Commit:

```bash
git commit -m "feat(W4c): add <LibraryCollectionShell> hybrid component

Per W4c design doc D2. Text props (collection/heading/emptyText/
isEmpty) + slots (intro, default content, secondary-nav). Renders
outer <main> landmark with aria-labelledby + data-* attr for
Tier-2 filter forward-compat (D8). Consumed by 5 Course* refactor
in Batch 4 + 8 Spec routes in Batches 7-8."
```

### Task 3.2 — Batch 3 gates + report

Run gates + report. Wait for Anna HITL.

---

## Batch 4 — 5 Course\* refactor + axe tests

Each task = refactor one component + add axe test + emit data attrs. AI-template-driven; mirror the pattern across all 5.

### Task 4.1 — CourseGlossary refactor

**Files:**
- Modify: `packages/astro/src/components/CourseGlossary.astro`
- Create: `packages/astro/src/components/CourseGlossary.axe.test.ts`

**Step 1.** Write failing axe test (render against fixture pedagogy index with 2 definitions; expect 0 violations).

**Step 2.** Refactor template — wrap existing `<dl>` in `<LibraryCollectionShell>`:

```astro
---
import LibraryCollectionShell from "./LibraryCollectionShell.astro";
import { indexAccumulator } from "../lib/pedagogy-index/accumulator";

const { definitions } = indexAccumulator.asPedagogyIndex();
const sorted = [...definitions].sort((a, b) => a.term.localeCompare(b.term));

export interface Props {
  heading?: string;
}
const { heading = "Glossary" } = Astro.props;
---

<LibraryCollectionShell
  collection="glossary"
  heading={heading}
  emptyText="No definitions across the textbook yet."
  isEmpty={sorted.length === 0}
>
  <dl class='sophie-course-glossary' data-sophie-course-glossary=''>
    {sorted.map((entry) => (
      <Fragment>
        <dt id={`gloss-${entry.slug}`}
            class='sophie-course-glossary__term'
            data-section={entry.section_id ?? ""}
            data-unit={entry.unit}
            data-anchor={entry.anchor}>
          {entry.term}
        </dt>
        <dd class='sophie-course-glossary__body'>
          <div set:html={entry.body} />
          <p class='sophie-course-glossary__backlink'>
            defined in{" "}
            <a href={`/units/${entry.unit}/reading#${entry.anchor}`}>
              <code>{entry.unit}</code>
            </a>
          </p>
        </dd>
      </Fragment>
    ))}
  </dl>
</LibraryCollectionShell>
```

Note: `data-section` requires `entry.section_id` — if the schema doesn't carry it yet, add to extractor in Task 4.0 (precursor) or derive from the sections index. Verify before this task.

**Step 3.** Run axe test: expect PASS.

**Step 4.** Run smoke build + visually verify the Glossary room still renders (Playwright MCP optional).

**Step 5.** Commit:

```bash
git commit -m "refactor(W4c): CourseGlossary wraps content in LibraryCollectionShell

Per W4c design doc D2 + D8. Emits data-section/data-unit/data-anchor
on each entry for Tier-2 filter forward-compat. Axe-core sibling
test added per D6. Behavior unchanged; chrome moves to shell."
```

### Task 4.2 — CourseKeyInsights refactor

Mirror Task 4.1 pattern. Same shell wrap + data attrs + axe test.

### Task 4.3 — CourseEquations refactor

Mirror Task 4.1. NOTE: backlink format differs — `/library/equations/<id>/` not `/units/.../reading#anchor` (per ADR 0070 W4a precedent). Preserve.

### Task 4.4 — CourseMisconceptions refactor

Mirror Task 4.1 + preserve the `--short`/`--long` length modifiers.

### Task 4.5 — CourseFigures refactor

Mirror Task 4.1 + preserve the two-tier registry+usage lookup logic + `<ol>` outer element (shell allows `<ol>` in slot per D2).

### Task 4.6 — CourseObjectives docstring update (no shell refactor per D1)

**Files:**
- Modify: `packages/astro/src/components/CourseObjectives.astro` (frontmatter docstring only)

**Step 1.** Add a docstring note explaining the structural exception:

```astro
/**
 * `<CourseObjectives heading="..." />` — ...
 *
 * **W4c shell-extraction exception (per W4c design doc D1):** this
 * component does NOT wrap content in <LibraryCollectionShell>. The
 * 3-level Module → Chapter → Objectives grouping is structurally
 * distinct from the flat-list <dl>/<ol> shape the shell is
 * optimized for. Revisit when a second grouped consumer emerges
 * (e.g., a per-Section practice-set rollup) — at which point shell
 * may grow a grouped-content slot variant.
 */
```

**Step 2.** Add a sibling axe test (`CourseObjectives.axe.test.ts`) verifying the existing 3-level structure has zero violations.

**Step 3.** Commit.

### Task 4.7 — Batch 4 gates + report

Run gates + visually verify all 5 refactored rooms render correctly (Playwright MCP per `feedback_aesthetic_unlocked_prelaunch`). Report. Wait for Anna HITL.

---

## Batch 5 — 3 new CourseX (Observable / Model / Inference)

Each task = one new CourseX from OMIFlowEntry rollup template.

### Task 5.1 — CourseObservables (red)

**Files:**
- Create: `packages/astro/src/components/CourseObservables.astro`
- Create: `packages/astro/src/components/CourseObservables.axe.test.ts`

**Step 1.** Write failing axe test (fixture index with 2 OMIFlowEntries; expect 0 violations + 2 `<dt>` entries with role="observable").

**Step 2.** Implement (use CourseKeyInsights as template; iterate `omiFlows` extracting the `observable` slot):

```astro
---
import LibraryCollectionShell from "./LibraryCollectionShell.astro";
import { indexAccumulator } from "../lib/pedagogy-index/accumulator";

const { omiFlows } = indexAccumulator.asPedagogyIndex();
const sorted = [...omiFlows].sort((a, b) =>
  a.unit !== b.unit ? a.unit.localeCompare(b.unit) : a.anchor.localeCompare(b.anchor)
);

export interface Props { heading?: string; }
const { heading = "Observables" } = Astro.props;
---

<LibraryCollectionShell
  collection="observables"
  heading={heading}
  emptyText="No OMIFlow observable slots across the textbook yet."
  isEmpty={sorted.length === 0}
>
  <dl class='sophie-course-observables' data-sophie-course-observables=''>
    {sorted.map((entry) => (
      <Fragment>
        <dt id={`obs-${entry.anchor}`}
            class='sophie-course-observables__term'
            data-section=""
            data-unit={entry.unit}
            data-anchor={entry.anchor}>
          {entry.observable.title || "Observable"}
        </dt>
        <dd class='sophie-course-observables__body'>
          <div set:html={entry.observable.body} />
          <p class='sophie-course-observables__backlink'>
            in <a href={`/units/${entry.unit}/reading#${entry.anchor}`}>
              <code>{entry.unit}</code>
            </a>
          </p>
        </dd>
      </Fragment>
    ))}
  </dl>
</LibraryCollectionShell>
```

**Step 3.** Commit.

### Task 5.2 — CourseModels

Mirror Task 5.1; change `observable` → `model`, `--observables` → `--models`, etc.

### Task 5.3 — CourseInferences

Mirror.

### Task 5.4 — Batch 5 gates + report

Report. HITL.

---

## Batch 6 — Library hub update (9 rooms with counts)

### Task 6.1 — Update `library/index.astro` (red)

**Files:**
- Modify: `examples/smoke/src/pages/library/index.astro`
- Test: add a smoke fixture exercising the hub (or e2e in Batch 9)

**Step 1.** Identify current 7 rooms shown (6 W4a-era + Topics from W4b).

**Step 2.** Add 3 OMIFlow rooms (Observables / Models / Inferences) to the hub list with counts derived from PedagogyIndex.

**Step 3.** Each tile shows: room name, brief description, count (e.g., "12 entries").

**Step 4.** Commit:

```bash
git commit -m "feat(W4c): Library hub surfaces 9 rooms with counts

Per W4c design doc §1.4. Adds Observables/Models/Inferences tiles
alongside existing 6 W4a-era + Topics. Counts derived from
PedagogyIndex at SSR time."
```

### Task 6.2 — Batch 6 gates + report

---

## Batch 7 — 5 W4a-era Spec routes (TDD)

Each task = one Spec route + axe test.

### Task 7.1 — Equation Spec route with BiographyRender

**Files:**
- Create: `examples/smoke/src/pages/library/equations/[id].astro`
- Create: `examples/smoke/src/pages/library/equations/[id].axe.test.ts` (or under `__tests__/`)

**Step 1.** Write failing axe test (visit `/library/equations/stefan-boltzmann` against smoke fixture; expect rendered title + body + zero violations).

**Step 2.** Implement using `<LibraryCollectionShell collection="equation-spec">` + `<BiographyRender>` + back-link to introducing Unit.

**Step 3.** Commit.

### Task 7.2 — Misconceptions Spec route

### Task 7.3 — Glossary Spec route

### Task 7.4 — Figures Spec route

### Task 7.5 — KeyInsights Spec route (uses derived `slug` from Batch 1)

**Step 1.** Test fixture covers BOTH title-present + title-absent cases (verify URL renders correctly for both).

### Task 7.6 — Batch 7 gates + report

---

## Batch 8 — 3 OMIFlow Spec routes + Topic N5 fix

### Task 8.1 — Observables Spec route

### Task 8.2 — Models Spec route

### Task 8.3 — Inferences Spec route

### Task 8.4 — Topic Spec body render upgrade (N5 fix)

**Files:**
- Modify: `examples/smoke/src/pages/library/topics/[topicId].astro`

**Step 1.** Read current state — verify it only renders card labels (per W4b R+CR N5).

**Step 2.** Extend to render each card's Prompt + Answer body inline. The body data is in the topic MDX AST; reuse the W4b resolver's slot-find helper or re-parse on the Spec page side.

**Step 3.** Add axe test verifying rendered Prompt/Answer have zero violations.

**Step 4.** Commit:

```bash
git commit -m "feat(W4c): Topic Spec page renders card Prompt+Answer body inline

Per W4c design doc D3 (closes W4b R+CR N5). Spec page was rendering
labels only; now lifts SkillReview.Prompt + SkillReview.Answer
slot children from the topic MDX AST into the Spec page render."
```

### Task 8.5 — Batch 8 gates + report

---

## Batch 9 — Smoke fixture extension

### Task 9.1 — Add OMIFlow fixture sufficient for 3 new rollups + Spec pages

**Files:**
- Modify or create: an MDX file in `examples/smoke/src/content/sections/.../units/.../reading.mdx`

**Step 1.** Add 1-2 `<OMIFlow>` blocks with `<OMIFlow.Observable>` + `<OMIFlow.Model>` + `<OMIFlow.Inference>` slot children. Use realistic astrophysics content.

**Step 2.** Verify smoke build still passes + new CourseObservables/Models/Inferences rooms populate + Spec routes exist.

**Step 3.** Commit.

### Task 9.2 — Add untitled-KeyInsight fixture (exercises slug fallback)

**Step 1.** Add a `<KeyInsight>` with no title attribute to an existing reading.mdx.

**Step 2.** Smoke build + verify `/library/key-insights/<unit>-<anchor>/` renders.

**Step 3.** Commit.

### Task 9.3 — Add PRA-2 audit_overrides fixture

**Step 1.** Author a new topic file with intentional frontmatter↔body card mismatch + `audit_overrides` entry that suppresses the resulting PRA-2 finding.

**Step 2.** Smoke build + verify build doesn't fail (override is working).

**Step 3.** Add the override fixture to the smoke audit's expected baseline (audit-baseline.md update in Batch 10).

**Step 4.** Commit.

### Task 9.4 — Batch 9 gates + report

---

## Batch 10 — Docs sweep (per `feedback_docs_no_drift`)

### Task 10.1 — ADR 0070 revision-history entry

**Files:**
- Modify: `docs/website/decisions/0070-library-room-and-registry-spec-pages.md`

**Step 1.** Append a new revision-history entry `### 2026-05-23 — Wedge B-followup W4c: 3 OMIFlow rooms + 8 Spec routes + shell extraction`, covering shell extraction shape, 3 new rooms, 8 Spec routes, KI-slug-unique invariant, and CourseObjectives exception.

**Step 2.** Update the `validation:` block evidence list with the new test files.

**Step 3.** Commit.

### Task 10.2 — ADR 0058 revision-history entry

**Step 1.** Append entry documenting that Observable/Model/Inference rollup chrome shipped via OMIFlow slot derivation; Assumption/Approximation/Numerical remain deferred per §4 composite contract.

**Step 2.** Commit.

### Task 10.3 — ADR 0079 revision-history entry

**Step 1.** Append entry: PRA-2 graduated to honor `audit_overrides` on TopicEntry (mirrors PRA-1 W4b shape); Topic Spec page renders card Prompt/Answer body inline (closes W4b R+CR N5).

**Step 2.** Commit.

### Task 10.4 — chapter-components.md Library section update

**Step 1.** Update the Library section to enumerate all 9 rooms + their Spec page URLs + Topics card-body render mention.

**Step 2.** Commit.

### Task 10.5 — audit-baseline.md updates

**Step 1.** Add row for `KI-slug-unique` invariant.

**Step 2.** Update PRA-2 row: "ERROR; honors `audit_overrides` on TopicEntry per ADR 0053 (W4c graduation)."

**Step 3.** Commit.

### Task 10.6 — validation.md regen

**Step 1.** `pnpm exec tsx scripts/regenerate-validation-index.mts` and stage the regenerated file if it changed.

**Step 2.** Commit (or skip if no diff).

### Task 10.7 — W4c pilot report Shape α

**Files:**
- Create: `docs/website/pilots/wedge-b-followup-w4c-rooms.md`

**Step 1.** Mirror W4b pilot report shape: Pilot context, Shortcode→component dictionary, Migration touchpoint inventory (Layer 1-5), Estimates vs actuals, Doctrine review (W3 R1, W4a R4, R6-R9), Surprises, R+CR findings + resolutions, Handoff (this closes Wedge B-followup; next is ADR-0064 chapter pilot in astr201-sp26/).

**Step 2.** Commit.

### Task 10.8 — Batch 10 gates + report

---

## Batch 11 — Pre-PR gates

### Task 11.1 — Run full gate sequence

```bash
cd /Users/anna/Teaching/sophie/.worktrees/wedge-b-followup-w4c/
pnpm install --frozen-lockfile
pnpm exec biome check 2>&1 | grep -cE "(error|warning)"   # expect 0
pnpm turbo run typecheck --force                          # expect green
pnpm turbo run test --filter='@sophie/*' --force          # expect green
pnpm --filter smoke build                                  # expect green
cd docs/website && npx mystmd build --html 2>&1 | grep -iE "warning|error"  # expect 0
cd ..
pkill -f "astro preview\|astro dev" 2>/dev/null; sleep 1
pnpm exec playwright test                                  # expect all green
```

**Step 2.** If any gate fails: open a fix commit; re-run the failing gate; repeat until green. Do NOT proceed to Batch 12 until all gates pass.

**Step 3.** Report to Anna.

---

## Batch 12 — R+CR follow-up

### Task 12.1 — Run requesting-code-review

Use `superpowers:requesting-code-review` subagent against the diff.

### Task 12.2 — Triage findings

Critical → Important → Minor. Address all Critical + Important via fix commits in this batch. Document Minors in the W4c pilot report's R+CR dispositions table (similar to W4b's 7-row Minor table).

### Task 12.3 — Re-run gates after R+CR fixes

Same gate sequence as Task 11.1.

### Task 12.4 — Request Anna's text confirm for PR open

Per `feedback_no_questions_mode_scope`: explicit per-occurrence confirm.

### Task 12.5 — Open PR (with Anna confirm)

```bash
gh pr create --title "feat(W4c): Wedge B-followup W4c — Library shell + 3 OMIFlow rooms + 8 Spec routes + PRA-2 + audit cleanup" --body "$(cat <<'EOF'
## Summary
- `<LibraryCollectionShell>` extraction + 5 Course* refactor + 3 new CourseX siblings (Observables/Models/Inferences)
- 8 per-entry Spec routes (5 W4a-era + 3 OMIFlow-derived); Topic Spec card-body N5 fix
- `KeyInsightEntry.slug` + `KI-slug-unique` audit
- PRA-2 graduates to honor `audit_overrides` on TopicEntry
- Batch 0 audit cleanup: R6 anchor fixes + R9 NavChapter import + R6–R9 doctrine codified in AGENTS.md
- 18 new `.axe.test.ts` siblings
- Per-entry data-section/data-unit/data-anchor for Tier-2 filter forward-compat
- Closes Wedge B-followup; next milestone is ADR-0064 chapter pilot in astr201-sp26/

## Test plan
- [ ] `pnpm exec biome check` exit 0 + grep 0 warnings
- [ ] `pnpm turbo run typecheck --force` green
- [ ] `pnpm turbo run test --filter='@sophie/*' --force` all green
- [ ] `pnpm --filter smoke build` 16+ pages (new Spec + room URLs)
- [ ] `npx mystmd build --html` clean
- [ ] `pnpm exec playwright test` all green (baseline + W4c specs)
- [ ] axe-core: zero violations on shell + 9 Course* + 8 Spec routes
- [ ] Manual: visit `/library/` and confirm all 9 rooms surface with counts
- [ ] Manual: visit a Spec page per room; verify rendered content
- [ ] Audit: KI-slug-unique catches a deliberate collision fixture
- [ ] Audit: PRA-2 audit_overrides suppresses a deliberate-mismatch fixture
EOF
)"
```

### Task 12.6 — Squash-merge (with Anna confirm)

Per ADR 0055.

### Task 12.7 — Delete branch + worktree

```bash
git branch -d feat/wedge-b-followup-w4c
git worktree remove /Users/anna/Teaching/sophie/.worktrees/wedge-b-followup-w4c/
```

---

## Post-W4c

Wedge B-followup CLOSES. Next milestone is the ADR-0064 chapter pilot in `/Users/anna/Teaching/sophie/astr201-sp26/` — separate session, curriculum-side work.
