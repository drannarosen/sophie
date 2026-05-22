# Wedge B1 — Retrieval Family Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. The validated design contract is at [docs/plans/2026-05-21-wedge-b1-retrieval-family-design.md](./2026-05-21-wedge-b1-retrieval-family-design.md) — read it first; it locks the 9 architectural decisions this plan implements against.

**Goal:** Ship three Tier 1 pedagogy components — `<RetrievalPrompt>`, `<SpacedReview>`, `<SkillReview>` — plus the shared `practice_attempt` persistence schema, `useRetrievalAttempt` hook, internal `<RetrievalCard>` primitive, 3 pedagogy-index entry types, 3 curriculum-CI invariants, smoke chapter usage, and doc updates.

**Architecture:** All 3 public components compose a shared `<RetrievalCard>` internal primitive built on Radix `<Collapsible>` (per [ADR 0019](../website/decisions/0019-radix-ui-a11y.md)). Persistence flows through a new `useRetrievalAttempt` hook wrapping the existing `useInteractive` (per [ADR 0007](../website/decisions/0007-persistence-indexeddb.md)) — same IndexedDB + BroadcastChannel LWW (per [ADR 0029](../website/decisions/0029-broadcast-channel-last-write-wins.md)) machinery as `<Predict>`. Each component writes `practice_attempt` records (extending `BaseRecordSchema` from Wedge A). The MDX-AST extractor learns 3 new entry types feeding 3 new curriculum-CI invariants.

**Tech Stack:** TypeScript, React 19, Zod 4 (per [ADR 0003](../website/decisions/0003-zod-as-source-of-truth.md)), Radix UI primitives (per [ADR 0019](../website/decisions/0019-radix-ui-a11y.md)), Vitest, `@testing-library/react`, axe-core (per [ADR 0004](../website/decisions/0004-component-contract-revisions.md)), Storybook (per [ADR 0028](../website/decisions/0028-storybook-axe.md)), Biome (per [ADR 0013](../website/decisions/0013-biome-lint-format.md)), pnpm (per [ADR 0011](../website/decisions/0011-pnpm-package-manager.md)), CSS Modules + theme tokens (per [ADR 0005](../website/decisions/0005-theming-three-layers.md)).

**Branch + PR strategy:**
- New feature branch `feat/wedge-b1-retrieval-family` off `main`
- PR titled `feat(components): Wedge B1 — retrieval family (RetrievalPrompt + SpacedReview + SkillReview)`
- Squash-merge per [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md)
- Required CI checks: lint, typecheck, unit, build, e2e, storybook, visual-regression

**Out of scope** (deferred per the design doc):
- Wedge B2 — `<WorkedExample>`, `<FadedPrompt>`, `<InterleavedSet>` (separate plan + PR)
- Wedge D — FSRS algorithm; `<SpacedReview>` ships with LRU stub scheduler
- Wedge E — BKT mastery; `<SkillReview>` ships with page-type-default prominence only
- Wedge C — Library room; `<SkillReview>` self-closing form renders placeholder
- AI Authoring Packets (Wedge G)
- Cockpit (ADR 0076; consumes `practice_attempt` records but not built here)

---

## Pre-flight (do once at start of session)

**Step 1: Sync main + create feature branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/wedge-b1-retrieval-family
```

Verify the design doc + Wedge A.5 + earlier Wedge A + ADR 0067 validation block exist on this tip:

```bash
ls docs/plans/2026-05-21-wedge-b1-retrieval-family-design.md
git log --oneline -5
# expect to see the 2026-05-21 design + Wedge A.5 squash + ADR commits
```

**Step 2: Read the design doc**

```bash
cat docs/plans/2026-05-21-wedge-b1-retrieval-family-design.md
```

The 9 locked decisions there shape every implementation choice. If the plan ever seems to contradict the design doc, **stop and re-read the design** before improvising.

**Step 3: Inspect existing precedents you'll mirror**

Spend ~10 min reading these so the patterns are loaded:

- `packages/components/src/components/Predict/Predict.tsx` + `.test.tsx` — closest existing analog; same persistence path; same predict-then-reveal UX inspiration
- `packages/components/src/components/CollapsibleCard/*` — visual precedent for the collapsed/expanded card pattern
- `packages/core/src/schema/base-record.ts` — what `PracticeAttemptSchema` extends
- `packages/core/src/schema/fsrs-record.ts` — concrete `BaseRecordSchema.extend({...})` pattern to follow
- `packages/core/src/schema/pedagogy-index-entries/predict.ts` (or any sibling) — extractor entry pattern
- `packages/astro/src/lib/pedagogy-index/extractors/predict.ts` (or any sibling) — extractor handler pattern
- `packages/astro/src/lib/pedagogy-audit/invariants/*.ts` — audit invariant patterns

If any of these paths have shifted, grep the codebase to find the current location and adjust — patterns matter more than paths.

**Step 4: Verify pre-flight gates green**

```bash
pnpm install --frozen-lockfile
pnpm exec biome check
pnpm turbo run typecheck
pnpm turbo run test:unit
```

Expected: all four commands exit 0. If anything fails on clean main, **stop and fix** before proceeding — don't add new code on a broken baseline.

---

## Task 1 — `PracticeAttemptSchema`

Foundation; everything else depends on it. Mirrors the BKT/FSRS schemas from Wedge A.

**Files:**
- Create: `packages/core/src/schema/practice-attempt.ts`
- Test: `packages/core/src/schema/practice-attempt.test.ts`
- Modify: `packages/core/src/schema/index.ts` (barrel)

**Step 1: Write the failing test**

`packages/core/src/schema/practice-attempt.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  type PracticeAttempt,
  PracticeAttemptSchema,
} from "./practice-attempt.js";

const valid: PracticeAttempt = {
  user_id: "browser-uuid-7f3a",
  course_id: "astr201-sp26",
  schema_version: "1.0.0",
  state_type: "practice_attempt",
  created_at: "2026-05-21T11:35:22Z",
  updated_at: "2026-05-21T11:35:22Z",
  target_id: "eq:stefan-boltzmann",
  component: "retrieval-prompt",
  response: "Luminosity goes up by 4x",
  self_assessment: "got",
  time_to_first_reveal_ms: 12_400,
  attempt_seq: 1,
};

describe("PracticeAttemptSchema", () => {
  it("accepts a valid record", () => {
    expect(() => PracticeAttemptSchema.parse(valid)).not.toThrow();
  });

  it("accepts each component variant", () => {
    for (const c of ["retrieval-prompt", "spaced-review", "skill-review"] as const) {
      expect(() =>
        PracticeAttemptSchema.parse({ ...valid, component: c }),
      ).not.toThrow();
    }
  });

  it("accepts each self_assessment variant", () => {
    for (const sa of ["got", "partial", "missed"] as const) {
      expect(() =>
        PracticeAttemptSchema.parse({ ...valid, self_assessment: sa }),
      ).not.toThrow();
    }
  });

  it("accepts null self_assessment (student dismissed without rating)", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, self_assessment: null }),
    ).not.toThrow();
  });

  it("accepts null time_to_first_reveal_ms (student dismissed without revealing)", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, time_to_first_reveal_ms: null }),
    ).not.toThrow();
  });

  it("accepts empty response string", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, response: "" }),
    ).not.toThrow();
  });

  it("rejects wrong state_type discriminator", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, state_type: "fsrs_state" }),
    ).toThrow();
  });

  it("rejects unknown component", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, component: "mystery" }),
    ).toThrow();
  });

  it("rejects non-positive attempt_seq", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, attempt_seq: 0 }),
    ).toThrow();
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, attempt_seq: -1 }),
    ).toThrow();
  });

  it("rejects negative time_to_first_reveal_ms", () => {
    expect(() =>
      PracticeAttemptSchema.parse({ ...valid, time_to_first_reveal_ms: -1 }),
    ).toThrow();
  });

  it("rejects missing target_id", () => {
    const { target_id: _target_id, ...rest } = valid;
    expect(() => PracticeAttemptSchema.parse(rest)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter=@sophie/core test:unit --run "practice-attempt"
```

Expected: FAIL with "Cannot find module './practice-attempt.js'".

**Step 3: Write the implementation**

`packages/core/src/schema/practice-attempt.ts`:

```typescript
import { z } from "zod";
import { BaseRecordSchema } from "./base-record.js";
import { NonEmptyString } from "./primitives.js";

/**
 * `PracticeAttemptSchema` — one student attempt at a retrieval-family
 * component (`<RetrievalPrompt>`, `<SpacedReview>`, or `<SkillReview>`).
 *
 * Per the Wedge B1 design doc + ADR 0073 (which sketches the data
 * model). Records are written by the `useRetrievalAttempt` hook into
 * the IndexedDB ResponseStore ([ADR 0007](../../../docs/website/decisions/0007-persistence-indexeddb.md))
 * via `useInteractive`. Wedge D's FSRS scheduler consumes the queue
 * and produces `FSRSRecord` (from Wedge A); the Cockpit
 * ([ADR 0076](../../../docs/website/decisions/0076-student-learning-cockpit.md))
 * surfaces them in Today + Review Queue tabs.
 *
 * Narrows `BaseRecordSchema.state_type` to literal `"practice_attempt"`
 * for future discriminated-union dispatch over persisted records.
 */
