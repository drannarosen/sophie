# A8 `<OMIFlow>` v1 implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to walk this plan task-by-task. Follow `superpowers:test-driven-development` for every code change (RED → GREEN → REFACTOR) and `superpowers:verification-before-completion` before any merge claim. Lands as **3 PRs in sequence** (PR-A → PR-B → PR-C). Anna's text confirmation required before each `gh pr merge` per `feedback_no_questions_mode_scope`.

**Goal:** Ship the A8 `<OMIFlow>` composite pedagogy primitive — three slots (Observable / Model / Inference) that demonstrate ADR 0058's eight-role epistemic contract end-to-end. Pure layout v1; no linked-rep integration yet.

**Architecture:** Compound-component (`<OMIFlow><OMIFlow.Observable>...</OMIFlow.Observable>...</OMIFlow>`). Slot name binds epistemic role at the schema layer; renderer always emits O → M → I canonical order regardless of source order. New `OMIFlowEntry` shape in the pedagogy index; one entry per call site carrying all three slot bodies. Two new audit invariants (OF-1 source-order WARN, OF-2 chapter-level conformance ERROR).

**Tech Stack:** TypeScript, Zod 4, React 19, Astro 6 + MDX, Vitest, Playwright, Storybook + axe-core, pnpm + Turborepo, Biome.

---

## Working directory

`/Users/anna/Teaching/sophie/`

## Context

A8 was registered in [`vision/features/accepted.md`](../website/vision/features/accepted.md) (§A8) as accepted-pending-ADR on 2026-05-16. The prerequisite ([ADR 0058 — Epistemic Component Contract](../website/decisions/0058-epistemic-component-contract.md)) graduated. The full v1 design was brainstormed + locked 2026-05-19; see [`docs/plans/2026-05-19-omiflow-design.md`](2026-05-19-omiflow-design.md) for the 14 locked decisions + rationale. This file is the executable plan that lands those decisions.

## Pre-flight reads (in this exact order)

1. **`/Users/anna/Teaching/sophie/CLAUDE.md`** — HITL mandate, engineering principles, gate stack conventions.
2. **`docs/plans/2026-05-19-omiflow-design.md`** — the 14 locked design decisions.
3. **`~/.claude/projects/-Users-anna-Teaching-sophie/memory/MEMORY.md`** — Anna's saved feedback. Especially:
   - `feedback_no_questions_mode_scope` — side-effect actions need explicit text confirmation each time
   - `feedback_biome_verification` — check exit code or grep, NEVER tail-only
   - `feedback_docs_no_drift` — docs/code land atomically (ADR 0061 Rule 5)
   - `feedback_validation_dashboard_regen` — any ADR status/validation change needs `pnpm tsx scripts/regenerate-validation-index.mts`
   - `feedback_hitl_mandate`, `feedback_branch_pr_scope`, `feedback_no_backcompat_prelaunch`
4. **`docs/website/decisions/0058-epistemic-component-contract.md`** — the eight-role contract that A8 proves end-to-end
5. **`docs/website/decisions/0038-pedagogy-index-pattern.md`** — the role-aggregation + extractor/accumulator pattern A8 follows
6. **`packages/astro/src/lib/pedagogy-index/extractors/deep-dives.ts`** — closest template extractor (PR-B from 2026-05-19 shipped this; same compound-shape that OMIFlow extends to 3 slots)
7. **`packages/astro/src/lib/pedagogy-index/accumulator.ts`** lines 340-393 (`addMisconceptions` + `addDeepDives`) — accumulator mutation pattern
8. **`packages/components/src/components/Callout/Callout.tsx`** — closest renderer template (compound component with native semantics + ARIA)
9. **`docs/website/reference/audit-baseline.md`** — current audit baseline (0 errors / 16 warnings / 9 infos on smoke)

## Locked engineering principles

- **Per-PR gate stack** (must pass before any PR opens — see Task 0 below):
  ```bash
  pnpm exec biome check . 2>&1 | grep -iE "error|warning|format" || echo CLEAN_BIOME
  pnpm exec turbo run typecheck --output-logs=errors-only
  pnpm --filter @sophie/core exec vitest run --no-coverage
  pnpm --filter @sophie/astro exec vitest run --no-coverage
  pnpm --filter @sophie/components exec vitest run --no-coverage
  pnpm exec turbo run build --filter=@sophie/core --filter=@sophie/astro --filter=@sophie/components --force
  pnpm --filter smoke build --force  # check audit baseline + pedagogy entry count
  pnpm test:e2e
  pnpm lint:loc
  pnpm lint:links
  pnpm lint:status
  pnpm install --frozen-lockfile && echo LOCKFILE_OK
  ```
- **Biome verification**: NEVER trust tail-only output. Either check exit code OR grep full output for `error|warning|format`.
- **No back-compat shims**: hard renames, no shims, drop legacy in the same PR (`feedback_no_backcompat_prelaunch`).
- **HITL mandate**: confirm ADR amendments / architectural decisions in-thread before implementing. Cite ADRs by number.
- **Side-effect confirmation**: `gh pr merge`, `gh workflow run`, `git push origin main` ALL need explicit Anna text confirmation each time (`feedback_no_questions_mode_scope`).
- **Atomic docs**: ADR 0061 Rule 5. Any code rename/reshape that touches docs/website/ or docs/reference updates docs in the SAME PR.
- **TDD discipline**: RED (write failing test) → run → GREEN (minimal impl) → run → REFACTOR if needed → commit. One commit per RED→GREEN cycle when possible.

## Pacing

Total: ~3 days focused (matches the accepted.md low-end estimate). PR-A ~1 day, PR-B ~1.5 days, PR-C ~0.5 day. Mandatory check-in points with Anna:

- **After Task 4** (ADR 0063 draft text written) — Anna reviews voice + Decision section before PR-A opens
- **After Task 14** (PR-A opened) — Anna reviews PR shape; explicit confirmation for `gh pr merge`
- **After Task 21** (component shape decided; Storybook stories drafted) — Anna sanity-checks visual output via local Storybook before VR baselines generate
- **After Task 27** (PR-B opened) — Anna reviews + explicit merge confirmation
- **After Task 32** (PR-C opened) — Anna reviews + explicit merge confirmation

---

# PR-A — schema + extractor + accumulator + audit invariants + ADR 0063

**Branch:** `feat/omiflow-pr-a-schema-extractor-adr`

**Scope:** Index-side primitives. NO component yet. The extractor walks the future `<OMIFlow>` JSX and emits `OMIFlowEntry` rows; the renderer doesn't exist so smoke build produces zero OMIFlow entries (the extractor is a no-op until PR-B lands callsites).

**Why this PR ships first:** index shape + extractor logic + ADR can land independently. PR-B's component work can develop against the locked extractor surface. PR-C's chapter-level invariant binds to the extractor's findings, so the extractor needs to exist first.

## Task 0: Verify clean working tree + branch off main

**Run:**

```bash
cd /Users/anna/Teaching/sophie
git status
git log --oneline -3
git fetch --prune
```

**Expected:** clean working tree; on `main`; up-to-date with `origin/main`. If unclean, STOP and resolve before continuing.

Then:

```bash
git checkout -b feat/omiflow-pr-a-schema-extractor-adr
```

## Task 1: Run gates baseline

**Run** the per-PR gate stack from "Locked engineering principles" above. **Expected:** all green. Smoke audit baseline `0 errors, 16 warnings, 9 infos`. Index entry count `64` (from PR-B / Session 10).

If any gate is dirty on `main`, STOP and surface to Anna before continuing.

## Task 2: Draft ADR 0063 — A8 OMIFlow composite primitive

**Files:** Create `docs/website/decisions/0063-omiflow-composite-primitive.md`.

**Step 2a:** Find the next ADR number. Run:

```bash
ls docs/website/decisions/*.md | grep -oE '00[0-9]{2}' | sort -u | tail -3
```

**Expected:** `0061 0062 ...`. Verify 0063 is unused. If 0063 is taken, use the next available; update all task references accordingly.

**Step 2b:** Write the ADR. Use the existing 0058/0061/0062 frontmatter shape as template:

