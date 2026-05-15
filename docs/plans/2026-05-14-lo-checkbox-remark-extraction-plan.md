# LO checkbox remark-extraction — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the production-only LO checkbox bug (zero checkboxes render in built MDX chapters because cloneElement can't reach `<Objective>` across the astro-slot island boundary) by adding a remark-extraction pass that rewrites `<LearningObjectives><Objective>` trees into a props-driven shape.

**Architecture:** Add `transformLearningObjectives` to the existing remark plugin, running last after read-only harvesters. It mutates parent AST nodes: clears `<Objective>` children, appends an `objectives` JSX attribute holding the harvested array. React island hydrates with `objectives` prop instead of children. `<Objective>` becomes a pure-display primitive that accepts `body: string` rendered via `dangerouslySetInnerHTML`.

**Tech Stack:** TypeScript, React 19, Astro 6 + @astrojs/mdx, unified/remark/mdast, Vitest, Playwright, Zod, Biome, pnpm/Turborepo.

**Branch:** `feat/lo-checkbox-remark-extraction` (worktree at `.worktrees/lo-checkbox-remark-extraction/`)

**Reference docs:**
- [Overview](2026-05-14-lo-checkbox-remark-extraction-overview.md) — locked product decisions
- [Engineering design](2026-05-14-lo-checkbox-remark-extraction-design.md) — full precision spec, §0-§10
- [ADR 0007](../website/decisions/0007-persistence-indexeddb.md) — IDB persistence + useInteractive
- [ADR 0027](../website/decisions/0027-mdx-render-boundary-prop-threading.md) — MDX render boundary
- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) — pedagogy-index pattern

---

## Errata (live corrections during execution)

These corrections apply across the rest of the plan. They surfaced
while implementing Task 1; subsequent tasks should follow these
instead of the original plan text where they conflict.

1. **Test script:** `pnpm --filter @sophie/astro test:unit` (NOT
   `test`). The `@sophie/astro` package's script is named `test:unit`;
   `pnpm ... test` silently no-ops on the missing script and exits 0,
   masking RED-first failures. Verified during Task 1 execution.

2. **Test file location:** Co-locate under `packages/astro/src/lib/`
   (NOT `packages/astro/test/`). Project convention is tests next to
   source — see `pedagogy-index-extractor.test.ts` for precedent.
   Snapshot files therefore land at
   `packages/astro/src/lib/__snapshots__/`.

3. **No `remark` / `remark-mdx` dep:** Tests build mdast trees as
   plain JS objects via local helper factories
   (`mdxLearningObjectives`, `mdxObjective`, `para`, `root`), matching
   the convention in `pedagogy-index-extractor.test.ts`. No new deps
   added to `@sophie/astro`.

4. **Task 2 (snapshot test) — adapt the approach:** Either build the
   mdast input manually and snapshot the post-plugin tree (preferred),
   or commit a `.mdx` fixture file and have the snapshot test invoke
   the plugin pipeline directly. Don't import `remark` or `remark-mdx`
   in tests.

5. **Selector correction (Task 3 + design doc §4 Layer 2):** The
   `<LearningObjectives>` component puts `aria-labelledby="lo-heading"`
   on its **`<section>`** wrapper, not on the `<ul>`. The `<ul>`
   carries `aria-busy`. Correct selector chain for Playwright:
   `section[aria-labelledby="lo-heading"] ul input[type="checkbox"]`.
   The design doc has been corrected; Task 3's commit reflects the
   right shape.

6. **Task 2's snapshot is gated behind the transform-fired predicate.**
   Vitest auto-writes a `.snap` file on first run. To keep the RED
   phase from leaving a stale baseline of the un-transformed tree on
   disk (which a developer could accidentally `git add`), wrap the
   `toMatchSnapshot()` assertion in `if (loNode.children.length === 0)`.
   The gate opens once Task 6 wires the transform; from then on the
   snapshot generates correctly and becomes the legitimate baseline.

Tasks 1, 2, and 3 reflect these corrections in their committed code.

---

## Task 1: Layer 1 RED — failing unit test on `transformLearningObjectives`

**Goal:** Commit the failing-first contract for the new transform function. The function does not exist yet; the test must fail with "transformLearningObjectives is not defined" (or similar).