export const PracticeAttemptSchema = BaseRecordSchema.extend({
  state_type: z.literal("practice_attempt"),
  target_id: NonEmptyString,
  component: z.enum([
    "retrieval-prompt",
    "spaced-review",
    "skill-review",
  ]),
  response: z.string(),
  self_assessment: z.enum(["got", "partial", "missed"]).nullable(),
  time_to_first_reveal_ms: z.number().int().nonnegative().nullable(),
  attempt_seq: z.number().int().positive(),
});

export type PracticeAttempt = z.infer<typeof PracticeAttemptSchema>;
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter=@sophie/core test:unit --run "practice-attempt"
```

Expected: PASS, 11/11 tests green.

**Step 5: Update barrel + verify @sophie/core typecheck**

Edit `packages/core/src/schema/index.ts`. Insert alphabetically (between `pedagogy-index-entries` and `primitives` — biome's `organizeImports` will sort to its preferred position):

```typescript
export {
  type PracticeAttempt,
  PracticeAttemptSchema,
} from "./practice-attempt.js";
```

Run:

```bash
pnpm exec biome check --write packages/core/src/schema/
pnpm turbo run typecheck --filter=@sophie/core
```

Expected: biome 0 errors / 0 warnings; typecheck exit 0.

**Step 6: Commit**

```bash
git add packages/core/src/schema/practice-attempt.ts packages/core/src/schema/practice-attempt.test.ts packages/core/src/schema/index.ts
git commit -m "$(cat <<'EOF'
feat(core): add PracticeAttemptSchema (Wedge B1 retrieval-family persistence)

Per Wedge B1 design doc — one student attempt at a retrieval-family
component (RetrievalPrompt / SpacedReview / SkillReview). Extends
BaseRecordSchema with target_id + component discriminator + response
+ nullable self_assessment + nullable time_to_first_reveal_ms +
positive attempt_seq. state_type narrowed to literal
"practice_attempt" for discriminated-union dispatch over persisted
records.

11 unit tests; barrel updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — `useRetrievalAttempt` hook

Shared persistence path for all 3 public components. Built on `useInteractive`.

**Files:**
- Create: `packages/components/src/components/retrieval/useRetrievalAttempt.ts`
- Test: `packages/components/src/components/retrieval/useRetrievalAttempt.test.tsx`

Before writing: read the current `useInteractive` signature in `packages/components/src/hooks/useInteractive.ts` (or wherever it lives) so the wrapper composes correctly. If the hook surface has shifted, adjust the wrapper to match.

**Step 1: Write the failing test**

`packages/components/src/components/retrieval/useRetrievalAttempt.test.tsx`:

```typescript
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRetrievalAttempt } from "./useRetrievalAttempt.js";

// Tests assume the existing useInteractive IndexedDB ResponseStore is
// available in the test env per the existing Predict tests' setup.
// If your env differs, mirror Predict.test.tsx's setup.

describe("useRetrievalAttempt", () => {
  beforeEach(() => {
    // Clear ResponseStore between tests; mirror Predict.test.tsx pattern
  });

  it("returns attemptSeq=1 for a target with no prior attempts", () => {
    const { result } = renderHook(() =>
      useRetrievalAttempt({
        target_id: "eq:stefan-boltzmann",
        component: "retrieval-prompt",
      }),
    );
    expect(result.current.attemptSeq).toBe(1);
  });

  it("records an attempt and increments attemptSeq on next mount", async () => {
    const { result, rerender } = renderHook(() =>
      useRetrievalAttempt({
        target_id: "eq:stefan-boltzmann",
        component: "retrieval-prompt",
      }),
    );

    await act(async () => {
      await result.current.record("L goes up by 4x", "got", 12_400);
    });

    rerender();
    expect(result.current.attemptSeq).toBe(2);
  });

  it("accepts null self_assessment + null latency", async () => {
    const { result } = renderHook(() =>
      useRetrievalAttempt({
        target_id: "eq:stefan-boltzmann",
        component: "retrieval-prompt",
      }),
    );
    await expect(
      act(async () => result.current.record("", null, null)),
    ).resolves.not.toThrow();
  });

  it("scopes attemptSeq per (target_id, user_id) — different target = seq 1", () => {
    const { result: r1 } = renderHook(() =>
      useRetrievalAttempt({
        target_id: "eq:saha-equation",
        component: "retrieval-prompt",
      }),
    );
    expect(r1.current.attemptSeq).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter=@sophie/components test:unit --run "useRetrievalAttempt"
```

Expected: FAIL with "Cannot find module".

**Step 3: Write the implementation**

`packages/components/src/components/retrieval/useRetrievalAttempt.ts`:

```typescript
import { useCallback, useMemo } from "react";
import { useInteractive } from "../../hooks/useInteractive.js";
import type { PracticeAttempt } from "@sophie/core/schema";

/**
 * `useRetrievalAttempt` — shared persistence hook for the retrieval
 * family (`<RetrievalPrompt>`, `<SpacedReview>`, `<SkillReview>`).
 *
 * Wraps `useInteractive` (per [ADR 0007](../../../../../../docs/website/decisions/0007-persistence-indexeddb.md))
 * to write `practice_attempt` records into the IndexedDB ResponseStore.
 * Same cross-tab consistency machinery (BroadcastChannel LWW per
 * [ADR 0029](../../../../../../docs/website/decisions/0029-broadcast-channel-last-write-wins.md))
 * as existing `<Predict>` / `<ConfidenceCheck>` components.
 *
 * @returns `record(response, self_assessment, latency_ms)` — persist
 *   an attempt
 * @returns `attemptSeq` — 1-indexed counter for next attempt on this
 *   target (computed from existing attempts on mount)
 */
export interface UseRetrievalAttemptArgs {
  target_id: string;
  component: PracticeAttempt["component"];
}

export interface UseRetrievalAttemptReturn {
  record: (
    response: string,
    self_assessment: PracticeAttempt["self_assessment"],
    latency_ms: number | null,
  ) => Promise<void>;
  attemptSeq: number;
}

export function useRetrievalAttempt(
  args: UseRetrievalAttemptArgs,
): UseRetrievalAttemptReturn {
  const { target_id, component } = args;

  // Read all existing attempts for this (user_id implicit via
  // useInteractive's per-browser scope, target_id). Compute
  // attemptSeq = priorAttempts.length + 1.
  const { value: priorAttempts = [], append } = useInteractive<PracticeAttempt[]>({
    state_type: "practice_attempt",
    target_id,
    initial: [],
  });

  const attemptSeq = useMemo(
    () => priorAttempts.filter((a) => a.target_id === target_id).length + 1,
    [priorAttempts, target_id],
  );

  const record = useCallback(
    async (
      response: string,
      self_assessment: PracticeAttempt["self_assessment"],
      latency_ms: number | null,
    ) => {
      await append({
        state_type: "practice_attempt",
        target_id,
        component,
        response,
        self_assessment,
        time_to_first_reveal_ms: latency_ms,
        attempt_seq: attemptSeq,
        // user_id + course_id + schema_version + timestamps injected
        // by useInteractive's BaseRecord wrapper (per ADR 0007's
        // existing pattern; mirror createPedagogyRecord from Wedge A
        // if useInteractive doesn't already do this — adjust as
        // needed and document in this comment)
      });
    },
    [append, target_id, component, attemptSeq],
  );

  return { record, attemptSeq };
}
```

**IMPLEMENTATION NOTE for the executing engineer:** The exact `useInteractive` signature may differ from this sketch. Two places to adjust:
1. If `useInteractive` doesn't already accept `state_type` + `target_id` as a composite key, you may need to provide a `slug` derived from them (e.g., `practice-attempt:${target_id}`).
2. If `useInteractive` doesn't auto-wrap with BaseRecord fields, import `createPedagogyRecord` from `@sophie/core/runtime` (shipped in Wedge A) and use it to construct the full record before passing to `append`.

Read `Predict.tsx` for the canonical usage; mirror it.

**Step 4: Run test to verify it passes**

```bash
pnpm --filter=@sophie/components test:unit --run "useRetrievalAttempt"
```

Expected: PASS, 4/4 tests green. If tests fail due to `useInteractive` signature mismatch, adjust the wrapper per the IMPLEMENTATION NOTE above.

**Step 5: Biome + commit**

```bash
pnpm exec biome check --write packages/components/src/components/retrieval/
git add packages/components/src/components/retrieval/
git commit -m "feat(components): add useRetrievalAttempt hook (Wedge B1)

Shared persistence hook for the retrieval family. Wraps useInteractive
to write practice_attempt records. Computes attemptSeq from existing
attempts on mount. 4 unit tests."
```

---

## Task 3 — Theme tokens for left-band colors

**Files:**
- Modify: `packages/theme/src/tokens.ts` (exact location: find the tokens file via `find packages/theme/src -name "*.ts" -not -name "*.test.ts"` if path has shifted)

Add 3 new semantic theme tokens to the existing token structure. Mirror the existing callout / aside band tokens.

**Step 1: Locate + read tokens.ts**

```bash
find packages/theme/src -name "tokens.ts" -o -name "tokens*.scss"
```

Read the file. Identify the existing band-color tokens (e.g., `--callout-band-info`, `--aside-band-note`).

**Step 2: Add 3 new tokens**

In `packages/theme/src/tokens.ts`, add to the appropriate band-tokens section:

```typescript
// Wedge B1 retrieval family band colors (per Wedge B1 design doc §5)
"--retrieval-band": "var(--color-amber-500)",   // current-content recall
"--spaced-band":    "var(--color-cyan-500)",    // queued review
"--skill-band":     "var(--color-violet-500)",  // prereq bridge
```