```markdown
---
date: 2026-05-19T00:00:00.000Z
tags:
  - pedagogy
  - reasoning-os
  - component-contract
  - composite-primitive
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0063: `<OMIFlow>` composite primitive (A8)

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
- **Prerequisite**: [ADR 0058](./0058-epistemic-component-contract.md) (eight-role contract)
- **Sibling-deferred**: [ADR 0059](./0059-linked-representation-state-primitive.md) (linked-rep integration → v2)
:::

## Context

ADR 0058's §"Audit invariant deferred to a later ADR" promised that A8's graduation would carry the OMI-chapter conformance gate (*"every chapter declaring `framing: 'OMI'` reaches all three observable / model / inference roles"*). This ADR is that follow-up. It also graduates the first **composite** pedagogy component built end-to-end on the eight-role contract — three slots, each declaring its role at the slot-component-name layer.

The motivating chapter is ASTR 201 Module 3 (stellar spectra → temperature → composition). The smoke target's `spoiler-alerts.mdx` ships the first synthetic OMIFlow callsite for platform validation in PR-B.

## Decision

`<OMIFlow>` is a compound component with three named slots:

- `<OMIFlow.Observable>` — role: `observable`
- `<OMIFlow.Model>` — role: `model`
- `<OMIFlow.Inference>` — role: `inference`

[Continue with the 14 locked decisions from docs/plans/2026-05-19-omiflow-design.md §"Decisions (locked through this brainstorm)" — render as numbered sections inside Decision. Each decision gets ~1 paragraph of rationale referencing the existing pattern it inherits from.]

## Rationale

[Lead with the three load-bearing arguments:
1. Pure-layout v1 is composable with linked-rep v2 for free
2. Strict-3-slot Zod tuple makes the audit invariant trivially provable
3. Slot-name-binds-role is what makes the eight-role contract legible in MDX]

## Alternatives considered

- **Prop-based**: `<OMIFlow observable={...} model={...} inference={...} />`. Rejected — violates the compound-component pattern locked by `<LearningObjectives>` PR-C4 refactor + CLAUDE.md "AI-authoring-friendly source-component patterns."
- **Liberal slot requirements** (any subset, any count): Rejected — defeats the audit invariant's elegance.
- **Author-overridable role binding** (`<OMIFlow.Observable role="model">`): Rejected — the contract IS the slot binding.
- **Linked-rep integration in v1**: Rejected — doubles the surface area and pulls A11 into A8's critical path. Composable as v2 amendment.

## Consequences

**Easier:**
- ADR 0058's deferred OMI-coherence audit invariant graduates as **OF-2** (chapter-level).
- AI authoring can target OMI chapters with `<OMIFlow>` as a single named primitive.
- ASTR 201 Module 3 (and any future OMI-framed chapter) unlocks a visual OMI surface.
- MultiRep ↔ OMIFlow cross-link via `concept=` becomes possible without locking semantics today.

**Harder:**
- One more component schema + extractor + accumulator slot to maintain. Cost bounded — pattern is identical to misconception/deep-dive shipping in PR-B.

**Triggers:**
- Implementation PR-A (this ADR), PR-B (component + smoke fixture), PR-C (e2e + OF-2 invariant + docs sweep).
- Future: linked-rep amendment after interactive-figures workstream lands.
- Future: A9 `<AssumptionStack>` + A10 `<UncertaintyLens>` inherit the slot-binds-role pattern.

## References

- [ADR 0058](./0058-epistemic-component-contract.md) — eight-role contract
- [ADR 0030](./0030-audience-and-ai-author-model.md) — AI-as-primary-author
- [ADR 0031](./0031-compound-component-layout-primitives.md) — compound-component pattern
- [ADR 0038](./0038-pedagogy-index-pattern.md) — pedagogy index extractor/accumulator pattern
- [ADR 0043](./0043-notation-registry-multirep.md) — Notation Registry (for `concept=` binding)
- [ADR 0061](./0061-ai-optimized-codebase-design.md) — atomic-docs rule (this PR satisfies)
- [docs/plans/2026-05-19-omiflow-design.md](../../plans/2026-05-19-omiflow-design.md) — full 14-decision brainstorm
```

**Step 2c:** Update `vision/features/accepted.md`'s A8 entry — flip Status from "Accepted-pending-ADR" to "Shipped per ADR 0063" + add a one-line back-reference.

**Step 2d:** Update ADR 0058's §"Audit invariant deferred to a later ADR" with a closing note: "Graduated in ADR 0063 as OF-2 (chapter-level conformance)."

**Step 2e:** Update CLAUDE.md's locked-decisions table — add the 0063 row.

**Step 2f:** Verify links:

```bash
pnpm lint:links
```

**Expected:** 0 broken (157+ files scanned).

**Step 2g:** Surface to Anna for voice review (mandatory check-in point per the plan header). Wait for explicit "ADR text looks good; proceed."

## Task 3: Commit Task 2

**Run:**