**Files:**
- Create: `packages/astro/test/transform-learning-objectives.test.ts`

**Step 1.1 — Write the failing test.**

```ts
// packages/astro/test/transform-learning-objectives.test.ts
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { describe, expect, it } from "vitest";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { transformLearningObjectives } from "../src/lib/pedagogy-index-extractor.ts";

const processor = remark().use(remarkMdx);
const parse = (src: string) => processor.parse(src);

function findLO(tree: ReturnType<typeof parse>): MdxJsxFlowElement | undefined {
  let found: MdxJsxFlowElement | undefined;
  for (const node of tree.children) {
    const n = node as MdxJsxFlowElement;
    if (n.type === "mdxJsxFlowElement" && n.name === "LearningObjectives") {
      found = n;
      break;
    }
  }
  return found;
}

describe("transformLearningObjectives", () => {
  it("rewrites single-Objective LO to objectives prop + empty children", () => {
    const tree = parse([
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective id="o1" verb="State">the thesis</Objective>',
      '</LearningObjectives>',
      '',
    ].join("\n"));
    transformLearningObjectives(tree, "ch");

    const lo = findLO(tree);
    expect(lo).toBeDefined();
    expect(lo?.children).toEqual([]);

    const attr = lo?.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "objectives",
    );
    expect(attr).toBeDefined();

    const value = (attr as { value: { value: string } }).value.value;
    const parsed = JSON.parse(value);
    expect(parsed).toEqual([
      { id: "o1", verb: "State", body: expect.stringContaining("thesis") },
    ]);
  });

  it("preserves source order across multiple Objectives", () => {
    const tree = parse([
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective id="first" verb="State">A</Objective>',
      '  <Objective id="second" verb="Explain">B</Objective>',
      '  <Objective id="third" verb="Predict">C</Objective>',
      '</LearningObjectives>',
      '',
    ].join("\n"));
    transformLearningObjectives(tree, "ch");

    const value = JSON.parse(
      (findLO(tree)?.attributes.find(
        (a) => a.type === "mdxJsxAttribute" && a.name === "objectives",
      ) as { value: { value: string } }).value.value,
    );
    expect(value.map((o: { id: string }) => o.id)).toEqual(["first", "second", "third"]);
  });

  it("throws on empty <LearningObjectives>", () => {
    const tree = parse('<LearningObjectives course="c" chapter="ch" id="lo"></LearningObjectives>\n');
    expect(() => transformLearningObjectives(tree, "ch")).toThrow(/no <Objective>/i);
  });

  it("throws on non-Objective JSX siblings", () => {
    const tree = parse([
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective id="o1" verb="State">x</Objective>',
      '  <Aside title="boo">stray</Aside>',
      '</LearningObjectives>',
      '',
    ].join("\n"));
    expect(() => transformLearningObjectives(tree, "ch")).toThrow(/unexpected child <Aside>/);
  });

  it("throws on duplicate Objective id within one LO", () => {
    const tree = parse([
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective id="dup" verb="State">a</Objective>',
      '  <Objective id="dup" verb="Explain">b</Objective>',
      '</LearningObjectives>',
      '',
    ].join("\n"));
    expect(() => transformLearningObjectives(tree, "ch")).toThrow(/duplicate/i);
  });

  it("throws on missing id", () => {
    const tree = parse([
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective verb="State">no id</Objective>',
      '</LearningObjectives>',
      '',
    ].join("\n"));
    expect(() => transformLearningObjectives(tree, "ch")).toThrow(/missing.*id/i);
  });

  it("throws on missing verb", () => {
    const tree = parse([
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective id="o1">no verb</Objective>',
      '</LearningObjectives>',
      '',
    ].join("\n"));
    expect(() => transformLearningObjectives(tree, "ch")).toThrow(/missing.*verb/i);
  });

  it("throws on empty body", () => {
    const tree = parse([
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective id="o1" verb="State"></Objective>',
      '</LearningObjectives>',
      '',
    ].join("\n"));
    expect(() => transformLearningObjectives(tree, "ch")).toThrow(/empty body/i);
  });
});
```

**Step 1.2 — Run the test; verify it fails for the right reason.**