If the theme uses raw hex rather than CSS-var references, mirror the existing band-token style. Pick mid-saturation colors at ~500-shade equivalent so the band is distinguishable without dominating.

**Step 3: Verify theme typecheck**

```bash
pnpm turbo run typecheck --filter=@sophie/theme
```

Expected: exit 0.

**Step 4: Commit**

```bash
git add packages/theme/src/tokens.ts
git commit -m "feat(theme): add retrieval-family left-band tokens (Wedge B1)

3 new semantic tokens: --retrieval-band (amber), --spaced-band
(cyan), --skill-band (violet). Used by RetrievalCard's left-edge
color band to distinguish RetrievalPrompt / SpacedReview /
SkillReview at glance per Wedge B1 design doc §5."
```

---

## Task 4 — `<RetrievalCard>` internal primitive

Shared visual primitive composed by all 3 public components. Lives in `internal/` (not a public export).

**Files:**
- Create: `packages/components/src/components/internal/RetrievalCard/RetrievalCard.tsx`
- Create: `packages/components/src/components/internal/RetrievalCard/RetrievalCard.module.css`
- Create: `packages/components/src/components/internal/RetrievalCard/RetrievalCard.test.tsx`
- (Optional: `RetrievalCard.stories.tsx` if the executing engineer wants Storybook coverage for the primitive specifically — recommended.)

The primitive owns the state machine: `collapsed` → `expanded` → `revealed` → `self-assessed`. Public components pass it props + slot children.

**Step 1: Write the failing test**

`packages/components/src/components/internal/RetrievalCard/RetrievalCard.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RetrievalCard } from "./RetrievalCard.js";

const baseProps = {
  bandToken: "--retrieval-band" as const,
  triggerLabel: "Retrieval — equation: Stefan-Boltzmann",
  prompt: <>What is L if R doubles at fixed T?</>,
  answer: <>L goes up by 4x.</>,
  initialState: "collapsed" as const,
  onReveal: vi.fn(),
  onSelfAssess: vi.fn(),
  onResponseChange: vi.fn(),
};

describe("RetrievalCard", () => {
  it("renders collapsed trigger by default", () => {
    render(<RetrievalCard {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /Retrieval — equation/ }),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("expands on trigger click and shows prompt + textarea + reveal button", async () => {
    const user = userEvent.setup();
    render(<RetrievalCard {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /Retrieval — equation/ }));
    expect(screen.getByText(/What is L if R doubles/)).toBeVisible();
    expect(screen.getByRole("textbox")).toBeVisible();
    expect(screen.getByRole("button", { name: /Reveal answer/i })).toBeVisible();
  });

  it("renders expanded by default when initialState='expanded'", () => {
    render(<RetrievalCard {...baseProps} initialState="expanded" />);
    expect(screen.getByRole("textbox")).toBeVisible();
  });

  it("calls onReveal + shows answer + self-assess buttons after Reveal click", async () => {
    const user = userEvent.setup();
    render(<RetrievalCard {...baseProps} initialState="expanded" />);

    await user.click(screen.getByRole("button", { name: /Reveal answer/i }));
    expect(baseProps.onReveal).toHaveBeenCalled();
    expect(screen.getByText(/L goes up by 4x/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Got it/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Partial/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Missed it/i })).toBeVisible();
  });

  it("calls onSelfAssess with the chosen rating", async () => {
    const user = userEvent.setup();
    render(<RetrievalCard {...baseProps} initialState="revealed" />);

    await user.click(screen.getByRole("button", { name: /Partial/i }));
    expect(baseProps.onSelfAssess).toHaveBeenCalledWith("partial");
  });

  it("calls onResponseChange when the student types", async () => {
    const user = userEvent.setup();
    render(<RetrievalCard {...baseProps} initialState="expanded" />);

    await user.type(screen.getByRole("textbox"), "hello");
    expect(baseProps.onResponseChange).toHaveBeenLastCalledWith("hello");
  });

  it("textarea is aria-described by prompt for screen-reader context", () => {
    render(<RetrievalCard {...baseProps} initialState="expanded" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.getAttribute("aria-describedby")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter=@sophie/components test:unit --run "RetrievalCard.test"
```

Expected: FAIL with module-not-found.

**Step 3: Write the implementation**

`packages/components/src/components/internal/RetrievalCard/RetrievalCard.tsx`:

```typescript
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import styles from "./RetrievalCard.module.css";

export type RetrievalBandToken =
  | "--retrieval-band"
  | "--spaced-band"
  | "--skill-band";

export type SelfAssessment = "got" | "partial" | "missed";

export type CardState = "collapsed" | "expanded" | "revealed" | "assessed";

export interface RetrievalCardProps {
  bandToken: RetrievalBandToken;
  triggerLabel: string;
  prompt: ReactNode;
  answer: ReactNode;
  initialState?: CardState;
  onExpand?: () => void;
  onReveal?: () => void;
  onResponseChange?: (response: string) => void;
  onSelfAssess?: (assessment: SelfAssessment) => void;
}

/**
 * `RetrievalCard` — internal primitive that powers `<RetrievalPrompt>`,
 * `<SpacedReview>`, and `<SkillReview>`. Owns the
 * collapsed → expanded → revealed → assessed state machine,
 * the Radix Collapsible disclosure, the textarea, the reveal button,
 * and the self-assess button row.
 *
 * Not a public export. Public components compose it with the right
 * `bandToken`, `triggerLabel`, slot children, and event handlers.
 *
 * Per the Wedge B1 design doc §5 (visual + structural).
 */
export function RetrievalCard(props: RetrievalCardProps) {
  const {
    bandToken,
    triggerLabel,
    prompt,
    answer,
    initialState = "collapsed",
    onExpand,
    onReveal,
    onResponseChange,
    onSelfAssess,
  } = props;

  const [state, setState] = useState<CardState>(initialState);
  const [response, setResponse] = useState<string>("");
  const promptId = useId();
  const expandedAtRef = useRef<number | null>(null);

  const handleExpand = useCallback(
    (open: boolean) => {
      if (open && state === "collapsed") {
        setState("expanded");
        expandedAtRef.current = Date.now();
        onExpand?.();
      } else if (!open && state === "expanded") {
        setState("collapsed");
      }
    },
    [state, onExpand],
  );

  const handleReveal = useCallback(() => {
    setState("revealed");
    onReveal?.();
  }, [onReveal]);

  const handleResponseChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setResponse(e.target.value);
      onResponseChange?.(e.target.value);
    },
    [onResponseChange],
  );

  const handleSelfAssess = useCallback(
    (a: SelfAssessment) => {
      setState("assessed");
      onSelfAssess?.(a);
    },
    [onSelfAssess],
  );

  const isOpen = state !== "collapsed";

  return (
    <Collapsible.Root
      className={styles.card}
      open={isOpen}
      onOpenChange={handleExpand}
      style={{ "--card-band-color": `var(${bandToken})` } as React.CSSProperties}
    >
      <Collapsible.Trigger className={styles.trigger}>
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        <span className={styles.triggerChevron} aria-hidden="true">
          {isOpen ? "▾" : "▸"}
        </span>
      </Collapsible.Trigger>

      <Collapsible.Content className={styles.content}>
        <div className={styles.prompt} id={promptId}>
          {prompt}
        </div>

        <textarea
          className={styles.textarea}
          value={response}
          onChange={handleResponseChange}
          aria-describedby={promptId}
          aria-label="Your response"
          placeholder="Type your answer..."
          rows={3}
        />

        {state === "expanded" ? (
          <button
            type="button"
            className={styles.revealButton}
            onClick={handleReveal}
          >
            Reveal answer ▾
          </button>
        ) : null}

        {(state === "revealed" || state === "assessed") ? (
          <>
            <div className={styles.answer}>{answer}</div>
            <div className={styles.selfAssess}>
              <span className={styles.selfAssessPrompt}>How did you do?</span>
              {(["got", "partial", "missed"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={styles.selfAssessButton}
                  onClick={() => handleSelfAssess(a)}
                  aria-pressed={state === "assessed"}
                >
                  {a === "got" ? "Got it" : a === "partial" ? "Partial" : "Missed it"}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
```

`packages/components/src/components/internal/RetrievalCard/RetrievalCard.module.css`:

```css
/* RetrievalCard — left-edge color band; pixel polish iterated in
 * Storybook per Wedge B1 design doc §5. */

.card {
  --card-band-color: currentColor;
  border-left: 4px solid var(--card-band-color);
  border-radius: 4px;
  background: var(--color-bg-card, #fff);
  padding: 0;
  margin-block: 1em;
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5em 1em;
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.trigger:focus-visible {
  outline: 2px solid var(--color-focus, #0066cc);
  outline-offset: 2px;
}

.triggerLabel {
  font-weight: 500;
}

.triggerChevron {
  font-family: monospace;
}

.content {
  padding: 0.5em 1em 1em;
}

.prompt {
  margin-block: 0 0.75em;
}

.textarea {
  width: 100%;
  font-family: inherit;
  font-size: 1em;
  padding: 0.5em;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  margin-block: 0 0.5em;
}

.textarea:focus-visible {
  outline: 2px solid var(--color-focus, #0066cc);
  outline-offset: 2px;
}

.revealButton {
  padding: 0.4em 1em;
  cursor: pointer;
  background: var(--card-band-color);
  color: var(--color-bg-card, #fff);
  border: none;
  border-radius: 4px;
  font: inherit;
}

.revealButton:focus-visible {
  outline: 2px solid var(--color-focus, #0066cc);
  outline-offset: 2px;
}

.answer {
  margin-block: 1em 0.75em;
}

.selfAssess {
  display: flex;
  gap: 0.5em;
  align-items: baseline;
  margin-block-start: 0.5em;
}

.selfAssessPrompt {
  font-size: 0.875em;
  color: var(--color-text-muted, #666);
}

.selfAssessButton {
  padding: 0.3em 0.75em;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--card-band-color);
  border-radius: 4px;
  font: inherit;
}

.selfAssessButton:focus-visible {
  outline: 2px solid var(--color-focus, #0066cc);
  outline-offset: 2px;
}

.selfAssessButton[aria-pressed="true"] {
  background: var(--card-band-color);
  color: var(--color-bg-card, #fff);
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter=@sophie/components test:unit --run "RetrievalCard.test"
```

