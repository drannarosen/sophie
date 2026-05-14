---
title: LO checkbox interactivity fix via remark-extraction (engineering design)
date: 2026-05-14
status: ready-to-implement
phase: 2 (Bucket C follow-up, post-PR-C4)
predecessor: PR-C4 (#40) + chore/post-bucket-c-followups (#41)
overview: 2026-05-14-lo-checkbox-remark-extraction-overview.md
---

# LO checkbox remark-extraction — engineering design

This is the engineering-precision spec for the LO checkbox interactivity
fix. The product decisions, motivation, and pattern-precedent framing
live in the [overview](2026-05-14-lo-checkbox-remark-extraction-overview.md).
This doc covers exact file paths, function signatures, test assertions,
commit decomposition, and verification commands.

## 0. The failure (empirically confirmed)

Built smoke output at
`examples/smoke/dist/chapters/measuring-the-sky/index.html` contains
zero `<input type="checkbox">` elements. The LO island markup reads:

```html
<astro-island
  uid="..." component-export="LearningObjectives"
  props="{...course... chapter... id... heading...}"
  ssr client="load">
  <section class="section_IPuwE" aria-labelledby="lo-heading">
    <h2 id="lo-heading">By the end of this stub, you will:</h2>
    <ul aria-busy="true">
      <astro-slot>
        <li id="lo-stub" class="objective_UIw6H displayOnly_84DEi">
          <label class="content_NXnRn">
            <strong class="verb_3BAXV">Recognize</strong>
            <span class="body_...">this as placeholder content...</span>
          </label>
        </li>
      </astro-slot>
    </ul>
  </section>
</astro-island>
```

Diagnostic features:
1. Serialized props omit `children` — Astro renders children server-side
   as slot HTML instead of passing them through the React tree.
2. The `<astro-slot>` wrapper sits between `<ul>` and `<li>` — when the
   React island hydrates, `Children.map(children, ...)` iterates over
   slot wrappers, not `<Objective>` ReactElements.
3. The `<li>` carries `displayOnly_84DEi` — Objective's pure-display
   fallback class. The interactive path (which adds the checkbox) never
   ran.

Compare with the passing unit tests at
[LearningObjectives.test.tsx:62-79](../../packages/components/src/components/LearningObjectives/LearningObjectives.test.tsx#L62-L79):
Vitest renders plain React, no Astro island, so children arrive as
`<Objective>` ReactElements and cloneElement injection works. The bug
is production-only; coverage cannot detect it.

## 1. Architecture

The fix introduces one new layer: a **tree-rewriting pass** inside the
existing remark plugin at
[pedagogy-index-extractor.ts:1153](../../packages/astro/src/lib/pedagogy-index-extractor.ts#L1153).

Current pipeline (PR-C4):
```
MDX source
  → remark.parse → mdast tree
  → pedagogyIndexRemarkPlugin
      → extractDefinitions (read-only)
      → extractEquations (read-only)
      → extractObjectives (read-only) ← harvests data for /objectives page
      → ... (all read-only)
      → indexAccumulator.push(...) (build-global side effects)
  → @astrojs/mdx → JSX
  → Astro island system → server-rendered HTML + client hydration props
  → React island hydrates
```

After the fix:
```
MDX source
  → remark.parse → mdast tree
  → pedagogyIndexRemarkPlugin
      → extractDefinitions (read-only)
      → extractEquations (read-only)
      → extractObjectives (read-only) ← unchanged
      → transformLearningObjectives (READ + REWRITE) ← NEW
      → ... (other read-only handlers)
      → indexAccumulator.push(...)
  → @astrojs/mdx → JSX with `objectives={[...]}` prop, no children
  → Astro island system → server-rendered HTML + hydration props
      INCLUDING the objectives array (serialized into the props blob)
  → React island hydrates with objectives prop, renders Objectives itself
```

The rewrite step is **purely additive**: it doesn't replace
`extractObjectives` (which still populates the
`PedagogyIndex.objectives` consumed by the `/objectives` roll-up page),
it runs alongside.

## 2. Tree-rewrite algorithm

### New function

```ts
// packages/astro/src/lib/pedagogy-index-extractor.ts

import type { Root } from "mdast";
import { visit } from "unist-util-visit";

interface ObjectiveItem {
  id: string;
  verb: string;
  body: string;  // HTML string from renderChildrenToHtml
}

/**
 * Walks `<LearningObjectives>` JSX flow elements in the mdast tree.
 * For each, harvests `<Objective>` children into a JS array, then
 * mutates the parent node: clears children, appends an `objectives`
 * attribute holding the serialized array.
 *
 * Runs AFTER extractObjectives (so invariant errors throw before any
 * mutation occurs). Uses the same readObjectiveAttributes +
 * renderChildrenToHtml helpers as extractObjectives — single source
 * of truth.
 *
 * Throws on:
 *   - Empty <LearningObjectives> block (no <Objective> children)
 *   - Non-<Objective> JSX flow children of <LearningObjectives>
 *   - Missing or empty id/verb/body on any <Objective>
 *   - Duplicate <Objective id="..."> within one <LearningObjectives>
 *
 * The transform pattern is the durable answer for any future
 * <Parent><Child> source-component pair. See the design doc's
 * §10 "Pattern precedent" for codified guidance.
 */
export function transformLearningObjectives(
  tree: Root,
  chapterSlug: string,
): void {
  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const parent = node as MdxJsxFlowElement;
    if (parent.name !== "LearningObjectives") return;

    const items: ObjectiveItem[] = [];
    const seenIds = new Set<string>();

    for (const child of parent.children) {
      // Skip whitespace-only text nodes between siblings (mdast emits
      // these for source like `<Parent>\n  <Child>`). They carry no
      // semantic content.
      if (isWhitespaceTextNode(child)) continue;

      const el = child as MdxJsxFlowElement;
      if (
        !el ||
        typeof el !== "object" ||
        el.type !== "mdxJsxFlowElement"
      ) {
        throw new Error(
          `transform: <LearningObjectives> in chapter "${chapterSlug}" contains a non-JSX child. ` +
          `Only <Objective> JSX flow elements are allowed.`
        );
      }
      if (el.name !== "Objective") {
        throw new Error(
          `transform: <LearningObjectives> in chapter "${chapterSlug}" contains an unexpected child <${el.name}>. ` +
          `Only <Objective> children are allowed.`
        );
      }

      const attrs = readObjectiveAttributes(el);
      const id = attrs.id?.trim();
      const verb = attrs.verb?.trim();
      if (!id) {
        throw new Error(
          `transform: <Objective> in chapter "${chapterSlug}" is missing a non-empty \`id\`.`
        );
      }
      if (!verb) {
        throw new Error(
          `transform: <Objective id="${id}"> in chapter "${chapterSlug}" is missing a non-empty \`verb\`.`
        );
      }
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <Objective id="${id}"> in chapter "${chapterSlug}" has an empty body.`
        );
      }
      if (seenIds.has(id)) {
        throw new Error(
          `transform O1: duplicate <Objective id="${id}"> within one <LearningObjectives> in chapter "${chapterSlug}".`
        );
      }
      seenIds.add(id);
      items.push({ id, verb, body });
    }

    if (items.length === 0) {
      throw new Error(
        `transform: <LearningObjectives> in chapter "${chapterSlug}" has no <Objective> children. ` +
        `An empty LO block is a content bug.`
      );
    }

    parent.children = [];
    parent.attributes.push({
      type: "mdxJsxAttribute",
      name: "objectives",
      value: {
        type: "mdxJsxAttributeValueExpression",
        value: JSON.stringify(items),
      },
    });
  });
}

function isWhitespaceTextNode(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { type?: string; value?: string };
  return n.type === "text" && (n.value ?? "").trim() === "";
}
```

### Wiring into the plugin

The existing plugin entry at
[pedagogy-index-extractor.ts:1153](../../packages/astro/src/lib/pedagogy-index-extractor.ts#L1153)
gains a call to `transformLearningObjectives` after `extractObjectives`:

```ts
export function pedagogyIndexRemarkPlugin(
  options: PedagogyIndexRemarkPluginOptions = {},
) {
  return (tree: Root, file: VFile) => {
    const chapterSlug = ...; // existing logic

    extractDefinitions(tree, chapterSlug);
    extractEquations(tree, chapterSlug);
    extractKeyInsights(tree, chapterSlug);
    extractFigures(tree, chapterSlug);
    extractMisconceptions(tree, chapterSlug);
    extractObjectives(tree, chapterSlug);  // ← unchanged, read-only
    extractInlineRefUsages(tree, chapterSlug);

    transformLearningObjectives(tree, chapterSlug);  // ← NEW, runs last
  };
}
```

`transformLearningObjectives` runs **last** so all read-only harvesters
see the unmutated tree.

### Why JSON.stringify is the right serialization

The body field is an HTML string (no React, no functions). `id` and
`verb` are strings. `JSON.stringify` produces a JS literal that is valid
JSX expression syntax. Example output for the smoke chapter:

```ts
[{"id":"stub","verb":"Recognize","body":"this as placeholder content..."}]
```

@astrojs/mdx evaluates the `mdxJsxAttributeValueExpression.value` as a
real JS expression at build time. The serialized string becomes a
genuine array at runtime; Astro's island system serializes it into the
hydration props blob (alongside `course`, `chapter`, `id`, `heading`)
because it's a plain-JSON-serializable prop value.

If a future iteration moves body to mdast nodes (for inline cross-refs
inside objective text), this serializer needs replacing with mdast→JSX
conversion. The transform pattern stays compatible; only the body field
shape changes.

## 3. Component contract changes

### Objective.schema.ts

**Before:**
```ts
export const ObjectivePropsSchema = z.object({
  id: NonEmptyString,
  verb: NonEmptyString,
  children: z.custom<ReactNode>(),
  checked: z.boolean().optional(),
  onToggle: z.custom<() => void>().optional(),
});
```

**After:**
```ts
export const ObjectivePropsSchema = z.object({
  id: NonEmptyString,
  verb: NonEmptyString,
  body: NonEmptyString,  // HTML string; rendered via dangerouslySetInnerHTML
  checked: z.boolean().optional(),
  onToggle: z.custom<() => void>().optional(),
});
```

`children` drops entirely. The component becomes truly pure-display.

### Objective.tsx

**Body rendering change** at
[Objective.tsx:53](../../packages/components/src/components/Objective/Objective.tsx#L53):

```ts
// Before
<span className={styles.body}>{children}</span>

// After
<span
  className={styles.body}
  dangerouslySetInnerHTML={{ __html: body }}
/>
```

`dangerouslySetInnerHTML` is safe here: `body` originates from MDX
source the author wrote, passes through `renderChildrenToHtml` at build
time, and never sees untrusted runtime input. Same trust model as how
MDX renders prose generally.

### LearningObjectives.schema.ts

**Before:**
```ts
export const LearningObjectivesPropsSchema = z.object({
  course: NonEmptyString,
  chapter: NonEmptyString,
  id: NonEmptyString,
  heading: z.string().optional(),
  children: z.custom<ReactNode>(),
});
```

**After:**
```ts
export const LearningObjectivesPropsSchema = z.object({
  course: NonEmptyString,
  chapter: NonEmptyString,
  id: NonEmptyString,
  heading: z.string().optional(),
  objectives: z.array(z.object({
    id: NonEmptyString,
    verb: NonEmptyString,
    body: NonEmptyString,
  })),
});
```

The TypeScript-only `LearningObjectivesProps` type (inferred from the
schema) gains an explicit-not-derived `children?: ReactNode` field for
authoring-side type-checking against MDX:

```ts
export type LearningObjectivesProps =
  z.infer<typeof LearningObjectivesPropsSchema>
  & {
    /**
     * Authored as <Objective> JSX children in MDX. The remark plugin
     * rewrites them into `objectives` before React sees them. Never
     * passed to React at runtime; only present in the type so MDX
     * authors get type-checking on `<LearningObjectives><Objective>...`.
     */
    children?: ReactNode;
  };
```

The component implementation **does not destructure `children`** —
only `course`, `chapter`, `id`, `heading`, `objectives`.

### LearningObjectives.tsx

The full new body:

```tsx
import { useInteractive } from "../../runtime/useInteractive.ts";
import { Objective } from "../Objective/Objective.tsx";
import styles from "./LearningObjectives.module.css.js";
import type { LearningObjectivesProps } from "./LearningObjectives.schema.ts";

const EMPTY_RECORD: Record<string, boolean> = Object.freeze({});

export function LearningObjectives({
  course, chapter, id, heading = "Learning Objectives", objectives,
}: LearningObjectivesProps) {
  const { value: stateRecord, setValue, controlProps } =
    useInteractive<Record<string, boolean>>(
      course, chapter, `learning-objectives:${id}:checked`, EMPTY_RECORD,
    );

  return (
    <section className={styles.section} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        {heading}
      </h2>
      <ul
        className={styles.list}
        aria-busy={controlProps["aria-busy"] ? "true" : "false"}
      >
        {objectives.map((o) => {
          const checked = stateRecord[o.id] ?? false;
          return (
            <Objective
              key={o.id}
              id={o.id}
              verb={o.verb}
              body={o.body}
              checked={checked}
              onToggle={() => {
                if (controlProps.disabled) return;
                setValue({ ...stateRecord, [o.id]: !checked });
              }}
            />
          );
        })}
      </ul>
    </section>
  );
}
```

The `Children.map` + `cloneElement` machinery disappears. The shape
that worked for unit tests now works for production too, because the
data arrives through a prop instead of through React children.

### /objectives page consumer update

At the chapter-wide LO roll-up route (built in PR-C4), find the
`<Objective>...</Objective>` callsite that currently passes body as
children and rewrite to `<Objective body={...} />`. The
`PedagogyIndex.objectives[].body` field is already an HTML string —
identical shape. Single-line edit.

## 4. Test plan

### Layer 1 — unit test on the transform

New file:
`packages/astro/test/transform-learning-objectives.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { transformLearningObjectives } from "../src/lib/pedagogy-index-extractor.ts";

const processor = remark().use(remarkMdx);

function parse(src: string) {
  return processor.parse(src);
}

describe("transformLearningObjectives", () => {
  it("rewrites a single-Objective LO block to a props-driven shape", () => {
    const tree = parse(`
<LearningObjectives course="c" chapter="ch" id="lo">
  <Objective id="o1" verb="State">the thesis</Objective>
</LearningObjectives>
`);
    transformLearningObjectives(tree, "ch");
    // Walk to the LearningObjectives node; assert children === []
    // and an objectives attribute exists with one entry.
    // ... (full assertion shape)
  });

  it("rewrites multi-Objective blocks preserving source order", () => {
    // ...
  });

  it("throws on an empty <LearningObjectives> block", () => {
    expect(() => transformLearningObjectives(parse(`
<LearningObjectives course="c" chapter="ch" id="lo">
</LearningObjectives>
`), "ch")).toThrow(/empty/i);
  });

  it("throws on a non-Objective JSX sibling", () => {
    expect(() => transformLearningObjectives(parse(`
<LearningObjectives course="c" chapter="ch" id="lo">
  <Objective id="o1" verb="State">x</Objective>
  <Aside title="boo">stray</Aside>
</LearningObjectives>
`), "ch")).toThrow(/unexpected child/i);
  });

  it("throws on duplicate Objective id within one LO", () => {
    expect(() => transformLearningObjectives(parse(`
<LearningObjectives course="c" chapter="ch" id="lo">
  <Objective id="dup" verb="State">a</Objective>
  <Objective id="dup" verb="Explain">b</Objective>
</LearningObjectives>
`), "ch")).toThrow(/duplicate/i);
  });

  it("throws on missing id or verb", () => { /* ... */ });

  it("throws on empty body", () => { /* ... */ });
});
```

### Layer 1.5 — snapshot test on round-trip

New file:
`packages/astro/test/transform-snapshot.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { pedagogyIndexRemarkPlugin } from "../src/lib/pedagogy-index-extractor.ts";

describe("plugin round-trip snapshot", () => {
  it("preserves all non-LO mdast nodes verbatim", async () => {
    const input = `
# Chapter title

Some prose with **bold** and a [link](https://example.com).

<LearningObjectives course="c" chapter="ch" id="lo">
  <Objective id="o1" verb="State">the thesis</Objective>
  <Objective id="o2" verb="Explain">the reason</Objective>
</LearningObjectives>

More prose after.

<Aside title="x">untouched aside content</Aside>
`;
    const out = await remark()
      .use(remarkMdx)
      .use(pedagogyIndexRemarkPlugin, { chapterSlug: "ch" })
      .process(input);
    expect(String(out)).toMatchSnapshot();
  });
});
```

This catches accidental mutations of unrelated mdast nodes (e.g., if the
transform's `visit` callback mistakenly fires for non-`LearningObjectives`
nodes).

### Layer 2 — Playwright e2e on smoke

Extend (or create) a smoke e2e spec:
`examples/smoke/e2e/learning-objectives.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("Learning Objectives checkbox interactivity", () => {
  test("renders a checkbox for each Objective in a chapter", async ({ page }) => {
    await page.goto("/chapters/measuring-the-sky/");
    const checkboxes = page.locator(
      'ul[aria-labelledby="lo-heading"] input[type="checkbox"]'
    );
    await expect(checkboxes).toHaveCount(1);  // smoke chapter has 1 stub objective
  });

  test("clicking a checkbox sets it to checked and persists across reload",
    async ({ page }) => {
      await page.goto("/chapters/measuring-the-sky/");
      // Wait for aria-busy="false" before clicking (condition-based-waiting
      // discipline; don't use { timeout: N } knobs).
      const ul = page.locator('ul[aria-labelledby="lo-heading"]');
      await expect(ul).toHaveAttribute("aria-busy", "false");

      const checkbox = page.locator(
        'ul[aria-labelledby="lo-heading"] input[type="checkbox"]'
      ).first();
      await checkbox.check();
      await expect(checkbox).toBeChecked();

      await page.reload();
      await expect(ul).toHaveAttribute("aria-busy", "false");
      await expect(
        page.locator('ul[aria-labelledby="lo-heading"] input[type="checkbox"]')
          .first()
      ).toBeChecked();
    });
});
```

**This test currently fails** on `main` — zero checkboxes exist in the
built HTML. After the fix it passes. Three consecutive successful runs
required before claiming green (Phase-1 + Bucket-C condition-based-
waiting discipline).

### Unit-test rewrite at LearningObjectives.test.tsx

The existing test fixtures pass `sampleChildren()` (array of `<Objective>`
ReactElements). They become:

```ts
const sampleObjectives = [
  { id: "thesis", verb: "State", body: "the course thesis ..." },
  { id: "fls",    verb: "Explain", body: "why finite c ..." },
];
// callsites: <LearningObjectives ... objectives={sampleObjectives} />
```

The assertion "injects a checkbox into each Objective child" becomes
"renders one Objective per `objectives` entry with checkbox wired up."
Same coverage, new shape. The
[axe-core test at line 186](../../packages/components/src/components/LearningObjectives/LearningObjectives.test.tsx#L186)
re-runs against the new shape.

## 5. Implementation order

Branch: `feat/lo-checkbox-remark-extraction`. ~7 tasks, well past the
≥5-task threshold for
[superpowers:subagent-driven-development](https://github.com/anthropics/superpowers).
Fresh subagent per task; code-review subagent between each.

| # | Task | New/edited files | Commits |
|---|---|---|---|
| 1 | **RED** — Layer 1 transform test (failing) | `packages/astro/test/transform-learning-objectives.test.ts` | 1 |
| 2 | **RED** — Layer 1.5 snapshot test (failing — no snapshot exists yet) | `packages/astro/test/transform-snapshot.test.ts` | 1 |
| 3 | **RED** — Layer 2 Playwright spec (failing on current `main`) | `examples/smoke/e2e/learning-objectives.spec.ts` | 1 |
| 4 | Schema + Objective.tsx: drop children, add body, dangerouslySetInnerHTML | `Objective.schema.ts`, `Objective.tsx` | 1 |
| 5 | Schema + LearningObjectives.tsx: drop cloneElement, render from objectives prop | `LearningObjectives.schema.ts`, `LearningObjectives.tsx` | 1 |
| 6 | `transformLearningObjectives` + wire into plugin pipeline | `pedagogy-index-extractor.ts` | 1 |
| 7 | Consumer updates: `/objectives` page, test fixtures, stories | `apps/.../objectives/index.astro`, `LearningObjectives.test.tsx`, `LearningObjectives.stories.tsx`, `Objective.test.tsx`, `Objective.stories.tsx` | 1 |

The three RED commits ship first, so the git log reads as "wrote the
spec, then made it true." If any RED test accidentally passes on `main`,
the test isn't really exercising what we think — surface and fix before
proceeding.

Tasks 4–6 turn the tests green incrementally. Task 7 cleans up
downstream consumers. After Task 7, all three layers are green
simultaneously.

## 6. Verification gates

All gates must pass before opening the PR (per CLAUDE.md "Verification
before completion").

| Gate | Command | Expected |
|---|---|---|
| Biome | `pnpm biome check` | 0 errors, 0 warnings |
| Typecheck | `pnpm turbo run typecheck` | 0 errors across all packages |
| Tests | `pnpm turbo run test` | green; Layer 1 + 1.5 + LearningObjectives.test.tsx + Objective.test.tsx all green |
| Playwright (3×) | `pnpm test:e2e -- learning-objectives.spec.ts` × 3 | green all three runs |
| Lockfile | `pnpm install --frozen-lockfile` | clean |
| Smoke build | `pnpm turbo run build --filter=smoke` | success; built HTML contains `<input type="checkbox"` markers |
| axe-core | included in `pnpm turbo run test` | 0 violations on LO + Objective |
| Manual interactive | smoke dev server | click LO checkbox, reload, observe persisted state |

Capture HTML check inline:
```bash
pnpm turbo run build --filter=smoke
grep -c 'type="checkbox"' examples/smoke/dist/chapters/measuring-the-sky/index.html
# Expected: ≥ 1 (was 0 on `main`)
```

## 7. PR shape

- **Title:** `feat: LO checkbox interactivity via remark-extraction (sets <Parent><Child> pattern)`
- **Body:** links overview + design doc + the three RED commits as
  proof of TDD discipline; lists all verification gate results.
- **Reviewer focus:** the remark transform's idempotency + error
  handling; the `dangerouslySetInnerHTML` trust model; whether the
  `children?: ReactNode` typing trick on `LearningObjectivesProps` is
  worth the runtime/type mismatch.

## 8. Risks and mitigations

1. **MDX compiler doesn't accept the synthetic
   `mdxJsxAttributeValueExpression` shape we emit.**
   *Mitigation:* the Layer 1.5 round-trip test verifies the plugin
   output stringifies back to valid MDX. If it doesn't, the test fails
   loud at build time, before Astro is in the loop.
2. **JSON.stringify of body HTML containing embedded quotes breaks the
   JSX expression.**
   *Mitigation:* JSON.stringify escapes quotes correctly; the output is
   valid JS literal syntax. Verified by Layer 1 test assertions.
3. **`renderChildrenToHtml` produces HTML that doesn't render correctly
   when re-injected via `dangerouslySetInnerHTML`.**
   *Mitigation:* the existing `/objectives` roll-up page already
   uses this exact body HTML; the fix simply reuses it via a different
   delivery channel. Visual parity verified by smoke build inspection
   in the verification gate.
4. **Future MDX content adds inline `<GlossaryTerm>` inside an
   `<Objective>` body.**
   *Mitigation:* explicit out-of-scope in the design. When the need
   arises, swap the JSON.stringify+HTML-string path for an
   mdast-passing serializer. The transform pattern stays compatible.
5. **`useInteractive` initial-object hardening race (from
   [feedback_design_ambition.md] memory).**
   *Mitigation:* `EMPTY_RECORD` module-scoped const stays. Per the
   carry-forward followup list, the hook's internal hardening is a
   separate refactor PR.

## 9. Out of scope (explicit deferrals)

| Item | Why deferred |
|---|---|
| Generic `transformParentChildPair<T>` helper | Per ADR 0023 + DRY/YAGNI: extract on second caller, not first. Trigger condition recorded in §10. |
| mdast-aware body serialization (for inline cross-refs in objective text) | YAGNI. No current content needs it. Pattern stays compatible. |
| `useInteractive` object-initial hardening | Separate refactor PR. Carry-forward followup. |
| `lookup` API uniformity refactor | Separate refactor PR. Carry-forward followup. |
| MDX prop typecheck remark plugin | Separate standalone PR. Would catch the typing trick on `LearningObjectivesProps` automatically. |

## 10. Pattern precedent (codified)

The fix shipped here defines the durable answer for any future
`<Parent><Child>` source-component pair in Sophie. When the second pair
ships, extract a reusable helper:

```ts
function transformParentChildPair<TItem>(
  tree: Root,
  config: {
    parentName: string;
    childName: string;
    extractChild: (
      childNode: MdxJsxFlowElement,
      chapterSlug: string,
    ) => TItem;
    propName: string;
  },
  chapterSlug: string,
): void { /* ... */ }
```

**Trigger condition** for the extraction: when *any* second component
pair needs this pattern. Likely candidates:

- `<Aside><AsideTitle>` (if AsideTitle gains author-controlled props
  that need parent-injection)
- `<KeyInsight><Step>` (if step ordering and per-step state become
  requirements)
- `<Misconception><Correction>` (if corrections become structured
  children instead of prose)

When the second pair ships, the design doc for *that* PR cites this
precedent + extracts the helper in the same PR (per the engineering
principle "abstract after ≥2 callers, in the same PR as the second").

This is the architectural contribution of the LO fix. The checkbox
interactivity is the proximate goal; the pattern is the lasting one.