Run from worktree root:
```bash
pnpm --filter @sophie/astro exec vitest run test/transform-learning-objectives.test.ts
```
Expected output: failures referencing "`transformLearningObjectives` is not exported from …pedagogy-index-extractor.ts" (or a TypeScript compile error to the same effect). **Not** "no test files found" — that would indicate path/glob misconfiguration.

**Step 1.3 — Commit RED.**

```bash
git add packages/astro/test/transform-learning-objectives.test.ts
git commit -m "test(astro): RED — transformLearningObjectives contract (8 cases)

Failing first per CLAUDE.md TDD rule. Covers:
- Happy paths: single + multi-Objective LO rewrite
- Error paths: empty LO, non-Objective sibling, duplicate id,
  missing id/verb, empty body

Sets the contract for the new remark-extraction transform. See
docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md §2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Layer 1.5 RED — failing snapshot test on plugin round-trip

**Goal:** Capture the plugin's full mdast-rewrite shape against a fixture that mixes LO, prose, and other JSX. Snapshot doesn't exist yet → test fails on first run.

**Files:**
- Create: `packages/astro/test/transform-snapshot.test.ts`
- (snapshot auto-generated at first run; **commit it intentionally** only after eyeball review)

**Step 2.1 — Write the failing snapshot test.**

```ts
// packages/astro/test/transform-snapshot.test.ts
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { describe, expect, it } from "vitest";
import { pedagogyIndexRemarkPlugin, resetIndexAccumulator } from "../src/lib/pedagogy-index-extractor.ts";

describe("pedagogyIndexRemarkPlugin round-trip snapshot", () => {
  it("preserves all non-LO mdast nodes verbatim while rewriting LO", async () => {
    resetIndexAccumulator();
    const input = [
      "# Chapter title",
      "",
      "Some prose with **bold** and a [link](https://example.com).",
      "",
      '<LearningObjectives course="c" chapter="ch" id="lo">',
      '  <Objective id="o1" verb="State">the thesis</Objective>',
      '  <Objective id="o2" verb="Explain">the reason</Objective>',
      "</LearningObjectives>",
      "",
      "More prose after.",
      "",
      '<Aside title="x">untouched aside content</Aside>',
      "",
    ].join("\n");

    const out = await remark()
      .use(remarkMdx)
      .use(pedagogyIndexRemarkPlugin, { getChapterSlug: () => "ch" })
      .process(input);

    expect(String(out)).toMatchSnapshot();
  });
});
```

**Step 2.2 — Run; expect snapshot-mismatch failure (no snapshot file yet).**

```bash
pnpm --filter @sophie/astro exec vitest run test/transform-snapshot.test.ts
```
Expected: failure citing "Snapshot file does not exist" or "no snapshot was saved" (because the function under test doesn't exist yet — same compile error as Task 1).

**Step 2.3 — Commit RED. Do NOT commit any auto-generated snapshot yet (it would capture a broken state).**

```bash
git add packages/astro/test/transform-snapshot.test.ts
git commit -m "test(astro): RED — plugin round-trip snapshot

Catches accidental mutations of non-LO mdast nodes by the new
transform pass. Snapshot will be captured + eyeballed once the
implementation lands in Task 6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Layer 2 RED — failing Playwright e2e on smoke

**Goal:** Capture the production-only failure as a formal regression test. We already know it fails on `main` (zero checkboxes in HTML).

**Files:**
- Create: `examples/smoke/e2e/learning-objectives.spec.ts`

**Step 3.1 — Inspect existing Playwright spec for conventions.**

```bash
ls examples/smoke/e2e/
cat examples/smoke/e2e/*.spec.ts | head -50
```

Note the existing import patterns, `test.describe`, and how Playwright base URL is configured.

**Step 3.2 — Write the failing e2e spec.**

```ts
// examples/smoke/e2e/learning-objectives.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Learning Objectives checkbox interactivity", () => {
  test("renders a checkbox for each Objective", async ({ page }) => {
    await page.goto("/chapters/measuring-the-sky/");
    const ul = page.locator('ul[aria-busy]').filter({
      has: page.locator('li[id^="lo-"]'),
    });
    await expect(ul).toHaveAttribute("aria-busy", "false");
    const checkboxes = ul.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(1);
  });

  test("checking a box persists across reload", async ({ page }) => {
    await page.goto("/chapters/measuring-the-sky/");
    const ul = page.locator('ul[aria-busy]').filter({
      has: page.locator('li[id^="lo-"]'),
    });
    await expect(ul).toHaveAttribute("aria-busy", "false");

    const checkbox = ul.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await page.reload();
    await expect(ul).toHaveAttribute("aria-busy", "false");
    await expect(
      ul.locator('input[type="checkbox"]').first(),
    ).toBeChecked();
  });
});
```