Expected: PASS, 7/7 tests green.

**Step 5: Biome + commit**

```bash
pnpm exec biome check --write packages/components/src/components/internal/RetrievalCard/
git add packages/components/src/components/internal/RetrievalCard/
git commit -m "feat(components): add internal RetrievalCard primitive (Wedge B1)

Shared state-machine + visual primitive composed by RetrievalPrompt,
SpacedReview, and SkillReview. Built on Radix Collapsible for ARIA
disclosure semantics. Owns: collapsed → expanded → revealed →
assessed state, textarea, reveal button, self-assess button row,
left-edge color band via consumer-supplied bandToken. CSS Modules
+ theme tokens for the band color. 7 unit tests.

Per Wedge B1 design doc §5. Pixel polish iterated in Storybook
during the public-component tasks."
```

---

## Task 5 — `<RetrievalPrompt>` public component

**Files:**
- Create: `packages/components/src/components/RetrievalPrompt/RetrievalPrompt.tsx`
- Create: `packages/components/src/components/RetrievalPrompt/RetrievalPrompt.test.tsx`
- Create: `packages/components/src/components/RetrievalPrompt/RetrievalPrompt.axe.test.tsx`
- Create: `packages/components/src/components/RetrievalPrompt/RetrievalPrompt.stories.tsx`
- Modify: `packages/components/src/index.ts` (public barrel)

**Step 1: Write the failing tests**

`packages/components/src/components/RetrievalPrompt/RetrievalPrompt.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RetrievalPrompt } from "./RetrievalPrompt.js";

// Mock the persistence hook so we don't need IndexedDB in unit tests.
vi.mock("../retrieval/useRetrievalAttempt.js", () => ({
  useRetrievalAttempt: vi.fn(() => ({
    record: vi.fn().mockResolvedValue(undefined),
    attemptSeq: 1,
  })),
}));

describe("RetrievalPrompt", () => {
  it("renders with a target and prompt + answer slots", () => {
    render(
      <RetrievalPrompt target="eq:stefan-boltzmann">
        <RetrievalPrompt.Prompt>What is L if R doubles?</RetrievalPrompt.Prompt>
        <RetrievalPrompt.Answer>4x</RetrievalPrompt.Answer>
      </RetrievalPrompt>,
    );
    // Trigger label includes the target's resource-type prefix
    expect(
      screen.getByRole("button", { name: /Retrieval/i }),
    ).toBeInTheDocument();
  });

  it("invokes useRetrievalAttempt.record on self-assess", async () => {
    const { useRetrievalAttempt } = await import("../retrieval/useRetrievalAttempt.js");
    const record = vi.fn().mockResolvedValue(undefined);
    (useRetrievalAttempt as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      record,
      attemptSeq: 1,
    });

    const user = userEvent.setup();
    render(
      <RetrievalPrompt target="eq:stefan-boltzmann">
        <RetrievalPrompt.Prompt>Question?</RetrievalPrompt.Prompt>
        <RetrievalPrompt.Answer>Answer.</RetrievalPrompt.Answer>
      </RetrievalPrompt>,
    );

    await user.click(screen.getByRole("button", { name: /Retrieval/i }));
    await user.type(screen.getByRole("textbox"), "my guess");
    await user.click(screen.getByRole("button", { name: /Reveal/i }));
    await user.click(screen.getByRole("button", { name: /Got it/i }));

    expect(record).toHaveBeenCalledWith(
      "my guess",
      "got",
      expect.any(Number),
    );
  });

  it("rejects targets without a prefix", () => {
    // The runtime component shouldn't crash; the pedagogy-index
    // extractor + curriculum-CI catch these as findings. This test
    // documents that the component renders even with a malformed
    // target (so a broken authoring doesn't blank the page).
    expect(() =>
      render(
        <RetrievalPrompt target="stefan-boltzmann">
          <RetrievalPrompt.Prompt>Q?</RetrievalPrompt.Prompt>
          <RetrievalPrompt.Answer>A.</RetrievalPrompt.Answer>
        </RetrievalPrompt>,
      ),
    ).not.toThrow();
  });
});
```

`packages/components/src/components/RetrievalPrompt/RetrievalPrompt.axe.test.tsx`:

```typescript
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { RetrievalPrompt } from "./RetrievalPrompt.js";

expect.extend(toHaveNoViolations);

describe("RetrievalPrompt — a11y", () => {
  it("has no axe violations when collapsed (default)", async () => {
    const { container } = render(
      <RetrievalPrompt target="eq:stefan-boltzmann">
        <RetrievalPrompt.Prompt>Q?</RetrievalPrompt.Prompt>
        <RetrievalPrompt.Answer>A.</RetrievalPrompt.Answer>
      </RetrievalPrompt>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

(For the expanded-state axe test: Storybook test-runner covers it per ADR 0057. If the executing engineer prefers belt-and-suspenders, add a `renders expanded` story-driven test mirroring the existing `<Predict>.axe.test.tsx` pattern.)

**Step 2: Run tests to verify red**

```bash
pnpm --filter=@sophie/components test:unit --run "RetrievalPrompt"
```

Expected: FAIL with module-not-found.

**Step 3: Write the implementation**

`packages/components/src/components/RetrievalPrompt/RetrievalPrompt.tsx`:

```typescript
import { Children, type ReactNode, isValidElement, useState } from "react";
import { RetrievalCard } from "../internal/RetrievalCard/RetrievalCard.js";
import { useRetrievalAttempt } from "../retrieval/useRetrievalAttempt.js";

/**
 * `<RetrievalPrompt>` — primary in-flow recall prompt for the current
 * reading. Per Wedge B1 design doc §1.
 *
 * @example
 * <RetrievalPrompt target="eq:stefan-boltzmann">
 *   <RetrievalPrompt.Prompt>...</RetrievalPrompt.Prompt>
 *   <RetrievalPrompt.Answer>...</RetrievalPrompt.Answer>
 * </RetrievalPrompt>
 *
 * - `target` is a prefix-typed pedagogy-graph ref (eq:/gl:/misc:/lo:/ki:/topic:).
 * - <Prompt> and <Answer> are required slot children.
 * - Self-assess buttons render automatically; non-blocking.
 * - Writes practice_attempt records via useRetrievalAttempt.
 */
export interface RetrievalPromptProps {
  target: string;
  children: ReactNode;
}

function PromptSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
PromptSlot.displayName = "RetrievalPrompt.Prompt";

function AnswerSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
AnswerSlot.displayName = "RetrievalPrompt.Answer";

export function RetrievalPrompt({ target, children }: RetrievalPromptProps) {
  const { record } = useRetrievalAttempt({
    target_id: target,
    component: "retrieval-prompt",
  });

  const [response, setResponse] = useState<string>("");
  const [expandedAt, setExpandedAt] = useState<number | null>(null);

  // Extract Prompt + Answer children
  const childrenArray = Children.toArray(children);
  const promptChild = childrenArray.find(
    (c) =>
      isValidElement(c) &&
      (c.type as { displayName?: string })?.displayName === "RetrievalPrompt.Prompt",
  );
  const answerChild = childrenArray.find(
    (c) =>
      isValidElement(c) &&
      (c.type as { displayName?: string })?.displayName === "RetrievalPrompt.Answer",
  );

  return (
    <RetrievalCard
      bandToken="--retrieval-band"
      triggerLabel={`Retrieval — ${humanLabelFromTarget(target)}`}
      prompt={promptChild ?? null}
      answer={answerChild ?? null}
      initialState="collapsed"
      onExpand={() => setExpandedAt(Date.now())}
      onResponseChange={setResponse}
      onSelfAssess={async (assessment) => {
        const latency = expandedAt !== null ? Date.now() - expandedAt : null;
        await record(response, assessment, latency);
      }}
    />
  );
}

RetrievalPrompt.Prompt = PromptSlot;
RetrievalPrompt.Answer = AnswerSlot;

/**
 * `eq:stefan-boltzmann` → "equation: Stefan-Boltzmann"
 * Best-effort humanization for the trigger label.
 */
function humanLabelFromTarget(target: string): string {
  const [prefix, ...rest] = target.split(":");
  const slug = rest.join(":");
  const typeLabel =
    prefix === "eq"
      ? "equation"
      : prefix === "gl"
      ? "glossary"
      : prefix === "misc"
      ? "misconception"
      : prefix === "lo"
      ? "learning objective"
      : prefix === "ki"
      ? "key insight"
      : prefix === "topic"
      ? "topic"
      : "target";
  return slug ? `${typeLabel}: ${slug}` : target;
}
```

`packages/components/src/components/RetrievalPrompt/RetrievalPrompt.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { RetrievalPrompt } from "./RetrievalPrompt.js";