```bash
git add docs/website/decisions/0063-omiflow-composite-primitive.md \
        docs/website/decisions/0058-epistemic-component-contract.md \
        docs/website/vision/features/accepted.md \
        CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(adr-0063): graduate <OMIFlow> composite primitive (A8)

Locks the 14 v1 design decisions from
docs/plans/2026-05-19-omiflow-design.md. Pure layout v1 (linked-rep
deferred to v2). Compound component with 3 slots; slot-name binds
epistemic role at the schema layer.

Closes ADR 0058's deferred chapter-level audit invariant
(graduates as OF-2 in PR-C of this sequence).

Amends:
- accepted-features A8 → Shipped per ADR 0063
- ADR 0058 §"audit invariant deferred" → graduated note
- CLAUDE.md locked-decisions table → adds 0063 row

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Task 4: TDD — `OMIFlowEntry` schema (RED)

**Files:**
- Create: `packages/core/src/schema/pedagogy-index-entries/omi-flow.ts`
- Modify: `packages/core/src/schema/pedagogy-index-entries/index.ts` (add re-export)
- Modify: `packages/core/src/schema/index.ts` (add root-barrel re-export)
- Modify: `packages/core/src/schema/pedagogy-index.test.ts` (add test block)

**Step 4a:** Add the test block before the closing brace of `pedagogy-index.test.ts`. Use the existing `DeepDiveEntrySchema` describe block as the template (line ~561–636 region).

```typescript
// ADR 0063 §Decision §3-7 — <OMIFlow> entry: strict-3-slot, slot-name
// binds role, optional concept binding.
describe("OMIFlowEntrySchema", () => {
  const validSlot = { title: "x", body: "<p>x</p>" };
  const validOmiFlow = {
    chapter: "spoiler-alerts",
    anchor: "omi-1",
    observable: validSlot,
    model: validSlot,
    inference: validSlot,
  };

  test("accepts the minimal valid shape (no concept binding)", () => {
    expect(OMIFlowEntrySchema.safeParse(validOmiFlow).success).toBe(true);
  });

  test("accepts an entry with concept= binding", () => {
    expect(
      OMIFlowEntrySchema.safeParse({
        ...validOmiFlow,
        concept: "stellar-temperature",
      }).success
    ).toBe(true);
  });

  test("accepts slots with empty titles (untitled slots fall back to role label)", () => {
    expect(
      OMIFlowEntrySchema.safeParse({
        ...validOmiFlow,
        observable: { title: "", body: "<p>x</p>" },
      }).success
    ).toBe(true);
  });

  test("rejects an entry missing chapter", () => {
    const { chapter: _, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing anchor", () => {
    const { anchor: _, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing the observable slot", () => {
    const { observable: _, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing the model slot", () => {
    const { model: _, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing the inference slot", () => {
    const { inference: _, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an empty chapter slug (NonEmptyString)", () => {
    expect(
      OMIFlowEntrySchema.safeParse({ ...validOmiFlow, chapter: "" }).success
    ).toBe(false);
  });

  test("rejects an empty anchor (NonEmptyString)", () => {
    expect(
      OMIFlowEntrySchema.safeParse({ ...validOmiFlow, anchor: "" }).success
    ).toBe(false);
  });
});
```

**Step 4b:** Add import line at top of `pedagogy-index.test.ts` (alphabetical position):

```typescript
  OMIFlowEntrySchema,
```

**Step 4c:** Run test (expect 10 fails — schema not yet exported):

```bash
pnpm --filter @sophie/core exec vitest run --no-coverage src/schema/pedagogy-index.test.ts
```

**Expected:** `Test Files 1 failed (1) | Tests 10 failed | N passed`. Confirms RED.

## Task 5: TDD — `OMIFlowEntry` schema (GREEN)

**Step 5a:** Write the schema. Create `packages/core/src/schema/pedagogy-index-entries/omi-flow.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * A single slot of an `<OMIFlow>` callsite (ADR 0063). Each slot
 * shares the same shape — title (optional, defaults to the role
 * label) and pre-rendered HTML body.
 */
const OMIFlowSlotSchema = z.object({
  /** Optional author-supplied title. Empty string → renderer falls back to the role label. */
  title: z.string(),
  /** Pre-rendered HTML of the slot's children. May be empty. */
  body: z.string(),
});
type OMIFlowSlot = z.infer<typeof OMIFlowSlotSchema>;

/**
 * An `<OMIFlow>` callsite (ADR 0063). Composite primitive that
 * demonstrates the ADR 0058 eight-role contract end-to-end: each
 * slot's role is fixed by the slot component name
 * (`<OMIFlow.Observable>` → `observable`, etc.), not author-
 * overridable.
 *
 * One entry per callsite. The renderer always emits slots in
 * canonical O → M → I order regardless of source order; OF-1
 * audit invariant warns on out-of-order source authoring.
 *
 * `concept` optionally binds the OMIFlow to a Notation Registry
 * concept (ADR 0043) for future MultiRep ↔ OMIFlow cross-links.
 * v1 carries no audit invariant on it.
 */
export const OMIFlowEntrySchema = z.object({
  chapter: Slug,
  anchor: NonEmptyString,
  /** Optional Notation Registry concept binding. */
  concept: z.string().optional(),
  observable: OMIFlowSlotSchema,
  model: OMIFlowSlotSchema,
  inference: OMIFlowSlotSchema,
});
export type OMIFlowEntry = z.infer<typeof OMIFlowEntrySchema>;
export type { OMIFlowSlot };
```

**Step 5b:** Wire the barrel. Edit `packages/core/src/schema/pedagogy-index-entries/index.ts` — add to the export block (alphabetical):

```typescript
export {
  type OMIFlowEntry,
  OMIFlowEntrySchema,
  type OMIFlowSlot,
} from "./omi-flow.ts";
```

**Step 5c:** Wire the root barrel. Edit `packages/core/src/schema/index.ts` — add to the `pedagogy-index-entries` re-export block (alphabetical):

```typescript
  type OMIFlowEntry,
  OMIFlowEntrySchema,
  type OMIFlowSlot,
```

**Step 5d:** Run tests:

```bash
pnpm --filter @sophie/core exec vitest run --no-coverage src/schema/pedagogy-index.test.ts
```

**Expected:** `Tests 10 passed (existing-baseline + 10)`. Confirms GREEN.

## Task 6: Commit Tasks 4-5

```bash
git add packages/core/src/schema/pedagogy-index-entries/ \
        packages/core/src/schema/index.ts \
        packages/core/src/schema/pedagogy-index.test.ts
git commit -m "$(cat <<'EOF'
feat(core): OMIFlowEntry schema (ADR 0063 A8)

Strict-3-slot schema per design doc §3: observable / model /
inference each REQUIRED, exactly one of each. Slot shape shared via
OMIFlowSlotSchema. Optional concept= binding for future MultiRep
cross-link surface (ADR 0043).

10 new tests cover minimal-valid, with-concept, empty-title,
missing-each-of-{chapter,anchor,observable,model,inference}, and
NonEmptyString chapter/anchor.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Task 7: TDD — `PedagogyIndex.omiFlows` collection (RED)

**File:** Modify `packages/core/src/schema/pedagogy-index.test.ts`.

**Step 7a:** Add tests in the `PedagogyIndexSchema` describe block, after the existing `deepDives` tests:

```typescript
  // ADR 0063 (A8) — omiFlows optional with default [].
  test("omiFlows defaults to [] when absent (forward-compat)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.omiFlows).toEqual([]);
    }
  });

  test("accepts a populated omiFlows array", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      omiFlows: [
        {
          chapter: "spoiler-alerts",
          anchor: "omi-stellar-temperature",
          concept: "stellar-temperature",
          observable: { title: "HR diagram", body: "<p>x</p>" },
          model: { title: "Hydrostatic equilibrium", body: "<p>x</p>" },
          inference: { title: "Mass-lifetime relation", body: "<p>x</p>" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.omiFlows).toHaveLength(1);
      expect(result.data.omiFlows[0]?.anchor).toBe("omi-stellar-temperature");
    }
  });
```

**Step 7b:** Run tests (expect 2 fails):

```bash
pnpm --filter @sophie/core exec vitest run --no-coverage src/schema/pedagogy-index.test.ts
```

**Expected:** 2 of the new tests fail (`omiFlows` field doesn't exist on schema).

## Task 8: TDD — `PedagogyIndex.omiFlows` collection (GREEN)

**Files:**
- Modify: `packages/core/src/schema/pedagogy-index.ts`

**Step 8a:** Add import to the `pedagogy-index-entries` block (alphabetical):

```typescript
  OMIFlowEntrySchema,
```

**Step 8b:** Add the field to `PedagogyIndexSchema`. Insert after the existing `deepDives` line:

```typescript
  /**
   * Per-chapter `<OMIFlow>` callsites (ADR 0063). Populated by
   * `extractOMIFlows`. Optional with default `[]` so consumer apps
   * on the pre-A8 path keep working. One entry per callsite carrying
   * all three slot bodies.
   */
  omiFlows: z.array(OMIFlowEntrySchema).readonly().default([]),
```

**Step 8c:** Update the anchor-prefix table comment near the top of `pedagogy-index.ts` — add a new row:

```
 * | Omi flow      | `omi-`  | id > slug(concept) > auto: `omi-${counter}`              |
```

**Step 8d:** Run tests:

```bash
pnpm --filter @sophie/core exec vitest run --no-coverage src/schema/pedagogy-index.test.ts
```

**Expected:** all pass.

**Step 8e:** Run the full @sophie/core suite (regression):

```bash
pnpm --filter @sophie/core exec vitest run --no-coverage
```

**Expected:** all green.

## Task 9: Commit Tasks 7-8

```bash
git add packages/core/src/schema/pedagogy-index.ts packages/core/src/schema/pedagogy-index.test.ts
git commit -m "$(cat <<'EOF'
feat(core): PedagogyIndex.omiFlows collection (ADR 0063 A8)

Adds omiFlows: readonly OMIFlowEntry[] with .default([]) for
forward-compat. Anchor prefix table extended with `omi-` row
(precedence: id > slug(concept) > auto omi-${counter}).

2 new tests (default + populated).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Task 10: TDD — `extractOMIFlows` extractor (RED)

**Files:**
- Create: `packages/astro/src/lib/pedagogy-index/extractors/omi-flow.ts`
- Create: `packages/astro/src/lib/pedagogy-index/extractors/omi-flow.test.ts`
- Modify: `packages/astro/src/lib/pedagogy-index/index.ts` (add re-export)

**Step 10a:** Write the test file. Template from `packages/astro/src/lib/pedagogy-index/extractors/deep-dives.test.ts`:

```typescript
import { beforeEach, describe, expect, test } from "vitest";
import { mdxAside, mdxCallout, mdxFlowEl, para, root } from "../_test-helpers.ts";
import { extractOMIFlows, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

/**
 * Helper: build an <OMIFlow> mdast node with three slot children.
 * Each slot is an <OMIFlow.Observable> / <OMIFlow.Model> /
 * <OMIFlow.Inference> mdxJsxFlowElement.
 */
function omiFlow(
  attrs: Record<string, string>,
  slots: {
    observable?: { attrs?: Record<string, string>; children?: unknown[] };
    model?: { attrs?: Record<string, string>; children?: unknown[] };
    inference?: { attrs?: Record<string, string>; children?: unknown[] };
    /** Pass `["model", "observable", "inference"]` to test source-order tolerance. */
    order?: ReadonlyArray<"observable" | "model" | "inference">;
  } = {}
) {
  const slotChildren: unknown[] = [];
  const order =
    slots.order ?? (["observable", "model", "inference"] as const);
  for (const k of order) {
    const slot = slots[k];
    if (slot === undefined) continue;
    slotChildren.push(
      mdxFlowEl(
        `OMIFlow.${k.charAt(0).toUpperCase()}${k.slice(1)}`,
        slot.attrs ?? {},
        slot.children ?? [para(`${k} body`)]
      )
    );
  }
  return mdxFlowEl("OMIFlow", attrs, slotChildren);
}

describe("extractOMIFlows (pure)", () => {
  test("returns empty for chapters with no <OMIFlow> callsites", () => {
    const tree = root([
      mdxCallout({ variant: "info" }, [para("not an omiflow")]),
    ]);
    expect(extractOMIFlows(tree as never, "ch")).toEqual([]);
  });

  test("emits one entry per <OMIFlow> callsite with all 3 slots populated", () => {
    const tree = root([
      omiFlow(
        { id: "stellar-temp", concept: "stellar-temperature" },
        {
          observable: { attrs: { title: "HR diagram" } },
          model: { attrs: { title: "Hydrostatic equilibrium" } },
          inference: { attrs: { title: "Mass-lifetime" } },
        }
      ),
    ]);
    const entries = extractOMIFlows(tree as never, "spoiler-alerts");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      chapter: "spoiler-alerts",
      anchor: "stellar-temp",
      concept: "stellar-temperature",
      observable: { title: "HR diagram" },
      model: { title: "Hydrostatic equilibrium" },
      inference: { title: "Mass-lifetime" },
    });
    expect(entries[0]?.observable.body).toContain("observable body");
  });

  test("anchor precedence — explicit id wins over concept", () => {
    const tree = root([
      omiFlow({ id: "explicit-id", concept: "stellar-temperature" }),
    ]);
    expect(extractOMIFlows(tree as never, "ch")[0]?.anchor).toBe("explicit-id");
  });

  test("anchor precedence — slug(concept) when no id", () => {
    const tree = root([omiFlow({ concept: "stellar Temperature" })]);
    expect(extractOMIFlows(tree as never, "ch")[0]?.anchor).toBe(
      "omi-stellar-temperature"
    );
  });

  test("anchor fallback — omi-{counter} when neither id nor concept", () => {
    const tree = root([omiFlow({}), omiFlow({})]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("omi-1");
    expect(entries[1]?.anchor).toBe("omi-2");
  });

  test("throws on intra-chapter anchor collisions (OF anchor invariant)", () => {
    const tree = root([
      omiFlow({ id: "dup" }),
      omiFlow({ id: "dup" }),
    ]);
    expect(() => extractOMIFlows(tree as never, "ch")).toThrow(
      /anchor.*collision/i
    );
  });

  test("throws when any of the 3 slots is missing (strict-3 invariant)", () => {
    const tree = root([
      omiFlow({ id: "x" }, { order: ["observable", "model"] }), // missing inference
    ]);
    expect(() => extractOMIFlows(tree as never, "ch")).toThrow(
      /OMIFlow.*missing.*inference/i
    );
  });

  test("throws when a slot appears more than once (exactly-one invariant)", () => {
    const tree = root([
      mdxFlowEl("OMIFlow", { id: "x" }, [
        mdxFlowEl("OMIFlow.Observable", {}, [para("a")]),
        mdxFlowEl("OMIFlow.Observable", {}, [para("b")]),
        mdxFlowEl("OMIFlow.Model", {}, [para("m")]),
        mdxFlowEl("OMIFlow.Inference", {}, [para("i")]),
      ]),
    ]);
    expect(() => extractOMIFlows(tree as never, "ch")).toThrow(
      /OMIFlow.*observable.*more than once/i
    );
  });

  test("accepts slots in non-canonical source order (renderer enforces order)", () => {
    const tree = root([
      omiFlow(
        { id: "x" },
        { order: ["model", "observable", "inference"] }
      ),
    ]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries).toHaveLength(1);
    // Body still extracted correctly per slot kind, regardless of source order.
    expect(entries[0]?.observable.body).toContain("observable");
    expect(entries[0]?.model.body).toContain("model");
    expect(entries[0]?.inference.body).toContain("inference");
  });

  test("emits an OF-1 finding when slots are out of canonical source order", () => {
    const tree = root([
      omiFlow(
        { id: "out-of-order" },
        { order: ["inference", "observable", "model"] }
      ),
    ]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries).toHaveLength(1);
    // The extractor stashes the source order on the entry for the OF-1
    // invariant to consume. (Per design doc #4 + the OF-1 invariant
    // contract — see PR-A Task 13.)
    expect(entries[0]?.sourceOrder).toEqual([
      "inference",
      "observable",
      "model",
    ]);
  });

  test("emits canonical sourceOrder field when slots are in O→M→I source order", () => {
    const tree = root([omiFlow({ id: "x" })]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries[0]?.sourceOrder).toEqual([
      "observable",
      "model",
      "inference",
    ]);
  });
});
```

**Step 10b:** Run tests:

```bash
pnpm --filter @sophie/astro exec vitest run --no-coverage src/lib/pedagogy-index/extractors/omi-flow.test.ts
```

**Expected:** all 11 tests fail (module-not-found on `extractOMIFlows`).

## Task 11: Update OMIFlowEntrySchema to include `sourceOrder` field

The OF-1 invariant needs the source order of slots stashed on the entry. Extend the schema.

**Step 11a:** Edit `packages/core/src/schema/pedagogy-index-entries/omi-flow.ts`. Add to `OMIFlowEntrySchema`:

```typescript
  /**
   * As-authored slot order (for OF-1 audit). The renderer always
   * emits canonical O → M → I regardless; OF-1 warns when this
   * field is not `["observable", "model", "inference"]`.
   */
  sourceOrder: z.tuple([
    z.enum(["observable", "model", "inference"]),
    z.enum(["observable", "model", "inference"]),
    z.enum(["observable", "model", "inference"]),
  ]),
```

**Step 11b:** Update the `validOmiFlow` fixture in `pedagogy-index.test.ts` to include `sourceOrder: ["observable", "model", "inference"]`. Re-run schema tests:

```bash
pnpm --filter @sophie/core exec vitest run --no-coverage src/schema/pedagogy-index.test.ts
```

**Expected:** all pass.

## Task 12: TDD — `extractOMIFlows` (GREEN)

**Step 12a:** Write the extractor at `packages/astro/src/lib/pedagogy-index/extractors/omi-flow.ts`. Template: closely mirror `deep-dives.ts` (3-slot variant). Key shape:

```typescript
import {
  type OMIFlowEntry,
  type OMIFlowSlot,
  slugify,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  type MdxJsxFlowElement,
  readStringAttr,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

type SlotKind = "observable" | "model" | "inference";

const SLOT_NAMES: Record<string, SlotKind> = {
  "OMIFlow.Observable": "observable",
  "OMIFlow.Model": "model",
  "OMIFlow.Inference": "inference",
};

/**
 * Pure extractor. Walks an mdast tree, emits one OMIFlowEntry per
 * `<OMIFlow>` flow element. Per ADR 0063:
 *
 *   - Strict-3-slot invariant: each <OMIFlow> MUST contain exactly
 *     one of each slot kind (observable / model / inference).
 *     Throws on missing or duplicated slots.
 *   - Slot-name binds role: <OMIFlow.Observable> → observable.
 *   - Source-order tolerance: any source order accepted; entry
 *     records the as-authored order in `sourceOrder` for OF-1.
 *   - Anchor precedence: id > slug(concept) > omi-${counter}.
 *   - Intra-chapter anchor collision throw.
 */
export function extractOMIFlows(
  tree: Root,
  chapterSlug: string
): OMIFlowEntry[] {
  const out: OMIFlowEntry[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "OMIFlow") return;

    counter += 1;

    // 1. Anchor derivation.
    const explicitId = readStringAttr(el, "id");
    const concept = readStringAttr(el, "concept");
    const anchor = explicitId
      ? slugify(explicitId)
      : concept
        ? `omi-${slugify(concept)}`
        : `omi-${counter}`;

    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${chapterSlug}": OMIFlow anchor "${anchor}" generated by more than one source. (ADR 0063 anchor invariant.)`
      );
    }
    seenAnchors.add(anchor);

    // 2. Slot detection + order capture + strict-3 invariant.
    const sourceOrder: SlotKind[] = [];
    const slots: Partial<Record<SlotKind, OMIFlowSlot>> = {};
    for (const child of el.children ?? []) {
      const childEl = child as MdxJsxFlowElement;
      if (childEl.type !== "mdxJsxFlowElement") continue;
      const kind = childEl.name ? SLOT_NAMES[childEl.name] : undefined;
      if (kind === undefined) continue; // skip stray non-slot JSX
      if (slots[kind] !== undefined) {
        throw new Error(
          `OMIFlow "${anchor}" in chapter "${chapterSlug}": slot "${kind}" appears more than once. (ADR 0063 exactly-one invariant.)`
        );
      }
      const title = readStringAttr(childEl, "title") ?? "";
      const body = renderChildrenToHtml(childEl.children);
      slots[kind] = { title, body };
      sourceOrder.push(kind);
    }

    for (const required of ["observable", "model", "inference"] as const) {
      if (slots[required] === undefined) {
        throw new Error(
          `OMIFlow "${anchor}" in chapter "${chapterSlug}": missing required slot "${required}". (ADR 0063 strict-3 invariant.)`
        );
      }
    }

    out.push({
      chapter: chapterSlug,
      anchor,
      ...(concept ? { concept } : {}),
      observable: slots.observable!,
      model: slots.model!,
      inference: slots.inference!,
      sourceOrder: sourceOrder as [SlotKind, SlotKind, SlotKind],
    });
  });

  return out;
}
```

**Step 12b:** Wire into the pedagogy-index barrel. Edit `packages/astro/src/lib/pedagogy-index/index.ts`:

```typescript
export { extractOMIFlows } from "./extractors/omi-flow.ts";
```

(Insert alphabetically — after `extractObjectives`, before `markFirstUseGlossaryTerms`.)

**Step 12c:** Run tests:

```bash
pnpm --filter @sophie/astro exec vitest run --no-coverage src/lib/pedagogy-index/extractors/omi-flow.test.ts
```

**Expected:** all 11 pass.

## Task 13: Commit Tasks 10-12

```bash
git add packages/astro/src/lib/pedagogy-index/extractors/ \
        packages/astro/src/lib/pedagogy-index/index.ts \
        packages/core/src/schema/pedagogy-index-entries/omi-flow.ts \
        packages/core/src/schema/pedagogy-index.test.ts
git commit -m "$(cat <<'EOF'
feat(astro): extractOMIFlows extractor + OMIFlowEntry.sourceOrder (ADR 0063 A8)

Pure mdast walker. Emits one OMIFlowEntry per <OMIFlow> callsite
with strict-3-slot validation (throws on missing/duplicated slots),
slot-name-binds-role binding, and source-order capture for OF-1.

11 tests covering: empty, basic emission, anchor precedence chain
(id > slug(concept) > omi-counter), intra-chapter collision,
strict-3 (missing slot throw), exactly-one (duplicate slot throw),
source-order tolerance, sourceOrder field for OF-1 invariant.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Task 14: TDD — `addOMIFlows` accumulator (RED + GREEN + commit)

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index/accumulator.ts`
- Modify: `packages/astro/src/lib/pedagogy-index/accumulator.test.ts`

**Step 14a:** Write failing tests at the end of `accumulator.test.ts` (template from the `deepDives` describe block at the bottom):

```typescript
describe("indexAccumulator omiFlows (cross-chapter)", () => {
  const slot = { title: "x", body: "<p>x</p>" };
  const omi = (overrides: Partial<OMIFlowEntry> = {}): OMIFlowEntry => ({
    chapter: "omi-ch-a",
    anchor: "default-anchor",
    observable: slot,
    model: slot,
    inference: slot,
    sourceOrder: ["observable", "model", "inference"] as const,
    ...overrides,
  });

  test("addOMIFlows populates collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addOMIFlows([
      omi({ chapter: "omi-pop-a", anchor: "alpha" }),
      omi({ chapter: "omi-pop-b", anchor: "beta" }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    const anchors = index.omiFlows
      .filter((e) => e.chapter === "omi-pop-a" || e.chapter === "omi-pop-b")
      .map((e) => e.anchor)
      .sort();
    expect(anchors).toEqual(["alpha", "beta"]);
  });

  test("OF — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addOMIFlows([omi({ chapter: "ch-a", anchor: "shared" })]);
    expect(() =>
      indexAccumulator.addOMIFlows([omi({ chapter: "ch-b", anchor: "shared" })])
    ).toThrow(/cross-chapter.*OMIFlow/i);
  });

  test("OF — auto-anchors (omi-N) do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addOMIFlows([omi({ chapter: "auto-a", anchor: "omi-1" })]);
    expect(() =>
      indexAccumulator.addOMIFlows([omi({ chapter: "auto-b", anchor: "omi-1" })])
    ).not.toThrow();
  });

  test("clearChapter drops OMIFlow entries for the chapter", () => {
    indexAccumulator.addOMIFlows([
      omi({ chapter: "clr-a", anchor: "a-entry" }),
      omi({ chapter: "clr-b", anchor: "b-entry" }),
    ]);
    indexAccumulator.clearChapter("clr-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.omiFlows.filter((e) => e.chapter === "clr-a")).toHaveLength(0);
    expect(index.omiFlows.filter((e) => e.chapter === "clr-b")).toHaveLength(1);
  });
});
```

**Step 14b:** Add `OMIFlowEntry` import at the top of `accumulator.test.ts` (alphabetical, after `ObjectiveEntry`):

```typescript
  OMIFlowEntry,
```

**Step 14c:** Run tests (expect 4 fails):

```bash
pnpm --filter @sophie/astro exec vitest run --no-coverage src/lib/pedagogy-index/accumulator.test.ts
```

**Step 14d:** Wire the accumulator. Edit `packages/astro/src/lib/pedagogy-index/accumulator.ts`:

1. Add `OMIFlowEntry` to the top import block (alphabetical).
2. Add to `GlobalIndexState`:
   ```typescript
     /**
      * Per-chapter <OMIFlow> callsites (ADR 0063). Keyed by
      * `${chapter}#${anchor}`. The-more-you-know parallel applies:
      * one entry per callsite, no separate per-slot rows.
      */
     omiFlows: Map<string, OMIFlowEntry>;
   ```
3. Add `omiFlows: new Map(),` to the `getGlobalState` initialization.
4. Add to `clearChapter` (after the `deepDives` block):
   ```typescript
       for (const [key, entry] of state.omiFlows) {
         if (entry.chapter === chapterSlug) {
           state.omiFlows.delete(key);
         }
       }
   ```
5. Add `addOMIFlows` method (template from `addDeepDives`):
   ```typescript
     /**
      * Add a chapter's extracted <OMIFlow> callsites. OF-cross-chapter:
      * explicit-id-derived anchors must be unique across chapters.
      * Auto-anchors (`omi-${N}`) are chapter-scoped (each chapter
      * restarts its counter at 1) and NOT subject to the check.
      *
      * Two-pass validate-then-mutate mirrors addDeepDives.
      */
     addOMIFlows(entries: ReadonlyArray<OMIFlowEntry>): void {
       const state = getGlobalState();
       for (const entry of entries) {
         if (/^omi-\d+$/.test(entry.anchor)) continue;
         for (const existing of state.omiFlows.values()) {
           if (
             existing.chapter !== entry.chapter &&
             existing.anchor === entry.anchor
           ) {
             throw new Error(
               `OMIFlow anchor "${entry.anchor}" defined in multiple chapters: "${existing.chapter}" and "${entry.chapter}". (Cross-chapter OMIFlow invariant.) Resolution: change one of the \`id\` props.`
             );
           }
         }
       }
       for (const entry of entries) {
         state.omiFlows.set(`${entry.chapter}#${entry.anchor}`, entry);
       }
     }
   ```
6. Add to `asPedagogyIndex` return (after `deepDives`):
   ```typescript
         omiFlows: Array.from(state.omiFlows.values()),
   ```
7. Add to `resetIndexAccumulator` (after the `state.deepDives.clear()` line):
   ```typescript
     state.omiFlows.clear();
   ```

**Step 14e:** Run tests:

```bash
pnpm --filter @sophie/astro exec vitest run --no-coverage src/lib/pedagogy-index/accumulator.test.ts
```

**Expected:** all pass.

**Step 14f:** Commit:

```bash
git add packages/astro/src/lib/pedagogy-index/accumulator.ts packages/astro/src/lib/pedagogy-index/accumulator.test.ts
git commit -m "$(cat <<'EOF'
feat(astro): accumulator tracks omiFlows (ADR 0063 A8)

GlobalIndexState gains omiFlows Map; addOMIFlows mirrors
addDeepDives shape (cross-chapter slug collision check for
explicit-id anchors only; auto omi-N anchors are chapter-scoped).
clearChapter + asPedagogyIndex + resetIndexAccumulator wired.

4 new accumulator tests (populate, cross-chapter collision, auto-
anchor exception, clearChapter filter).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Task 15: Wire orchestrator + audit invariants OF-1 (RED + GREEN + commit)

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index/orchestrator.ts`
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/omi-flow.ts`
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/omi-flow.test.ts`
- Modify: `packages/astro/src/lib/pedagogy-audit/runner.ts` (wire invariant into runPedagogyAudit)
- Modify: `packages/astro/src/lib/pedagogy-audit/runner.test.ts` (fixture: add `omiFlows: []` for newly-required-field compat)

**Step 15a:** Orchestrator wiring (single line in the chapter pass; alphabetical with the existing `extractDeepDives` call):

```typescript
    indexAccumulator.addOMIFlows(extractOMIFlows(tree, chapterSlug));
```

Add the import at the top alphabetically:

```typescript
import { extractOMIFlows } from "./extractors/omi-flow.ts";
```

**Step 15b:** OF-1 invariant test file (RED):

```typescript
import { describe, expect, test } from "vitest";
import type { OMIFlowEntry } from "@sophie/core/schema";
import { runOMIFlowSourceOrderInvariant } from "./omi-flow.ts";

const slot = { title: "", body: "" };
const baseEntry: OMIFlowEntry = {
  chapter: "ch",
  anchor: "x",
  observable: slot,
  model: slot,
  inference: slot,
  sourceOrder: ["observable", "model", "inference"],
};

describe("OF-1 — OMIFlow slots out of canonical source order (WARN)", () => {
  test("emits no findings when all entries are in canonical O→M→I order", () => {
    expect(runOMIFlowSourceOrderInvariant([baseEntry])).toEqual([]);
  });

  test("emits one WARN finding per out-of-order entry", () => {
    const out = runOMIFlowSourceOrderInvariant([
      {
        ...baseEntry,
        anchor: "ooo",
        sourceOrder: ["model", "observable", "inference"],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      code: "OF-1",
      severity: "warning",
      chapter: "ch",
      anchor: "ooo",
    });
    expect(out[0]?.message).toMatch(/source order/i);
    expect(out[0]?.message).toMatch(/model.*observable.*inference/i);
  });

  test("does not WARN entries with canonical order even alongside out-of-order entries", () => {
    const out = runOMIFlowSourceOrderInvariant([
      baseEntry,
      {
        ...baseEntry,
        anchor: "ooo",
        sourceOrder: ["inference", "model", "observable"],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.anchor).toBe("ooo");
  });
});
```

**Step 15c:** Run tests (expect 3 fails on module-not-found):

```bash
pnpm --filter @sophie/astro exec vitest run --no-coverage src/lib/pedagogy-audit/invariants/omi-flow.test.ts
```

**Step 15d:** Implement `omi-flow.ts` invariant:

```typescript
import type { AuditFinding, OMIFlowEntry } from "@sophie/core/schema";

const CANONICAL_ORDER = ["observable", "model", "inference"] as const;

/**
 * OF-1 (WARN per ADR 0063): if an <OMIFlow> callsite's slot source
 * order differs from canonical O→M→I, emit a warning. Renderer
 * always emits canonical order; the warning surfaces likely-typo
 * or mid-refactor source state.
 */
export function runOMIFlowSourceOrderInvariant(
  entries: ReadonlyArray<OMIFlowEntry>
): AuditFinding[] {
  const out: AuditFinding[] = [];
  for (const entry of entries) {
    const matches = CANONICAL_ORDER.every(
      (k, i) => entry.sourceOrder[i] === k
    );
    if (matches) continue;
    out.push({
      code: "OF-1",
      severity: "warning",
      chapter: entry.chapter,
      anchor: entry.anchor,
      message: `OF-1: OMIFlow "${entry.anchor}" in chapter "${entry.chapter}" — slots authored in source order [${entry.sourceOrder.join(", ")}]. Renderer emits canonical observable → model → inference; this warning flags a likely typo or mid-refactor state.`,
    });
  }
  return out;
}
```

**Step 15e:** Run tests:

```bash
pnpm --filter @sophie/astro exec vitest run --no-coverage src/lib/pedagogy-audit/invariants/omi-flow.test.ts
```

**Expected:** all 3 pass.

**Step 15f:** Wire OF-1 into `runPedagogyAudit`. In `packages/astro/src/lib/pedagogy-audit/runner.ts`, find the spot where other invariants are called (search for `runMisconception` or similar), and add:

```typescript
import { runOMIFlowSourceOrderInvariant } from "./invariants/omi-flow.ts";
// ...inside runPedagogyAudit:
findings.push(...runOMIFlowSourceOrderInvariant(index.omiFlows));
```

**Step 15g:** Fix any runner.test.ts fixtures that have a hand-crafted `PedagogyIndex` literal — they now need `omiFlows: []`. Apply the same pattern as the `deepDives: []` updates in PR-B (from 2026-05-19). Run:

```bash
pnpm exec turbo run typecheck --output-logs=errors-only
```

**Expected:** 11/11 packages typecheck. If `Property 'omiFlows' is missing` errors fire on fixtures, sed-add:

```bash
for f in packages/astro/src/lib/pedagogy-audit/composition.test.ts \
         packages/astro/src/lib/pedagogy-audit/runner.test.ts \
         packages/astro/src/lib/pedagogy-audit/invariants/{biography,equation-registry,interventions,multirep}.test.ts \
         packages/astro/src/lib/validation/index-{generator,writer,generator.integration}.test.ts \
         packages/astro/src/lib/audit-cache.test.ts; do
  if ! grep -q "omiFlows:" "$f"; then
    sed -i.bak 's/deepDives: \[\],/deepDives: [],\n    omiFlows: [],/' "$f"
    rm "$f.bak"
  fi
done
pnpm exec biome format --write packages/astro/src/lib/pedagogy-audit/ packages/astro/src/lib/validation/ packages/astro/src/lib/audit-cache.test.ts
```

(Adjust the indentation in the sed string to match each file's current spacing.)

Re-run typecheck; expect 11/11.

**Step 15h:** Run full @sophie/astro suite:

```bash
pnpm --filter @sophie/astro exec vitest run --no-coverage
```

**Expected:** all green (706 baseline + N new tests).

**Step 15i:** Smoke build — the OMIFlow extractor walks but produces 0 entries (no callsites yet), so audit baseline unchanged:

```bash
pnpm exec turbo run build --filter=@sophie/core --filter=@sophie/astro --force --output-logs=errors-only
pnpm --filter smoke build --force 2>&1 | grep -aE "audit:|entries"
```

**Expected:** `Pedagogy audit: 0 errors, 16 warnings, 9 infos` + `64 pedagogy entries` (unchanged).

**Step 15j:** Commit:

```bash
git add packages/astro/src/lib/pedagogy-index/orchestrator.ts \
        packages/astro/src/lib/pedagogy-audit/invariants/omi-flow.ts \
        packages/astro/src/lib/pedagogy-audit/invariants/omi-flow.test.ts \
        packages/astro/src/lib/pedagogy-audit/runner.ts \
        packages/astro/src/lib/pedagogy-audit/runner.test.ts \
        packages/astro/src/lib/pedagogy-audit/composition.test.ts \
        packages/astro/src/lib/pedagogy-audit/invariants/biography.test.ts \
        packages/astro/src/lib/pedagogy-audit/invariants/equation-registry.test.ts \
        packages/astro/src/lib/pedagogy-audit/invariants/interventions.test.ts \
        packages/astro/src/lib/pedagogy-audit/invariants/multirep.test.ts \
        packages/astro/src/lib/validation/index-generator.test.ts \
        packages/astro/src/lib/validation/index-generator.integration.test.ts \
        packages/astro/src/lib/validation/index-writer.test.ts \
        packages/astro/src/lib/audit-cache.test.ts
git commit -m "$(cat <<'EOF'
feat(astro): orchestrator + OF-1 audit invariant (ADR 0063 A8)

Orchestrator chapter-pass adds addOMIFlows(extractOMIFlows(...)).
OF-1 invariant (WARN): OMIFlow callsites whose slot source order
differs from canonical O→M→I. Renderer always emits canonical
order; OF-1 flags likely typo / mid-refactor source state.

OF-2 (chapter-level conformance ERROR for framing:'OMI' chapters)
lands in PR-C alongside the smoke chapter migration; that's where
the trigger fires in practice.

Fixture sweep: 9 hand-crafted PedagogyIndex test fixtures gain
omiFlows: [] to satisfy the now-required field.

@sophie/astro 706 → N tests (3 new OF-1 + 4 new accumulator).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Task 16: Regenerate validation dashboard

Per `feedback_validation_dashboard_regen`: ADR 0063 status frontmatter change requires dashboard regen.

```bash
pnpm tsx scripts/regenerate-validation-index.mts
git add docs/website/status/validation.md
git commit -m "chore(docs): regenerate validation dashboard for ADR 0063"
```

## Task 17: Full gate stack (per feedback_biome_verification rigor)

```bash
pnpm exec biome check . 2>&1 | grep -iE "error|warning|format" || echo CLEAN_BIOME
pnpm exec turbo run typecheck --output-logs=errors-only
pnpm --filter @sophie/core exec vitest run --no-coverage
pnpm --filter @sophie/astro exec vitest run --no-coverage
pnpm --filter @sophie/components exec vitest run --no-coverage
pnpm exec turbo run build --filter=@sophie/core --filter=@sophie/astro --filter=@sophie/components --force
pnpm --filter smoke build --force 2>&1 | grep -aE "audit:|entries"
pnpm test:e2e
pnpm lint:loc
pnpm lint:links
pnpm lint:status
pnpm install --frozen-lockfile && echo LOCKFILE_OK
```

**Expected:** all green. Smoke audit `0/16/9`, entry count `64`. e2e `152/152`.

## Task 18: Push + open PR-A

```bash
git push -u origin feat/omiflow-pr-a-schema-extractor-adr
gh pr create --title "feat(core+astro): A8 <OMIFlow> schema + extractor + OF-1 invariant + ADR 0063 (PR-A)" --body "$(cat <<'EOF'
## Summary

PR-A of 3 for A8 \`<OMIFlow>\` composite primitive graduation (per [ADR 0063](docs/website/decisions/0063-omiflow-composite-primitive.md), brainstormed at [docs/plans/2026-05-19-omiflow-design.md](docs/plans/2026-05-19-omiflow-design.md)).

**Index-side primitives. No component yet** — extractor walks the future \`<OMIFlow>\` JSX and emits entries; renderer doesn't exist so smoke build produces 0 OMIFlow entries (audit baseline unchanged).

## Ships

- ADR 0063 + ADR 0058 graduated-invariant note + accepted-features A8 status flip + CLAUDE.md locked-decisions row
- \`OMIFlowEntrySchema\` (with \`sourceOrder\` tuple field for OF-1) in @sophie/core
- \`PedagogyIndex.omiFlows\` collection with \`.default([])\`
- \`extractOMIFlows\` extractor: strict-3-slot, slot-name-binds-role, source-order capture
- \`addOMIFlows\` accumulator method with cross-chapter explicit-id collision check
- \`OF-1\` audit invariant (WARN): non-canonical source order
- Orchestrator wired
- 9 fixture files updated with \`omiFlows: []\`
- Validation dashboard regenerated

## Defers to PR-B / PR-C

- \`<OMIFlow>\` React component + Storybook stories + axe + VR baselines (PR-B)
- Smoke chapter migration (PR-B)
- \`OF-2\` audit invariant (chapter-level conformance for \`framing: 'OMI'\`) (PR-C)
- e2e per-OMIFlow existence loop (PR-C)

## Gates

[Paste the gate-stack output here.]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Wait for CI green** before requesting merge confirmation from Anna.

## Task 19: Anna's merge confirmation + merge

Request explicit text confirmation: "PR-A CI green; may I run \`gh pr merge <PR#> --squash --delete-branch\`?"

After Anna confirms, run the merge. Then:

```bash
git checkout main
git pull --ff-only origin main
```

# PR-B — `<OMIFlow>` component + stories + axe + VR + smoke fixture

**Branch:** `feat/omiflow-pr-b-component-stories-smoke`

## Task 20: Branch + baseline gates

```bash
git checkout -b feat/omiflow-pr-b-component-stories-smoke
```

Run the gate stack (Task 1 form). Expected: all green; audit `0/16/9`; entry count `64`.

## Task 21: TDD — `<OMIFlow>` component (RED + GREEN + commit)

**Files:**
- Create: `packages/components/src/components/OMIFlow/OMIFlow.tsx`
- Create: `packages/components/src/components/OMIFlow/OMIFlow.schema.ts`
- Create: `packages/components/src/components/OMIFlow/OMIFlow.module.css`
- Create: `packages/components/src/components/OMIFlow/OMIFlow.contract.ts`
- Create: `packages/components/src/components/OMIFlow/OMIFlow.test.tsx`
- Create: `packages/components/src/components/OMIFlow/OMIFlow.stories.tsx`
- Create: `packages/components/src/components/OMIFlow/index.ts`
- Modify: `packages/components/src/index.ts` (add export)

**Step 21a:** Test file (RED). Template from `Callout.test.tsx`. Cover:
- Renders outer `<div role="group" aria-labelledby={...}>`
- Renders three `<section>` children with `aria-labelledby` matching slot title spans
- Slot titles default to role label when no `title=`
- Slot titles prepend role label when `title=` provided ("Observable: H-alpha line")
- Renders slots in canonical O→M→I order even when source order is M-O-I
- Axe-clean for all 3 slot configurations

**Step 21b:** Schema. Use Zod for prop validation. Each slot is a React component that uses `OMIFlowSlotPropsSchema { title?: string; children: ReactNode }`. Root `<OMIFlow>` uses `OMIFlowPropsSchema { id?: string; concept?: string; children: ReactNode }`. NOTE: per the design doc, slot order tolerance is renderer-enforced; the schema doesn't gate it (it's an audit-time WARN, not a build-time error).

**Step 21c:** Implementation. Compound component with static slot properties:

```tsx
export function OMIFlow({ id, concept, children }: OMIFlowProps) {
  const titleId = useId();
  // Split children by component type into the three slot buckets.
  // Render in canonical O→M→I order regardless of source order.
  // ...
}
OMIFlow.Observable = OMIFlowSlot.bind(null, "observable");
OMIFlow.Model = OMIFlowSlot.bind(null, "model");
OMIFlow.Inference = OMIFlowSlot.bind(null, "inference");
```

(Bind-based slot pattern keeps the slot components stable across renders; React DevTools-friendly.)

**Step 21d:** CSS — flat 3-panel grid with chevron between (per design doc #2). Mobile: `@media (max-width: 768px)` stacks vertical with `↓` chevron. Print: same vertical stack. Use existing token vocabulary (`--sophie-callout-*-title-bg`, `--sophie-border`, `--sophie-radius-sm`).

**Step 21e:** Stories (5):
1. `Minimal` — bare 3 slots with sample prose
2. `WithConcept` — `concept="stellar-temperature"` set
3. `WithRichContent` — each slot contains `<Figure>` / `<KeyEquation>` / prose
4. `OutOfSourceOrder` — slots authored M→O→I, asserts canonical render
5. `LongTitles` — each slot has a long title to test wrap behavior

**Step 21f:** Verify component tests + axe pass:

```bash
pnpm --filter @sophie/components exec vitest run --no-coverage src/components/OMIFlow/OMIFlow.test.tsx
```

**Step 21g:** Local Storybook for visual sanity check (mandatory Anna check-in point):

```bash
pnpm --filter @sophie/components storybook
# Open http://localhost:6006/?path=/story/components-omiflow--minimal
```

Anna reviews + greenlights visual output before VR baselines write.

**Step 21h:** Commit.

## Task 22: Generate VR baselines via vr-update workflow

Per [PR #132's vr-update pattern](https://github.com/drannarosen/sophie/pull/132):

```bash
git push -u origin feat/omiflow-pr-b-component-stories-smoke
gh workflow run vr-update.yml -f branch=feat/omiflow-pr-b-component-stories-smoke
```

**Wait for** the workflow's auto-commit. Verify the new VR baselines for the 5 OMIFlow stories (light + dark = 10 PNGs) landed. Pull locally:

```bash
git pull origin feat/omiflow-pr-b-component-stories-smoke
ls packages/components/__snapshots__/chromium/ | grep -i omiflow
```

## Task 23: Smoke chapter fixture (OMIFlow callsite)

**File:** `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx` (or a new chapter — author's call; smaller change is to add one callsite to spoiler-alerts).

**Step 23a:** Pick a section of spoiler-alerts that maps to an OMI arc. Likely candidate: the "What we observe → physics → what it tells us" passage about stellar spectra (which already exists in deep-dive form). Convert one prose-only OMI arc into an explicit `<OMIFlow>` callsite.

**Step 23b:** Add to the chapter's MDX imports if needed:

```mdx
import { OMIFlow } from "@sophie/components";
```

**Step 23c:** Rebuild smoke + verify index dump grows:

```bash
pnpm exec turbo run build --filter=@sophie/astro --force --output-logs=errors-only
pnpm --filter smoke build --force 2>&1 | grep -aE "audit:|entries"
jq '.omiFlows | length, (.omiFlows[] | {chapter, anchor, concept})' examples/smoke/dist/.sophie-pedagogy-index.json
```

**Expected:**
- Audit baseline: `0 errors, 16 warnings, 9 infos` (unchanged — no OF-2 yet)
- Entry count: `65` (was 64, +1 OMIFlow)
- JQ output: 1 entry with the new callsite's chapter / anchor / concept

**Step 23d:** Optional OF-1 trigger test — temporarily reorder slots in the fixture to verify OF-1 fires in the smoke build:

```bash
pnpm --filter smoke build --force 2>&1 | grep "OF-1"
```

Then restore canonical order. **Don't ship the OF-1-triggering fixture; verify-and-revert only.**

**Step 23e:** Update `docs/website/reference/audit-baseline.md` if anything in the baseline truly changed (typically nothing — OMIFlow doesn't change the warning/info count yet).

**Step 23f:** Commit.

## Task 24: Update smoke pedagogy-index-dump count

Edit `examples/smoke/integrations/pedagogy-index-dump.ts` — add `+ index.omiFlows.length` to the total sum (mirrors the deepDives addition in PR-B from 2026-05-19).

Verify:

```bash
pnpm --filter smoke build --force 2>&1 | grep "entries"
```

Expected: `(65 pedagogy entries)`.

Commit.

## Task 25: Full gate stack + push + open PR-B

(Same as Task 17–18 form.) PR title: `feat(components): A8 <OMIFlow> component + stories + smoke fixture (PR-B)`.

PR body must call out:
- VR baselines auto-generated via vr-update workflow on this branch
- Smoke audit baseline unchanged; entry count 64→65
- Component-side axe coverage included
- Mobile + print stacking validated visually

## Task 26: Anna's merge confirmation + merge + sync main

Request explicit text confirmation. After merge:

```bash
git checkout main && git pull --ff-only origin main
```

# PR-C — e2e + OF-2 audit invariant + docs sweep

**Branch:** `feat/omiflow-pr-c-e2e-of2-docs`

## Task 27: Branch + baseline + design the OF-2 invariant

OF-2 fires when a chapter declares `framing: 'OMI'` but renders zero `<OMIFlow>` callsites. Today no smoke chapter declares `framing: 'OMI'`. To exercise OF-2 in CI, either:

**(a)** Add `framing: 'OMI'` to spoiler-alerts.mdx's frontmatter (which already has an OMIFlow from PR-B). OF-2 is then trivially satisfied for the smoke chapter.

**(b)** Add a new fixture chapter with `framing: 'OMI'` and an OMIFlow.

**Recommended: (a).** Spoiler-alerts already covers the OMIFlow case; flipping its frontmatter is the smallest change and validates OF-2 in-pipeline.

## Task 28: TDD — OF-2 invariant (RED + GREEN + commit)

**Files:**
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/omi-flow-of2.ts` (or extend `omi-flow.ts`)
- Modify: `packages/astro/src/lib/pedagogy-audit/runner.ts`

**Step 28a:** Tests (mirror Task 15b shape):

```typescript
describe("OF-2 — framing:'OMI' chapter requires ≥1 <OMIFlow> (ERROR)", () => {
  test("emits no finding when an OMI-framed chapter has at least one OMIFlow", () => {
    const findings = runOMIFlowChapterConformanceInvariant({
      chapters: [{ slug: "ch", framing: "OMI", /* ... */ }],
      omiFlows: [{ chapter: "ch", anchor: "x", /* ... */ }],
    });
    expect(findings).toEqual([]);
  });

  test("emits one ERROR per OMI-framed chapter with zero OMIFlows", () => {
    const findings = runOMIFlowChapterConformanceInvariant({
      chapters: [{ slug: "missing", framing: "OMI" }],
      omiFlows: [],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: "OF-2",
      severity: "error",
      chapter: "missing",
    });
  });

  test("emits no finding for non-OMI-framed chapters regardless of OMIFlow presence", () => {
    const findings = runOMIFlowChapterConformanceInvariant({
      chapters: [{ slug: "c", framing: "custom" }],
      omiFlows: [],
    });
    expect(findings).toEqual([]);
  });
});
```

**Step 28b:** Implementation:

```typescript
export function runOMIFlowChapterConformanceInvariant(input: {
  chapters: ReadonlyArray<{ slug: string; framing?: string }>;
  omiFlows: ReadonlyArray<{ chapter: string }>;
}): AuditFinding[] {
  const omiChapters = new Set(
    input.chapters.filter((c) => c.framing === "OMI").map((c) => c.slug)
  );
  const chaptersWithOMIFlow = new Set(input.omiFlows.map((e) => e.chapter));
  const findings: AuditFinding[] = [];
  for (const slug of omiChapters) {
    if (!chaptersWithOMIFlow.has(slug)) {
      findings.push({
        code: "OF-2",
        severity: "error",
        chapter: slug,
        anchor: undefined,
        message: `OF-2: chapter "${slug}" declares \`framing: 'OMI'\` but renders zero <OMIFlow> callsites. Either add at least one <OMIFlow> to the chapter (ADR 0063) or change the framing.`,
      });
    }
  }
  return findings;
}
```

**Step 28c:** Wire into `runner.ts`:

```typescript
findings.push(
  ...runOMIFlowChapterConformanceInvariant({
    chapters: index.chapters,
    omiFlows: index.omiFlows,
  })
);
```

**Step 28d:** Tests + smoke. Initially OF-2 should NOT fire (spoiler-alerts doesn't have `framing: 'OMI'` yet). Verify:

```bash
pnpm --filter smoke build --force 2>&1 | grep "OF-2"
```

Expected: no output.

**Step 28e:** Commit.

## Task 29: Flip spoiler-alerts to `framing: 'OMI'`

**File:** `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx`

**Step 29a:** Edit frontmatter — add `framing: OMI`.

**Step 29b:** Rebuild smoke:

```bash
pnpm --filter smoke build --force 2>&1 | grep -aE "audit:|OF-"
```

**Expected:** no OF-2 (chapter has the OMIFlow from PR-B). Audit baseline unchanged.

**Step 29c:** Test OF-2 fires by temporarily removing the `<OMIFlow>` callsite from spoiler-alerts and rebuilding. Verify OF-2 fires (audit count becomes `1 error, 16 warnings, 9 infos`). Then restore the callsite. **Verify-and-revert only.**

**Step 29d:** Commit.

## Task 30: e2e per-OMIFlow existence (extend proving-chapter.spec)

**File:** `examples/smoke/e2e/proving-chapter.spec.ts`

Add `omiFlows` to the index-JSON typed interface + filter to chapterEntries + per-entry loop. Template from the deep-dive loop in PR-B (line ~160 region).

```typescript
for (const omi of chapterEntries.omiFlows) {
  await expect(
    page.locator(`#${omi.anchor}`),
    `OMIFlow "${omi.concept ?? omi.anchor}" should be rendered in DOM at #${omi.anchor}`
  ).toHaveCount(1);
  // All 3 slots should be present inside.
  await expect(
    page.locator(`#${omi.anchor} section`),
    `OMIFlow "${omi.anchor}" should render 3 slots as <section>`
  ).toHaveCount(3);
}
```

Run e2e. Expected: 153/153 (was 152, +1 OMIFlow per-entry pass).

Commit.

## Task 31: Docs sweep

Per ADR 0061 R5 (atomic docs). Update:

- `docs/website/reference/chapter-components.md` — add `<OMIFlow>` row to "When to use each component" table; add to the index-feeders block
- `docs/website/explanation/scientific-reasoning-os.md` — add `<OMIFlow>` to the implicit-role lookup table (root component declares the 3-slot binding, each slot row declares its role)
- `docs/website/reference/audit-baseline.md` — if any baseline number changed (typically no), update
- `docs/reviews/2026-05-19-architecture-audit.md` — N/A (post-audit; don't backdate)

Commit.

## Task 32: Regenerate validation dashboard (if anything in `validation:` changed)

```bash
pnpm tsx scripts/regenerate-validation-index.mts
```

If diff: commit. Otherwise skip.

## Task 33: Full gate stack + push + open PR-C

Per Task 17–18 form. PR title: `feat(astro+e2e): A8 <OMIFlow> OF-2 invariant + smoke OMI framing + e2e + docs (PR-C)`.

PR body must call out:
- spoiler-alerts.mdx now declares `framing: 'OMI'` (validates OF-2 in-pipeline)
- OF-2 ERROR-tier invariant added (graduates ADR 0058 §"deferred audit invariant")
- 1 new e2e assertion (152→153)
- Author-facing docs updated atomically

## Task 34: Anna's merge confirmation + merge + sync main

Final merge of the A8 graduation sequence. After merge:

```bash
git checkout main && git pull --ff-only origin main
git log --oneline -6  # confirm PR-A + PR-B + PR-C all landed
```

## Task 35: Final session report to Anna

A 1-page summary covering:
- 3 PRs merged: SHAs + audit baseline impact
- Smoke entry count: 64 → 65 (+1 OMIFlow)
- Audit invariants added: OF-1 (WARN) + OF-2 (ERROR)
- ADR 0058's deferred chapter-conformance invariant now graduated
- Trajectory: A+ posture maintained
- Next high-leverage step: ASTR 201 Module 3 chapter migration (real content work; consumer-repo PR)

---

## Cross-PR risks & mitigations

| Risk | Mitigation |
|---|---|
| PR-A's extractor extracts entries but renderer doesn't exist → smoke could break if a chapter authors `<OMIFlow>` before PR-B | Don't author any smoke callsite until PR-B; the extractor finds zero `<OMIFlow>` elements in the existing chapters and is a no-op until then. |
| PR-B's VR baselines could fail on first run | Use the `vr-update` workflow on the branch (Task 22 pattern). Don't merge until VR re-runs green against the regenerated baselines. |
| OF-2 misfires on existing non-OMI chapters | The invariant filters to `framing === 'OMI'` chapters. No false-positive risk on existing chapters that don't declare framing. |
| Test fixture sprawl (omiFlows: [] added to many files) | Same pattern as PR-B's deepDives fixture sweep — sed-add then biome format. ~10 files. |
| ADR-status / validation dashboard drift between PRs | Each PR that touches an ADR must run `pnpm tsx scripts/regenerate-validation-index.mts` (`feedback_validation_dashboard_regen`). |

## Final note

Anna's reading frame for this work: A8's graduation is the **canonical proof** that the Reasoning-OS-Core thesis pays off. Every other C-tier component (A9 AssumptionStack, A10 UncertaintyLens, etc.) inherits the slot-name-binds-role pattern established here. Get this one right and the rest mechanically follow.

If at any point an architectural question arises that ADR 0063 doesn't already cover, **stop and ask Anna** before deciding. The 14 locked decisions in [the design doc](2026-05-19-omiflow-design.md) cover the brainstormed space; anything outside that is a new design decision that deserves explicit HITL confirmation.