**Step 3.3 — Build smoke (so Playwright runs against the static dist).**

```bash
pnpm turbo run build --filter=smoke
```

**Step 3.4 — Run Playwright; verify both tests fail with "expected count 1, got 0" or similar.**

```bash
pnpm test:e2e -- learning-objectives.spec.ts
```

**Step 3.5 — Commit RED.**

```bash
git add examples/smoke/e2e/learning-objectives.spec.ts
git commit -m "test(smoke): RED — LO checkbox e2e (renders + persists)

Captures the production-only bug formally. Currently fails: built
HTML at examples/smoke/dist/chapters/measuring-the-sky/index.html
contains zero <input type=\"checkbox\"> markers because cloneElement
can't reach <Objective> across the astro-slot boundary.

Turns green after the remark-extraction transform lands.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Objective primitive — drop children, add body string

**Goal:** Make `<Objective>` a pure-display primitive that takes `body` as an HTML string. Per the design doc §3.

**Files:**
- Modify: `packages/components/src/components/Objective/Objective.schema.ts`
- Modify: `packages/components/src/components/Objective/Objective.tsx`
- Modify: `packages/components/src/components/Objective/Objective.test.tsx`

**Step 4.1 — Update schema.**

Replace the current `ObjectivePropsSchema` body (file currently at
`packages/components/src/components/Objective/Objective.schema.ts`, ~30 lines)
with:

```ts
import { NonEmptyString } from "@sophie/core/schema";
import { z } from "zod";

/**
 * `<Objective>` — pure-display primitive for one learning objective.
 *
 * Rendered in two contexts, both via the `body` HTML-string prop:
 *
 *   (a) Inside `<LearningObjectives>` after the remark transform has
 *       harvested it into the parent's `objectives` prop. The parent
 *       renders Objective itself with `checked` + `onToggle` wired up.
 *   (b) On the `/objectives` course-wide roll-up page, server-rendered
 *       from `PedagogyIndex.objectives`. `checked`/`onToggle` omitted —
 *       pure display, no checkbox.
 *
 * Authored in MDX as `<Objective id="..." verb="...">prose</Objective>`;
 * the remark plugin harvests attributes + serializes the body via
 * `renderChildrenToHtml`, then rewrites the parent <LearningObjectives>
 * to a props-driven shape. The author-side JSX never reaches React.
 */
export const ObjectivePropsSchema = z.object({
  id: NonEmptyString,
  verb: NonEmptyString,
  /** HTML string. Rendered via dangerouslySetInnerHTML. */
  body: NonEmptyString,
  /** Injected by `<LearningObjectives>` parent. Omit for pure-display. */
  checked: z.boolean().optional(),
  /** Injected by `<LearningObjectives>` parent. Omit for pure-display. */
  onToggle: z.custom<() => void>().optional(),
});

export type ObjectiveProps = z.infer<typeof ObjectivePropsSchema>;
```

**Step 4.2 — Update component.**

Replace the body span at the end of `Objective.tsx`:

```tsx
// before
<span className={styles.body}>{children}</span>

// after
<span
  className={styles.body}
  dangerouslySetInnerHTML={{ __html: body }}