const meta: Meta<typeof RetrievalPrompt> = {
  title: "Pedagogy/RetrievalPrompt",
  component: RetrievalPrompt,
};
export default meta;

type Story = StoryObj<typeof RetrievalPrompt>;

export const Collapsed: Story = {
  render: () => (
    <RetrievalPrompt target="eq:stefan-boltzmann">
      <RetrievalPrompt.Prompt>
        A star doubles its radius at fixed temperature. How does its
        luminosity change?
      </RetrievalPrompt.Prompt>
      <RetrievalPrompt.Answer>
        Luminosity goes up by <strong>4×</strong>, since L = 4πR²σT⁴.
      </RetrievalPrompt.Answer>
    </RetrievalPrompt>
  ),
};

export const Expanded: Story = {
  ...Collapsed,
  parameters: {
    // Force expanded initial state for visual-regression baseline
    sophie: { initialState: "expanded" },
  },
};

export const PostReveal: Story = {
  ...Collapsed,
  parameters: {
    sophie: { initialState: "revealed" },
  },
};
```

(The `parameters.sophie.initialState` indirection requires a small decorator in `.storybook/preview.tsx` to pass through to the component. If the existing Storybook setup doesn't support this, simpler workaround: ship 3 separate component instances with `initialState` exposed as a story-only prop, then wrap with a development-mode-only `__initialState` escape hatch in `RetrievalPrompt.tsx`. Mirror the existing `<Predict>` story pattern.)

**Step 4: Update public barrel + run all tests**

In `packages/components/src/index.ts`, add:

```typescript
export {
  RetrievalPrompt,
  type RetrievalPromptProps,
} from "./components/RetrievalPrompt/RetrievalPrompt.js";
```

(Biome will sort to its preferred position.)

```bash
pnpm exec biome check --write packages/components/src/components/RetrievalPrompt/ packages/components/src/index.ts
pnpm --filter=@sophie/components test:unit --run "RetrievalPrompt"
```

Expected: PASS, ~4/4 tests green (3 vitest + 1 axe).

**Step 5: Commit**

```bash
git add packages/components/src/components/RetrievalPrompt/ packages/components/src/index.ts
git commit -m "feat(components): add <RetrievalPrompt> public component (Wedge B1)

Primary in-flow recall prompt. Compound component with Prompt +
Answer slot children. target prop accepts prefix-typed pedagogy-graph
ref (eq:/gl:/misc:/lo:/ki:/topic:). Composes the internal
<RetrievalCard> primitive with amber left-band. Writes
practice_attempt records via useRetrievalAttempt on self-assess.
3 vitest + 1 axe-core + 3 Storybook stories."
```

---

## Task 6 — `<SpacedReview>` public component

**Files:**
- Create: `packages/components/src/components/SpacedReview/SpacedReview.tsx`
- Create: `packages/components/src/components/SpacedReview/SpacedReview.test.tsx`
- Create: `packages/components/src/components/SpacedReview/SpacedReview.axe.test.tsx`
- Create: `packages/components/src/components/SpacedReview/SpacedReview.stories.tsx`
- Create: `packages/components/src/components/retrieval/lruScheduler.ts` + `.test.ts` (small util for the stub scheduler)
- Modify: `packages/components/src/index.ts`

The LRU scheduler stub goes in its own util file so Wedge D can swap the function without touching the component.

**Step 1: Write the failing tests** for the LRU scheduler util first (single-responsibility, easiest to test):

`packages/components/src/components/retrieval/lruScheduler.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { selectLeastRecentlyAttempted } from "./lruScheduler.js";

const attempts = [
  { target_id: "eq:a", updated_at: "2026-05-21T09:00:00Z" },
  { target_id: "eq:b", updated_at: "2026-05-21T10:00:00Z" },
  { target_id: "eq:c", updated_at: "2026-05-21T11:00:00Z" },
] as const;

describe("selectLeastRecentlyAttempted", () => {
  it("returns the N least-recently-attempted target_ids", () => {
    const result = selectLeastRecentlyAttempted({ attempts, max: 2 });
    expect(result).toEqual(["eq:a", "eq:b"]);
  });

  it("returns empty array when attempts is empty", () => {
    expect(selectLeastRecentlyAttempted({ attempts: [], max: 5 })).toEqual([]);
  });

  it("returns all targets when max exceeds attempt count", () => {
    expect(selectLeastRecentlyAttempted({ attempts, max: 100 })).toEqual([
      "eq:a",
      "eq:b",
      "eq:c",
    ]);
  });

  it("filters by target_id prefix when scope.targetPrefix is set", () => {
    const mixed = [
      ...attempts,
      { target_id: "topic:logs", updated_at: "2026-05-21T08:00:00Z" },
    ];
    expect(
      selectLeastRecentlyAttempted({
        attempts: mixed,
        max: 5,
        scope: { targetPrefix: "eq:" },
      }),
    ).toEqual(["eq:a", "eq:b", "eq:c"]);
  });

  it("deduplicates: multiple attempts of same target collapse to one slot", () => {
    const dup = [
      { target_id: "eq:a", updated_at: "2026-05-21T09:00:00Z" },
      { target_id: "eq:a", updated_at: "2026-05-21T12:00:00Z" },
      { target_id: "eq:b", updated_at: "2026-05-21T10:00:00Z" },
    ];
    // eq:a's *most recent* attempt is 12:00; eq:b is 10:00. LRU =
    // eq:b first.
    expect(selectLeastRecentlyAttempted({ attempts: dup, max: 2 })).toEqual([
      "eq:b",
      "eq:a",
    ]);
  });
});
```

**Step 2: Run, verify fail, then implement**

```bash
pnpm --filter=@sophie/components test:unit --run "lruScheduler"
```

`packages/components/src/components/retrieval/lruScheduler.ts`:

```typescript
/**
 * `selectLeastRecentlyAttempted` — Wedge B1 stub scheduler for
 * `<SpacedReview>`. Selects the `max` least-recently-attempted
 * targets from a `practice_attempt` queue, deduplicated by
 * target_id (most-recent attempt timestamp per target).
 *
 * Replaced by the real FSRS scheduler when Wedge D ships. No schema
 * change; only the function body changes.
 */
export interface AttemptLike {
  target_id: string;
  updated_at: string;  // ISO 8601
}

export interface SelectArgs<T extends AttemptLike> {
  attempts: ReadonlyArray<T>;
  max: number;
  scope?: {
    targetPrefix?: string;  // e.g., "eq:" or "topic:"
  };
}

export function selectLeastRecentlyAttempted<T extends AttemptLike>(
  args: SelectArgs<T>,
): string[] {
  const { attempts, max, scope } = args;

  // 1. Filter by scope if present
  const filtered = scope?.targetPrefix
    ? attempts.filter((a) => a.target_id.startsWith(scope.targetPrefix!))
    : attempts;

  // 2. Deduplicate by target_id, keeping the *most recent* timestamp
  //    per target (so "last attempted" reflects the latest activity)
  const latestByTarget = new Map<string, string>();
  for (const a of filtered) {
    const prior = latestByTarget.get(a.target_id);
    if (!prior || a.updated_at > prior) {
      latestByTarget.set(a.target_id, a.updated_at);
    }
  }

  // 3. Sort by timestamp ascending (oldest first = least-recently-attempted first)
  const sorted = [...latestByTarget.entries()].sort((a, b) =>
    a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0,
  );

  // 4. Take max + return target_ids only
  return sorted.slice(0, max).map(([target_id]) => target_id);
}
```

Run + verify pass + commit (separately so the util is independently testable):

```bash
pnpm exec biome check --write packages/components/src/components/retrieval/lruScheduler.ts packages/components/src/components/retrieval/lruScheduler.test.ts
pnpm --filter=@sophie/components test:unit --run "lruScheduler"
git add packages/components/src/components/retrieval/lruScheduler.ts packages/components/src/components/retrieval/lruScheduler.test.ts
git commit -m "feat(components): add LRU scheduler stub for SpacedReview (Wedge B1)

Selects max least-recently-attempted targets from practice_attempt
queue, deduplicated by target_id. Replaced by real FSRS scheduler
when Wedge D ships; no schema change required. 5 unit tests
covering basic LRU, empty input, max overflow, prefix-scope filter,
deduplication."
```

**Step 3: Write `<SpacedReview>` tests + implementation**

`packages/components/src/components/SpacedReview/SpacedReview.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpacedReview } from "./SpacedReview.js";

// Mock useInteractive to return controlled attempt history
vi.mock("../../hooks/useInteractive.js", () => ({
  useInteractive: vi.fn(() => ({
    value: [
      { target_id: "eq:a", updated_at: "2026-05-20T10:00:00Z", state_type: "practice_attempt" },
      { target_id: "eq:b", updated_at: "2026-05-21T10:00:00Z", state_type: "practice_attempt" },
    ],
    append: vi.fn(),
  })),
}));

describe("SpacedReview", () => {
  it("renders nothing meaningful when target + section both missing (Zod refine catches at parse, but defensive at runtime)", () => {
    // @ts-expect-error — intentional misuse
    const { container } = render(<SpacedReview />);
    // Component should render an empty state or warning, not crash
    expect(container.textContent).toBeDefined();
  });

  it("renders queue surfaced for target prefix", () => {
    render(<SpacedReview target="eq:saha-equation" max={3} />);
    // Surfaces a trigger/heading per item; exact UX iterated in Storybook
    expect(screen.getByText(/review/i)).toBeInTheDocument();
  });

  it("renders empty state when no attempts match scope", () => {
    render(<SpacedReview target="topic:nothing-here-yet" max={3} />);
    expect(screen.getByText(/no items due/i)).toBeInTheDocument();
  });

  it("renders authored <Empty> child when provided + no items", () => {
    render(
      <SpacedReview target="topic:logs" max={3}>
        <SpacedReview.Empty>Practice ahead on logarithms?</SpacedReview.Empty>
      </SpacedReview>,
    );
    expect(screen.getByText(/Practice ahead/)).toBeInTheDocument();
  });

  it("respects max prop", () => {
    // Verify only N items render even when more match scope. Exact
    // implementation: count rendered RetrievalCards. The test asserts
    // at most 1 (in this mock; eq:b is the only match for the eq: prefix
    // after the LRU sort, but actually both eq:a and eq:b match —
    // assert at most 1 since max=1).
    render(<SpacedReview target="eq:saha-equation" max={1} />);
    // Implementation-specific assertion: count the rendered prompts.
    // If using data-testid="spaced-review-item", count them:
    expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(1);
  });
});
```

`packages/components/src/components/SpacedReview/SpacedReview.tsx`:

```typescript
import { Children, type ReactNode, isValidElement } from "react";
import { useInteractive } from "../../hooks/useInteractive.js";
import { selectLeastRecentlyAttempted } from "../retrieval/lruScheduler.js";

export interface SpacedReviewProps {
  target?: string;
  section?: string;
  max?: number;
  children?: ReactNode;
}

function EmptySlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
EmptySlot.displayName = "SpacedReview.Empty";

/**
 * `<SpacedReview>` — queued review surface. Per Wedge B1 design doc §1.
 *
 * Two mutually-exclusive selection scopes:
 *   - target="prefix:slug" → review attempts for one pedagogy-graph node
 *   - section="<slug>"     → review attempts across this Section's pedagogy
 *
 * Ships in Wedge B1 with a LRU scheduler stub (least-recently-attempted
 * first); Wedge D's FSRS scheduler replaces it via function-swap.
 *
 * Renders authored <Empty> child when no items match scope.
 */
export function SpacedReview({
  target,
  section,
  max = 3,
  children,
}: SpacedReviewProps) {
  // Zod refine should catch at parse-time; defensive runtime check too
  if ((target && section) || (!target && !section)) {
    return null;  // or render a development-mode warning
  }

  const { value: allAttempts = [] } = useInteractive<unknown[]>({
    state_type: "practice_attempt",
  });

  const attempts = allAttempts as Array<{
    target_id: string;
    updated_at: string;
  }>;

  // Scope filter: target → exact match prefix; section → ...
  // For B1, section filter is a placeholder until pedagogy-index
  // lookup is wired in; ship target-scope only as the working path
  // and stub section-scope with an empty-result return + a TODO.
  const scope = target
    ? { targetPrefix: target.split(":")[0] + ":" }
    : undefined;

  const dueTargets = target
    ? selectLeastRecentlyAttempted({ attempts, max, scope }).filter(
        (t) => t === target,
      )
    : section
      ? []  // TODO Wedge B-followup: pedagogy-index lookup for section scope
      : [];

  const emptyChild = Children.toArray(children).find(
    (c) =>
      isValidElement(c) &&
      (c.type as { displayName?: string })?.displayName === "SpacedReview.Empty",
  );

  if (dueTargets.length === 0) {
    return (
      <div role="region" aria-label="Spaced review">
        {emptyChild ?? (
          <p>No items due for review yet — they'll appear as you work through the prompts above.</p>
        )}
      </div>
    );
  }

  return (
    <div role="region" aria-label="Spaced review">
      {dueTargets.map((t) => (
        <div key={t} data-testid="spaced-review-item">
          {/* Placeholder: render a RetrievalCard preview for each target.
              Exact rendering: load the original RetrievalPrompt's content
              from the pedagogy-index, OR render a stub "Review: <target>"
              card that links into where it was authored. Iterated in
              Storybook. */}
          <p>Review: {t}</p>
        </div>
      ))}
    </div>
  );
}

SpacedReview.Empty = EmptySlot;
```

**IMPORTANT NOTE for the executing engineer:** The exact rendering of each due-target item is intentionally minimal in this plan. The design doc §1 mentions SpacedReview "renders auto-selected `<RetrievalPrompt>` instances," but the cross-component-reference machinery (look up the original prompt content from pedagogy-index) is more wedge-internal than B1's scope. Two reasonable Wedge B1 simplifications:
1. **Render a "Review: <target>" card with a link** to where the prompt was authored (anchor link via pedagogy-index `source_path` + `mdx_node_id`). Simplest; functional.
2. **Render a RetrievalCard with stub prompt content** ("Practice the concept: <target_id>") + a CTA link to the source location. Slightly richer.

Pick option (1) for B1; option (2) is a 1-line tweak later.

Story + axe test mirror the RetrievalPrompt pattern (boilerplate adjustment from the file above).

**Step 4: Update barrel + run + commit**

In `packages/components/src/index.ts`, add `SpacedReview` export. Run tests + biome.

```bash
pnpm --filter=@sophie/components test:unit --run "SpacedReview"
git add packages/components/src/components/SpacedReview/ packages/components/src/index.ts
git commit -m "feat(components): add <SpacedReview> public component (Wedge B1)

Queued review surface. Two mutually-exclusive selection scopes:
target='prefix:slug' (single-node review) and section='<slug>'
(Section-scope review; pedagogy-index lookup is TODO for B-followup).
LRU scheduler stub from lruScheduler.ts; FSRS scheduler swap in
Wedge D. Optional <Empty> slot child for authored empty-state
override. Cyan left-band. Vitest + axe + Storybook stories."
```

---

## Task 7 — `<SkillReview>` public component

Mirror Task 5's structure; differences are: optional slot children, B1 placeholder for self-closing form (Wedge C path), violet left-band.

**Files:**
- Create: `packages/components/src/components/SkillReview/SkillReview.tsx`
- Create: `packages/components/src/components/SkillReview/SkillReview.test.tsx`
- Create: `packages/components/src/components/SkillReview/SkillReview.axe.test.tsx`
- Create: `packages/components/src/components/SkillReview/SkillReview.stories.tsx`
- Modify: `packages/components/src/index.ts`

**Steps 1–4:** Follow Task 5's pattern exactly with these adjustments:

- Slot children **optional**; when absent, render placeholder text `"Topic refresher available once the Library room ships — see ADR 0076."` inside the card.
- Optional `<SkillReview.ReviewMore>` slot for the auto-link override. When absent + Library not shipped, omit the "Refresher available" link entirely.
- `bandToken="--skill-band"`.
- `useRetrievalAttempt({ component: "skill-review" })`.
- `triggerLabel` = `Refresher — ${humanLabelFromTarget(target)}` (extract `humanLabelFromTarget` into `packages/components/src/components/retrieval/humanLabel.ts` since 2 components now want it — DRY).

Test 5 + axe + Storybook stories specific to SkillReview:
- "renders placeholder when self-closing + no children"
- "renders explicit children when provided"
- "renders ReviewMore link when authored"

**Step 5: Commit**

```bash
git add packages/components/src/components/SkillReview/ packages/components/src/components/retrieval/humanLabel.ts packages/components/src/index.ts
git commit -m "feat(components): add <SkillReview> public component (Wedge B1)

Inline prereq-bridge prompt. Same target prefix convention as
RetrievalPrompt/SpacedReview. Slot children optional: when present,
explicit Prompt + Answer; when absent, B1 placeholder for Wedge C
topic-registry resolution. Optional <ReviewMore> slot for explicit
Library-link override. Violet left-band. Extracts humanLabelFromTarget
to retrieval/humanLabel.ts (DRY, second consumer). Vitest + axe +
Storybook stories."
```

---

## Task 8 — Pedagogy-index entry types + extractor handlers

**Files:**
- Create: `packages/core/src/schema/pedagogy-index-entries/retrieval-prompt.ts` + `.test.ts`
- Create: `packages/core/src/schema/pedagogy-index-entries/spaced-review.ts` + `.test.ts`
- Create: `packages/core/src/schema/pedagogy-index-entries/skill-review.ts` + `.test.ts`
- Modify: `packages/core/src/schema/pedagogy-index-entries/index.ts` (barrel)
- Modify: `packages/core/src/schema/pedagogy-index.ts` (add the 3 new entry collections)
- Create: `packages/astro/src/lib/pedagogy-index/extractors/retrieval-prompt.ts` + `.test.ts`
- Create: `packages/astro/src/lib/pedagogy-index/extractors/spaced-review.ts` + `.test.ts`
- Create: `packages/astro/src/lib/pedagogy-index/extractors/skill-review.ts` + `.test.ts`
- Modify: `packages/astro/src/lib/pedagogy-index/index.ts` (register the 3 new extractors)

**Pattern:** Each entry follows the existing pedagogy-index entry shape (see `predict.ts` or `key-equation.ts` for canonical pattern). Each extractor handles one MDX component-node type and emits one entry per occurrence.

**Per-entry schema (sketch; mirror existing entries exactly for field naming + Zod patterns):**

`retrieval-prompt.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.js";