/>
```

Update the destructure:
```tsx
export function Objective({ id, verb, body, checked, onToggle }: ObjectiveProps) {
```

Remove the `useId`/`children` imports/usage if they become unused.
Remove the JSDoc reference to `cloneElement` parent-injection (since
the parent no longer injects via cloneElement); update to reference
the new prop-driven injection.

**Step 4.3 — Update Objective unit tests to pass body string.**

In `Objective.test.tsx`, replace all `<Objective ...>body text</Objective>`
callsites with `<Objective ... body="body text" />`. Adjust any text-content
assertions accordingly (e.g., `screen.getByText("body text")` may now match
inside the dangerouslySetInnerHTML span — same DOM, same assertion).

**Step 4.4 — Run Objective tests; verify green.**

```bash
pnpm --filter @sophie/components exec vitest run src/components/Objective/Objective.test.tsx
```

**Step 4.5 — Run typecheck across components.**

```bash
pnpm --filter @sophie/components run typecheck
```

Expected: green. If LearningObjectives now has type errors from referencing the old Objective signature, those are addressed in Task 5.

**Step 4.6 — Commit.**

```bash
git add packages/components/src/components/Objective/
git commit -m "refactor(components): Objective takes body string, drops children

Per docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md §3.

<Objective> becomes truly pure-display. Body renders via
dangerouslySetInnerHTML inside the existing <span.body>. Trust model:
body originates from MDX source the author wrote, passes through
renderChildrenToHtml at build time; never sees runtime input. Same
trust as MDX prose generally.

Hard rename — no back-compat shim. Per CLAUDE.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: LearningObjectives — drop cloneElement, render from objectives prop

**Goal:** Replace the `Children.map` + `cloneElement` machinery with an `objectives` prop. The new shape works in both Vitest (unit tests pass `objectives={[...]}`) and production MDX (remark transform injects `objectives` before React sees the island).

**Files:**
- Modify: `packages/components/src/components/LearningObjectives/LearningObjectives.schema.ts`
- Modify: `packages/components/src/components/LearningObjectives/LearningObjectives.tsx`
- Modify: `packages/components/src/components/LearningObjectives/LearningObjectives.test.tsx`
- Modify: `packages/components/src/components/LearningObjectives/LearningObjectives.stories.tsx`

**Step 5.1 — Update schema.**

In `LearningObjectives.schema.ts`:

```ts
import { NonEmptyString } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

export const LearningObjectivesPropsSchema = z.object({
  course: NonEmptyString,
  chapter: NonEmptyString,
  id: NonEmptyString,
  heading: z.string().optional(),
  objectives: z.array(
    z.object({
      id: NonEmptyString,
      verb: NonEmptyString,
      body: NonEmptyString,
    }),
  ),
});

export type LearningObjectivesProps =
  z.infer<typeof LearningObjectivesPropsSchema>
  & {
    /**
     * Authored as `<Objective>` JSX children in MDX. The remark plugin
     * rewrites them into `objectives` before React sees them. Never
     * passed to React at runtime; only present in the type so MDX
     * authors get type-checking on `<LearningObjectives><Objective>...`.
     */
    children?: ReactNode;
  };
```

**Step 5.2 — Update component.**

Replace the body of `LearningObjectives.tsx` per the design doc §3
"LearningObjectives.tsx" section. Key changes:

- Drop `Children`, `cloneElement`, `isValidElement`, `ReactElement` imports
- Drop the `wrappedChildren = Children.map(...)` block
- Destructure `objectives` from props; do **not** destructure `children`
- Map `objectives` to `<Objective key={o.id} {...o} checked={...} onToggle={...} />`

Keep `EMPTY_RECORD` module-scoped const (the useInteractive hydration
stability workaround is still needed).

**Step 5.3 — Rewrite unit tests to use objectives prop.**

In `LearningObjectives.test.tsx`, replace `sampleChildren()` with
`sampleObjectives`:

```tsx
function sampleObjectives() {
  return [
    { id: "thesis", verb: "State", body: "the course thesis in one sentence: pretty pictures → measurements → models → inferences" },
    { id: "fls", verb: "Explain", body: "why the finite speed of light makes astronomy a 'lookback time' science" },
  ];
}
```

Callsites change from
`<LearningObjectives ...>{sampleChildren()}</LearningObjectives>`
to
`<LearningObjectives ... objectives={sampleObjectives()} />`.

The existing assertions about checkbox count, click → checked, persist → reload all keep working because the rendered DOM is identical.

**Step 5.4 — Rewrite stories.**

In `LearningObjectives.stories.tsx`, every story args object switches
from `children` to `objectives`. Inline-define `body` strings.

**Step 5.5 — Run all LearningObjectives unit tests; verify green.**

```bash
pnpm --filter @sophie/components exec vitest run src/components/LearningObjectives/LearningObjectives.test.tsx
```

**Step 5.6 — Run typecheck across components.**

```bash
pnpm --filter @sophie/components run typecheck
```

**Step 5.7 — Commit.**

```bash
git add packages/components/src/components/LearningObjectives/
git commit -m "refactor(components): LearningObjectives renders from objectives prop

Per docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md §3.

Drops Children.map + cloneElement machinery — the children-mode
design assumed React island would receive <Objective> ReactElements
as children, but Astro's island boundary serves children as
server-rendered HTML inside an <astro-slot>. Cloneelement guard
fell open in production.

New shape: objectives: { id, verb, body }[] arrives via prop;
LearningObjectives maps + renders <Objective> itself. children?:
ReactNode stays on the TypeScript type only (so MDX authors keep
type-checking on nested <Objective> JSX) — runtime never sees them
(remark transform extracts them first; see Task 6).

Unit tests rewritten to pass objectives array directly (matches the
component's actual contract; no test-only fake-MDX adapter).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Implement `transformLearningObjectives` + wire into plugin

**Goal:** Make Layer 1 and Layer 1.5 tests pass. Add the build-time transform that rewrites `<LearningObjectives><Objective>` into `<LearningObjectives objectives={[...]} />`.

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index-extractor.ts`
- Modify (after first run): `packages/astro/test/__snapshots__/transform-snapshot.test.ts.snap`

**Step 6.1 — Add the `transformLearningObjectives` function.**

In `pedagogy-index-extractor.ts`, after the existing `extractObjectives`
function (around line 638), add the full implementation from the design
doc §2 "New function" — copy verbatim, including the
`isWhitespaceTextNode` helper.

**Step 6.2 — Export the function.**

Confirm `export function transformLearningObjectives(...)` is in the
module's exports.

**Step 6.3 — Wire into the plugin pipeline.**

In `pedagogyIndexRemarkPlugin` (around line 1153), add the
`transformLearningObjectives(tree, chapterSlug)` call **after** all
existing read-only extractors:

```ts
extractDefinitions(tree, chapterSlug);
extractEquations(tree, chapterSlug);
extractKeyInsights(tree, chapterSlug);
extractFigures(tree, chapterSlug);
extractMisconceptions(tree, chapterSlug);
extractObjectives(tree, chapterSlug);
extractInlineRefUsages(tree, chapterSlug);

// PR follow-up: rewrite <LearningObjectives> AST shape so the React
// island receives a props-driven `objectives` array instead of JSX
// children (which Astro renders server-side as <astro-slot> HTML,
// breaking children-mode interactivity). Runs last so all read-only
// harvesters see the unmutated tree. See
// docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md.
transformLearningObjectives(tree, chapterSlug);
```

**Step 6.4 — Run Layer 1 test; verify green.**

```bash
pnpm --filter @sophie/astro exec vitest run test/transform-learning-objectives.test.ts
```

Expected: all 8 tests pass.

**Step 6.5 — Run Layer 1.5 snapshot test; capture snapshot.**

```bash
pnpm --filter @sophie/astro exec vitest run test/transform-snapshot.test.ts
```

First run writes `__snapshots__/transform-snapshot.test.ts.snap`.

**Step 6.6 — Eyeball the snapshot.**

```bash
cat packages/astro/test/__snapshots__/transform-snapshot.test.ts.snap
```

Verify:
- `# Chapter title` H1 unchanged
- Prose paragraphs ("Some prose with...", "More prose after.") unchanged
- `<Aside title="x">untouched aside content</Aside>` unchanged
- `<LearningObjectives>` block has empty body + an `objectives={[...]}` JSX expression attribute
- No spurious whitespace changes anywhere else

If anything looks wrong, fix the transform before committing the
snapshot. **The snapshot is part of the test contract — never commit
a snapshot that captures a broken state.**

**Step 6.7 — Run all astro tests; verify nothing else regresses.**

```bash
pnpm --filter @sophie/astro run test
```

**Step 6.8 — Commit.**

```bash
git add packages/astro/src/lib/pedagogy-index-extractor.ts
git add packages/astro/test/__snapshots__/transform-snapshot.test.ts.snap
git commit -m "feat(astro): transformLearningObjectives remark pass

Implements the remark-extraction pattern locked in the design doc.
Walks <LearningObjectives> JSX flow elements in the mdast, harvests
<Objective> children into a JS array, then mutates the parent node:
clears children, appends an `objectives` JSX attribute holding the
serialized array. Runs after all read-only harvesters so they see
the unmutated tree.

Throws on:
- Empty <LearningObjectives> block
- Non-<Objective> JSX siblings inside <LearningObjectives>
- Missing or empty id/verb/body on any <Objective>
- Duplicate <Objective id=\"...\"> within one <LearningObjectives>

Sets the platform precedent for future <Parent><Child> source-
component pairs. Per docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md §10, a generic
transformParentChildPair<T> helper extracts when the second pair ships
(YAGNI until ≥2 callers per ADR 0023).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Consumer cleanup + smoke verification + Layer 2 GREEN

**Goal:** Update the `/objectives` roll-up page consumer (still passes children) and any remaining callsites; rebuild smoke; confirm Layer 2 e2e turns green.

**Files (search and update each callsite):**
- Modify: `examples/smoke/src/pages/objectives.astro` (or wherever the roll-up route lives)
- Audit: search the repo for any other `<Objective>` callsite passing children

**Step 7.1 — Locate Objective callsites in consumer code.**

```bash
grep -rn "<Objective\b" examples/ packages/components/src --include="*.tsx" --include="*.astro" --include="*.mdx" | grep -v ".test.tsx" | grep -v ".stories.tsx"
```

For each callsite that passes children, rewrite to `body={...}`:

```diff
- <Objective id={o.id} verb={o.verb}>{o.body}</Objective>
+ <Objective id={o.id} verb={o.verb} body={o.body} />
```

The `PedagogyIndex.objectives[].body` field is already an HTML string
(produced by `renderChildrenToHtml` at extraction time) — identical
shape, drop-in change.

**Step 7.2 — Rebuild smoke.**

```bash
pnpm turbo run build --filter=smoke
```

Watch the build output for any thrown errors from the transform
(empty LO, unexpected sibling, etc.). If the transform throws, the
chapter's source has a content bug — fix the MDX before proceeding.

**Step 7.3 — Verify built HTML contains checkboxes.**

```bash
grep -c 'type="checkbox"' examples/smoke/dist/chapters/measuring-the-sky/index.html
```

Expected: ≥ 1. (Was 0 on `main`.)

**Step 7.4 — Run Playwright Layer 2 e2e; verify green.**

```bash
pnpm test:e2e -- learning-objectives.spec.ts
```

**Step 7.5 — Run Playwright 3× consecutively (per Bucket-C SoTA condition-based-waiting discipline).**

```bash
for i in 1 2 3; do
  echo "=== run $i ==="
  pnpm test:e2e -- learning-objectives.spec.ts || break
done
```

All three must pass. If any flake, investigate (do NOT increase timeouts — debug condition-based-waiting properly).

**Step 7.6 — Run full PR-level gates.**

```bash
pnpm biome check .         # 0 errors, 0 warnings
pnpm turbo run typecheck   # green
pnpm turbo run test        # green
pnpm install --frozen-lockfile  # clean
```

**Step 7.7 — Manual interactive smoke check.**

```bash
pnpm --filter smoke run dev &
# Visit http://localhost:4321/chapters/measuring-the-sky/ in a browser
# 1. Confirm at least one LO checkbox is visible
# 2. Click the checkbox → state changes to checked
# 3. Hard-reload page → state remains checked (IDB persisted)
# 4. Open browser DevTools → IndexedDB → verify a record under
#    `learning-objectives:lo:checked` with the correct value
```

Kill the dev server after.

**Step 7.8 — Commit.**

```bash
git add examples/smoke/src/ packages/components/src/
git commit -m "fix(smoke): update /objectives consumer to body prop; LO e2e green

Final consumer migration for the Objective body-prop refactor. The
/objectives roll-up page reads PedagogyIndex.objectives[].body
(already an HTML string) and passes it through to <Objective>.

Verification:
- 3x consecutive Playwright runs on learning-objectives.spec.ts: green
- Smoke build HTML contains <input type=\"checkbox\"> markers (was 0
  on main, now N per chapter)