export const RetrievalPromptEntrySchema = z.object({
  slug: Slug,                       // synthesized from source_path + mdx_node_id
  target_id: NonEmptyString,        // exact target= prop value
  source_path: NonEmptyString,
  mdx_node_id: NonEmptyString,
});
export type RetrievalPromptEntry = z.infer<typeof RetrievalPromptEntrySchema>;
```

`spaced-review.ts`:

```typescript
export const SpacedReviewEntrySchema = z.object({
  slug: Slug,
  target_id: NonEmptyString.optional(),
  section_id: NonEmptyString.optional(),
  max: z.number().int().positive(),
  source_path: NonEmptyString,
  mdx_node_id: NonEmptyString,
});
export type SpacedReviewEntry = z.infer<typeof SpacedReviewEntrySchema>;
```

`skill-review.ts`:

```typescript
export const SkillReviewEntrySchema = z.object({
  slug: Slug,
  target_id: NonEmptyString,
  has_explicit_content: z.boolean(),  // true if <Prompt>+<Answer> children present
  source_path: NonEmptyString,
  mdx_node_id: NonEmptyString,
});
export type SkillReviewEntry = z.infer<typeof SkillReviewEntrySchema>;
```

**Per-extractor pattern:** find existing `predict.ts` extractor and mirror. Each extractor:
1. Walks the MDX AST looking for the matching component-node name.
2. Reads attributes off the node (`target`, `max`, `section`).
3. Generates a stable slug from `source_path:mdx_node_id`.
4. Returns an array of entries.

**TDD discipline:** for each of the 3 entry types + 3 extractors, write a vitest that parses a representative MDX fixture and asserts the extracted entries match expectations. Mirror `predict.test.ts` exactly.

**Step: Commit (one commit per family OR one combined; recommend one combined commit since they share the pattern)**

```bash
git add packages/core/src/schema/pedagogy-index-entries/retrieval-prompt.* \
        packages/core/src/schema/pedagogy-index-entries/spaced-review.* \
        packages/core/src/schema/pedagogy-index-entries/skill-review.* \
        packages/core/src/schema/pedagogy-index-entries/index.ts \
        packages/core/src/schema/pedagogy-index.ts \
        packages/astro/src/lib/pedagogy-index/extractors/retrieval-prompt.* \
        packages/astro/src/lib/pedagogy-index/extractors/spaced-review.* \
        packages/astro/src/lib/pedagogy-index/extractors/skill-review.* \
        packages/astro/src/lib/pedagogy-index/index.ts

git commit -m "feat(core,astro): pedagogy-index entry types + extractors for retrieval family (Wedge B1)

3 new entry types (RetrievalPromptEntry, SpacedReviewEntry,
SkillReviewEntry) + 3 new MDX-AST extractors handling the matching
component node types. Each entry has a slug, source_path, mdx_node_id,
plus component-specific fields (target_id, section_id?, max,
has_explicit_content). Per Wedge B1 design doc §6. ~12 unit tests
across schema + extractors. PedagogyIndexSchema gains 3 new
collections."
```

---

## Task 9 — Curriculum-CI audit invariants

3 new invariants extending the existing audit machinery.

**Files:**
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/pra-1-prereq-activation.ts` + `.test.ts`
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/ret-1-retrieval-coverage.ts` + `.test.ts`
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/sr-1-spaced-review-validity.ts` + `.test.ts`
- Modify: `packages/astro/src/lib/pedagogy-audit/index.ts` (register the 3 new invariants)

**Pattern:** Read an existing invariant (e.g., `chapter-status.ts` or whatever's in that directory). Each invariant is a pure function: takes a `PedagogyIndex`, returns an array of `AuditFinding` records.

**Per-invariant logic:**

- **PRA-1** (Prereq Activation): For every `UnitEntry` in the index with `prereqs[]`, verify each prereq topic_id has ≥1 `SkillReviewEntry` with `target_id="topic:<prereq>"` within the same Section (or any prior Section, by `order`). Emit one `WARN`-severity finding per uncovered prereq.

- **RET-1** (Retrieval Coverage): For every `Unit[type=lecture]`'s `reading` artifact, count the total word-count of the MDX body + count `RetrievalPromptEntry + SpacedReviewEntry + SkillReviewEntry` instances within that source_path. Emit one `INFO`-severity finding if ratio < 1 surface per 500 words. (Soft warning; instructor discretion.)

- **SR-1** (SpacedReview validity): For every `SpacedReviewEntry`: if `target_id` set, verify it parses as a prefix-typed ref AND the referenced registry/topic entry exists in the PedagogyIndex; if `section_id` set, verify a `SectionEntry` with matching slug exists. Emit `ERROR`-severity findings for unresolved refs.

**Step: Commit**

```bash
git add packages/astro/src/lib/pedagogy-audit/invariants/pra-1-prereq-activation.* \
        packages/astro/src/lib/pedagogy-audit/invariants/ret-1-retrieval-coverage.* \
        packages/astro/src/lib/pedagogy-audit/invariants/sr-1-spaced-review-validity.* \
        packages/astro/src/lib/pedagogy-audit/index.ts

git commit -m "feat(astro): 3 new curriculum-CI invariants for retrieval family (Wedge B1)

Per Wedge B1 design doc §6:

- PRA-1: every Unit prereqs[] topic has ≥1 <SkillReview> surface
- RET-1: lecture readings have ≥1 retrieval surface per ~500 words
- SR-1: <SpacedReview> target_id / section_id resolves in pedagogy-index

Mirror the existing invariant pattern (pure function: PedagogyIndex →
AuditFinding[]). ~9 unit tests across fixtures. Registered in
the audit barrel."
```

---

## Task 10 — Smoke chapter usage

Add representative usages to existing smoke chapters so visual-regression baselines + Pagefind index have real content to render.

**Files:**
- Modify: `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx`
- Modify: `examples/smoke/src/content/chapters/02-stars/spectra-and-composition.mdx`

**Steps:**

1. In `spoiler-alerts.mdx`: insert 1 `<RetrievalPrompt target="ki:luminosity">` mid-reading after the luminosity definition (find existing `<KeyInsight>` block on luminosity and place the prompt right after). Insert 1 `<SkillReview target="topic:exponents">` inline where exponential notation appears.

2. In `spectra-and-composition.mdx`: insert 1 `<RetrievalPrompt target="eq:saha-equation">` mid-reading. Insert 1 `<SpacedReview target="topic:logarithms" max={3} />` at end of reading (just before the closing summary).

For each: import the components from `@sophie/components`. Read the existing `<Predict>` import + usage pattern in the same file as the precedent.

**Step: Build smoke + verify**

```bash
pnpm --filter smoke build
```

Expected: build completes; 12 pages built; Pagefind index grows by the new component instances; no axe-core violations introduced.

**Step: Commit**

```bash
git add examples/smoke/src/content/chapters/
git commit -m "feat(smoke): use retrieval-family components in foundational chapters (Wedge B1)

Demos for visual-regression baselines + Pagefind index entries:

- spoiler-alerts.mdx: <RetrievalPrompt target='ki:luminosity'> +
  <SkillReview target='topic:exponents'>
- spectra-and-composition.mdx: <RetrievalPrompt target='eq:saha-equation'> +
  <SpacedReview target='topic:logarithms' max={3}>

Smoke build green; 12 pages; Pagefind index regenerated."
```

---

## Task 11 — Doc updates (per `feedback_docs_no_drift`)

3 files; brief edits each.

**Files:**
- Modify: `docs/website/reference/chapter-components.md` (3 new component sections)
- Modify: `docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md` (signature edit)
- Modify: `docs/website/status/course-website-roadmap.md` (Tier A → shipped move + signature edit)

**Step 1: `chapter-components.md`**

Add 3 new sections in the appropriate location (probably after `<Predict>` or near the other prompt-family components):

- `<RetrievalPrompt>` — signature, `target` prefix table, Prompt/Answer slot requirements, self-assess UX note, page-type-default behavior. Include the MDX example from Wedge B1 design doc §1.
- `<SpacedReview>` — signature, target/section scope rules, max default, `<Empty>` override, LRU-stub note + Wedge D plan.
- `<SkillReview>` — signature with `target` prefix, optional slot children, B1-vs-Wedge-C registry resolution, `<ReviewMore>` override.

Cross-link to Wedge B1 design doc.

**Step 2: ADR 0068**

Find the `<SkillReview>` example block (probably `<SkillReview topic="logarithms" />`) and edit to `<SkillReview target="topic:logarithms" />`. Add a brief note (2 sentences) explaining the prefix-convention unification across the retrieval family per Wedge B1 design doc.

**Step 3: Roadmap signature edit**

Find the "New pedagogy components (Tier 1)" table. Edit 2 signatures (`<SpacedReview topic="...">` and `<SkillReview topic="...">`) to use `target="topic:..."`. Move the 3 retrieval-family rows from "Future capabilities — Tier A / B" listing to a new "Shipped — Wedge B1" subsection above Tier A (or annotate each row with `[shipped Wedge B1]`).

**Step 4: Regenerate validation.md (if any ADR `status:` / `validation:` block changed)**

If ADR 0068's frontmatter changed, run:

```bash
pnpm tsx scripts/regenerate-validation-index.mts
```

Otherwise skip.

**Step 5: Commit**

```bash
git add docs/website/reference/chapter-components.md docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md docs/website/status/course-website-roadmap.md
# add docs/website/status/validation.md if regenerated
git commit -m "docs: chapter-components + ADR 0068 + roadmap updates for Wedge B1

Per feedback_docs_no_drift:

- chapter-components.md: 3 new component sections for <RetrievalPrompt>,
  <SpacedReview>, <SkillReview> with full signatures, slot rules,
  page-type defaults, cross-link to Wedge B1 design doc.
- ADR 0068: <SkillReview topic='...'> → <SkillReview target='topic:...'>
  signature edit + 2-sentence prefix-convention note.
- course-website-roadmap.md: same signature edit; move 3 retrieval-family
  rows from Tier A / Future Capabilities to Shipped — Wedge B1."
```

---

## Task 12 — Pre-PR verification gates

Per `feedback_pre_pr_lockfile_check` + `feedback_biome_verification` + `project_local_dev_pagefind_e2e_pitfall`:

**Step 1: Lockfile check**

```bash
pnpm install --frozen-lockfile
```

Expected: "Already up to date" — no deps added.

**Step 2: Biome (full check; grep output, don't trust tail)**

```bash
pnpm exec biome check 2>&1
```

Expected: exit 0; 0 errors, 0 warnings. If anything fails, `pnpm exec biome check --write` for auto-fixes, then re-run.

**Step 3: Typecheck**

```bash
pnpm turbo run typecheck
```

Expected: exit 0 across all packages.

**Step 4: Unit tests**

```bash
pnpm turbo run test:unit
```

Expected: exit 0. Wedge B1 adds ~50 new tests (11 PracticeAttempt + 4 hook + 7 RetrievalCard + ~12 public components + 5 LRU + ~12 extractors + ~9 invariants).

**Step 5: Build (full monorepo)**

```bash
pnpm turbo run build
```

Expected: exit 0. Smoke + storybook + all packages.

**Step 6: Force-rebuild docs (per the pitfall memory)**

```bash
pnpm exec turbo run build --filter=@sophie/docs --force
```

Expected: 5 successful.

**Step 7: Check port 4321 clean before e2e** (per `project_local_dev_pagefind_e2e_pitfall`)

```bash
lsof -i :4321 2>&1 | head -3 || echo "port 4321 clear"
ps aux | grep -E "astro\.(dev|preview)" | grep -v grep || echo "no stale astro processes"
```

If anything's there, kill the dev server PIDs before proceeding.

**Step 8: E2E**

```bash
pnpm test:e2e
```

Expected: 157+/0/5 (matches Sprint K baseline; possibly +1-2 new e2e tests if you add component-rendering checks).

**Step 9: Verify storybook test-runner sees the new stories + visual-regression baselines**

Storybook stories for the 3 new components will need visual-regression baselines added. If the test-runner reports new stories without baselines, accept them (or generate via `pnpm turbo run test:vr --filter=@sophie/storybook --update-baselines` if Sophie has that script — check actual scripts).

---

## Task 13 — Open PR + monitor CI

**Step 1: Push branch**

```bash
git push -u origin feat/wedge-b1-retrieval-family
```

**Step 2: Create PR via gh**

```bash
gh pr create --base main --title "feat(components): Wedge B1 — retrieval family (RetrievalPrompt + SpacedReview + SkillReview)" --body "$(cat <<'EOF'
## Summary

Wedge B1 ships the **retrieval family** of Tier 1 pedagogy components per
the validated design at [docs/plans/2026-05-21-wedge-b1-retrieval-family-design.md](docs/plans/2026-05-21-wedge-b1-retrieval-family-design.md).

Three new public components + supporting infrastructure:

- **`<RetrievalPrompt>`** — primary in-flow recall; required `<Prompt>`
  + `<Answer>` slot children; prefix-typed `target`; self-assess buttons
  auto-render; logs to `practice_attempt`.
- **`<SpacedReview>`** — queued review surface; `target` or `section`
  scope; LRU scheduler stub (Wedge D replaces); optional `<Empty>`
  slot override.
- **`<SkillReview>`** — inline prereq bridge; optional slot children;
  Wedge B1 placeholder for self-closing form (Wedge C registry path);
  optional `<ReviewMore>` slot.

Plus:
- `PracticeAttemptSchema` extending `BaseRecordSchema` from Wedge A.
- `useRetrievalAttempt` hook wrapping `useInteractive`.
- Internal `<RetrievalCard>` primitive (Radix Collapsible-backed) composed by all 3 publics.
- 3 new pedagogy-index entry types + extractors.
- 3 new curriculum-CI invariants (PRA-1, RET-1, SR-1).
- 3 new theme tokens (`--retrieval-band` / `--spaced-band` / `--skill-band`).
- Smoke chapter usage in `spoiler-alerts.mdx` + `spectra-and-composition.mdx`.
- Doc updates: `chapter-components.md` + ADR 0068 signature edit + roadmap signature edit.

## Scope deliberately excluded

- **Wedge B2** — `<WorkedExample>`, `<FadedPrompt>`, `<InterleavedSet>` (separate plan + PR).
- **Wedge D** — FSRS algorithm; `<SpacedReview>` ships with LRU stub.
- **Wedge E** — BKT mastery; `<SkillReview>` ships page-type-default prominence only.
- **Wedge C** — Library room; `<SkillReview>` self-closing form renders placeholder.
- **AI Authoring Packets (Wedge G)**; **Cockpit (ADR 0076)** consumes records but isn't built here.

## Test plan

- [x] `pnpm exec biome check` — 0 errors, 0 warnings
- [x] `pnpm turbo run typecheck` — 0 errors
- [x] `pnpm turbo run test:unit` — all packages green; ~50 new tests
- [x] `pnpm turbo run build` — all packages green; smoke 12 pages; Storybook stories build
- [x] `pnpm test:e2e` — 157+/0/5 (matches Sprint K baseline)
- [x] `pnpm exec turbo run build --filter=@sophie/docs --force` — MyST docs rebuild green

## Related

- Design: `docs/plans/2026-05-21-wedge-b1-retrieval-family-design.md`
- Plan: `docs/plans/2026-05-21-wedge-b1-retrieval-family.md`
- ADR 0067 — Section / Subsection / Unit / Artifact (locks the Section schema components compose against)
- ADR 0068 — Bridge rooms + prereq pedagogy (SkillReview signature edit lands here)
- ADR 0073 — Unified Assessment + BKT (informs the practice_attempt shape)
- ADR 0075 — Student UX cognitive-load governance (page-type defaults)
- Wedge A (#154) + Wedge A.5 (#155) — schema foundation
EOF
)"
```

**Step 3: Monitor CI**

```bash
gh pr checks <PR-number> --watch --fail-fast
```

Wait for all 7 checks (lint, typecheck, build, storybook, visual-regression, unit, e2e).

**Step 4: Squash-merge when green** (HITL: confirm with Anna first per `feedback_no_questions_mode_scope`)

```bash
gh pr merge <PR-number> --squash --delete-branch
```

**Step 5: Sync local main + cleanup**

```bash
git checkout main
git pull --ff-only
```

---

## Verification at completion

After merge:
1. **`docs/website/status/validation.md` regen** — if any ADR frontmatter changed (likely only ADR 0068 if its `status:`/`validation:` block was touched).
2. **Memory update worth considering:** record the `@sophie/components` public surface (RetrievalPrompt + SpacedReview + SkillReview) so future Claude sessions know they exist + their target prefix convention.
3. **Cockpit work (ADR 0076)** is now unblocked — it can read `practice_attempt` records to populate the Review Queue + Today tab.
4. **Wedge B2 scoping** can begin (worked-example + faded-prompt + interleaved-set; separate brainstorm + design + plan).

## Notes for the executing engineer

- **TDD strictly**: every task has red → green → commit cadence. Don't batch component implementations across tasks; commit each public component separately.
- **Biome verification**: never trust tail-only output (`feedback_biome_verification`).
- **Pre-PR lockfile check** per `feedback_pre_pr_lockfile_check` — Wedge B1 adds no deps so should be a no-op.
- **Pagefind e2e port-4321 pitfall**: check before running e2e (memory `project_local_dev_pagefind_e2e_pitfall`).
- **Pixel polish iterated in Storybook**, not committed in the initial component PRs. Get the structure + a11y right; polish per existing test-runner workflow.
- **Don't rename `<Predict>` or evolve its UX** — Wedge B1 introduces *peers* to Predict; existing components stay as-is.
- **Don't touch worked-example / faded-prompt / interleaved-set** — Wedge B2 scope.
- **HITL on architectural surprises**: any deviation from the design doc (e.g., the `useInteractive` surface differs in a way that requires a hook redesign) → pause and surface to Anna before improvising.

## Followup wedges (out of scope for this plan)

- **Wedge B2**: `<WorkedExample>` + `<FadedPrompt>` + `<InterleavedSet>` (worked-example family). Reuses RetrievalCard internals where it makes sense.
- **Wedge C**: Library room — `<EquationSpecPage>`, Cheatsheet, PDF export, topic registry. Unlocks `<SkillReview>`'s self-closing form.
- **Wedge D**: `@sophie/pedagogy-fsrs` — real FSRS algorithm replaces `lruScheduler`. Same function signature; same schema.
- **Wedge E**: `@sophie/pedagogy-bkt` — BKT mastery; SkillReview gains adaptive prominence.
- **Wedge B.5** (per ADR 0076): Student Cockpit consumes `practice_attempt` records B1 produces.
- **Wedge G**: AI Authoring Packets — AI-drafted prompts via `sophie export-ai-context`.