- Manual interactive check: click → reload → state persisted via IDB

Closes the LO checkbox interactivity bug; sets the <Parent><Child>
remark-extraction pattern as platform precedent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## After Task 7: Open the PR

**Step 8.1 — Push the branch.**

```bash
git push -u origin feat/lo-checkbox-remark-extraction
```

**Step 8.2 — Open the PR.**

```bash
gh pr create --title "feat: LO checkbox interactivity via remark-extraction (sets <Parent><Child> pattern)" --body "$(cat <<'EOF'
## Summary

Fix the production-only LO checkbox bug by adding a remark-extraction pass that rewrites `<LearningObjectives><Objective>` MDX trees into a props-driven shape before the Astro island boundary. The fix codifies the durable answer for every future `<Parent><Child>` source-component pair in Sophie.

**Failure mode (empirically verified on `main`):**
- `examples/smoke/dist/chapters/measuring-the-sky/index.html` contains zero `<input type="checkbox">`
- LO island markup: `<ul><astro-slot><li class="...displayOnly_...">` — Objective renders in pure-display fallback because cloneElement never reaches it across the `<astro-slot>` boundary
- Unit tests at `LearningObjectives.test.tsx` passed green throughout, because Vitest renders plain React (no Astro island) — the bug lives at the MDX→Astro→React boundary

**Fix:**
- New `transformLearningObjectives` remark pass walks `<LearningObjectives>` mdast nodes, harvests `<Objective>` attributes + body into a JS array, clears children, appends an `objectives` JSX attribute
- `<Objective>` becomes pure-display with `body: string` prop (HTML rendered via `dangerouslySetInnerHTML`; trust model: build-time author-controlled, same as MDX prose generally)
- `<LearningObjectives>` reads `objectives` prop, renders Objectives itself with `checked` + `onToggle` wired up

**Pattern precedent:** Every future `<Aside><AsideTitle>`, `<KeyInsight><Step>`, etc. will follow the same shape — author writes nested JSX, remark transform rewrites to props, React sees a clean prop-driven component. A reusable `transformParentChildPair<T>` helper extracts when the second pair ships (YAGNI until ≥2 callers per ADR 0023).

## Reference docs

- [Overview](docs/plans/2026-05-14-lo-checkbox-remark-extraction-overview.md)
- [Engineering design](docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md)
- [Implementation plan](docs/plans/2026-05-14-lo-checkbox-remark-extraction-plan.md)

## Test plan

- [x] Layer 1 unit tests on `transformLearningObjectives` (8 cases, happy + error paths)
- [x] Layer 1.5 snapshot test on plugin round-trip (catches accidental mutation of unrelated mdast)
- [x] Layer 2 Playwright e2e on smoke (renders + persists across reload)
- [x] 3× consecutive Playwright runs green (Bucket-C SoTA condition-based-waiting discipline)
- [x] LearningObjectives + Objective unit tests rewritten to new prop shape; existing assertions preserved
- [x] axe-core a11y tests green (ADR 0004 mandatory)
- [x] `pnpm biome check` — 0 errors, 0 warnings
- [x] `pnpm turbo run typecheck` — green across all packages
- [x] `pnpm install --frozen-lockfile` — clean
- [x] Smoke production build HTML contains `<input type="checkbox">` (was 0 on main)
- [x] Manual interactive verification: click → reload → state persisted in IDB

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Risks and rollback

If anything goes catastrophically wrong, the worktree is at
`.worktrees/lo-checkbox-remark-extraction/` and the branch is local.
To abandon:

```bash
git -C /Users/anna/Teaching/sophie worktree remove .worktrees/lo-checkbox-remark-extraction
git -C /Users/anna/Teaching/sophie branch -D feat/lo-checkbox-remark-extraction
```

`main` is untouched (only the three design docs + .gitignore landed
there before this work began). Re-attempting is cheap.

## Out of scope (do not address in this PR)

Per the design doc §9:
- Generic `transformParentChildPair<T>` helper extraction (defer to 2nd caller)
- mdast-aware body serialization (no current content needs it)
- `useInteractive` object-initial hardening (separate refactor PR)
- `lookup` API uniformity refactor (separate refactor PR)
- MDX prop typecheck remark plugin (separate standalone PR)

If a subagent encounters any of these as a temptation during
implementation, **stop and surface to the user** — these are
HITL-mandated boundaries.
