# Wedge B-followup Implementation Plan (W4b — topic registry + bridge rooms + SkillReview resolver + PRA-1 graduation)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Default batch size = 3 tasks; report after each batch and wait for Anna's confirmation per the HITL mandate in `/Users/anna/Teaching/sophie/CLAUDE.md`.

**Goal:** Stand up the four locked-in W4b deliverables under [ADR 0079](../website/decisions/0079-topic-registry-and-resolution-pattern.md):

1. **Topic registry** — `src/content/topics/<category>/<topic-id>.mdx` Design F shape (frontmatter metadata + inline `<SkillReview.Card>` JSX blocks).
2. **`<SkillReview target="topic:...#card?" />` self-closing resolver** — MDX remark plugin at `packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts` that lifts card slot children into the JSX tree at compile time.
3. **Bridge rooms (ADR 0068 Scale 1)** — Section[type=bridge] hoisted to `[bridgeSlug].astro` at Course root with `getStaticPaths()`.
4. **PRA-1 graduation (WARN → ERROR)** + new **PRA-2** (topic frontmatter↔body card consistency) + new **BR-1** (bridge-slug uniqueness). PRA-1 honors `audit_overrides` per ADR 0053.

**Architecture:** Two new Zod entry types (`TopicEntry`, `CardEntry`) flow through the existing `indexAccumulator` extractor pipeline. The resolver runs **before** `pedagogyIndexRemarkPlugin` in `sophieMdxOptions.remarkPlugins` so the extractor sees expanded children. Three new audit invariants follow the existing `packages/astro/src/lib/pedagogy-audit/invariants/` shape. Smoke fixture exercises BOTH the green path (real topics cover prereqs) AND the escape path (deliberately-broken Unit with audit_overrides).

**Tech Stack:** TypeScript, Zod, Astro 6 + MDX, React 19, pnpm, Turborepo, Biome, Vitest, Playwright. No new dependencies. Worktree at `.worktrees/wedge-b-followup-w4b/`, branch `feat/wedge-b-followup-w4b` off `origin/main` at `95d5b4a` (W4a merge).

**See also:** [W4b design doc](2026-05-23-wedge-b-followup-w4b-design.md) (§3 Phase-1 touchpoint enumeration; §4 7-batch implementation strategy).

---

## Batch 1 — Worktree + ADR + design + plan metadocs (DONE)

### Task 1 — Worktree + branch + initial gates green

**Status:** ✅ Done before plan landed.

```bash
git worktree add .worktrees/wedge-b-followup-w4b -b feat/wedge-b-followup-w4b origin/main
cd .worktrees/wedge-b-followup-w4b
pnpm install --frozen-lockfile
```

Baseline (post-W4a): biome 0/0 (696 files); typecheck 11/11; e2e 157 pass / 5 skipped.

### Task 2 — ADR 0079 committed + pushed (8ea386e)

**Status:** ✅ Anna-sign-off-blocking commit landed.

### Task 3 — Design doc committed (3cd6e19)

**Status:** ✅ Done.

### Task 4 — This plan doc

**Status:** Will commit at end of plan write.

---

## Batch 2 — Schema layer: TopicEntry + CardEntry + barrel + content collection

### Task 5 — Write Zod schemas (red)

**Files to create:**
- `packages/core/src/schema/pedagogy-index-entries/topic.ts`
- `packages/core/src/schema/pedagogy-index-entries/card.ts`
- `packages/core/src/schema/pedagogy-index-entries/topic.test.ts`
- `packages/core/src/schema/pedagogy-index-entries/card.test.ts`

**Step 1: Write the failing test (`topic.test.ts`)**

```typescript
import { describe, expect, it } from "vitest";
import { TopicEntrySchema } from "./topic.ts";

describe("TopicEntrySchema", () => {
  it("parses a minimal topic with no cards/cross-refs", () => {
    const result = TopicEntrySchema.parse({
      id: "logarithms",
      label: "Logarithms",
      summary: "Functions that invert exponentiation.",
    });
    expect(result.cards).toEqual([]);
    expect(result.prereq_topic_ids).toEqual([]);
  });

  it("parses a topic with cards + cross-refs", () => {
    const result = TopicEntrySchema.parse({
      id: "logarithms",
      label: "Logarithms",
      summary: "Inverse of exponentiation.",
      prereq_topic_ids: ["exponents"],
      linked_equation_ids: ["stefan-boltzmann"],
      cards: [{ id: "product-rule", label: "Product rule", difficulty: "easy" }],
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].difficulty).toBe("easy");
  });

  it("rejects non-slug ids", () => {
    expect(() => TopicEntrySchema.parse({
      id: "Has Spaces",
      label: "X",
      summary: "y",
    })).toThrow();
  });
});
```

Mirror this for `card.test.ts` with `CardEntrySchema` (fields: `id`, `topic_id`, `label`, `difficulty?`).

**Step 2: Run tests to verify they fail**

```bash
pnpm turbo run test --filter=@sophie/core -- topic.test.ts card.test.ts
```

Expected: FAIL with "TopicEntrySchema is not a function" or similar.

**Step 3: Implement the schemas**

`packages/core/src/schema/pedagogy-index-entries/topic.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "../shared.ts";

export const TopicCardMetadataSchema = z.object({
  id: Slug,
  label: NonEmptyString,
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
export type TopicCardMetadata = z.infer<typeof TopicCardMetadataSchema>;

export const TopicEntrySchema = z.object({
  id: Slug,
  label: NonEmptyString,
  summary: NonEmptyString,
  prereq_topic_ids: z.array(Slug).default([]),
  linked_equation_ids: z.array(Slug).default([]),
  linked_misconception_ids: z.array(Slug).default([]),
  cards: z.array(TopicCardMetadataSchema).default([]),
});
export type TopicEntry = z.infer<typeof TopicEntrySchema>;
```

`packages/core/src/schema/pedagogy-index-entries/card.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "../shared.ts";

export const CardEntrySchema = z.object({
  id: Slug,
  topic_id: Slug,
  label: NonEmptyString,
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
export type CardEntry = z.infer<typeof CardEntrySchema>;
```

**Step 4: Re-run tests, expect green**

**Step 5: Commit**

```bash
git add packages/core/src/schema/pedagogy-index-entries/topic.ts \
        packages/core/src/schema/pedagogy-index-entries/card.ts \
        packages/core/src/schema/pedagogy-index-entries/topic.test.ts \
        packages/core/src/schema/pedagogy-index-entries/card.test.ts
git commit -m "feat(W4b-core): TopicEntry + CardEntry Zod schemas"
```

### Task 6 — Update entries barrel + PedagogyIndex schema

**Files to modify:**
- `packages/core/src/schema/pedagogy-index-entries/index.ts` — add topic + card exports
- `packages/core/src/schema/pedagogy-index.ts` — add `topics: TopicEntry[]` + `cards: CardEntry[]` to PedagogyIndex shape

**Step 1: Update barrel**

Add to `index.ts`:

```typescript
export { type TopicEntry, TopicEntrySchema, type TopicCardMetadata, TopicCardMetadataSchema } from "./topic.ts";
export { type CardEntry, CardEntrySchema } from "./card.ts";
```

**Step 2: Update PedagogyIndex (read the file first to locate insertion point — likely an object schema composed of arrays per entry type)**

```typescript
// Inside PedagogyIndexSchema's z.object({ ... })
topics: z.array(TopicEntrySchema).default([]),
cards: z.array(CardEntrySchema).default([]),
```

**Step 3: Test that existing PedagogyIndex tests still pass + topics/cards default to []**

```bash
pnpm turbo run test --filter=@sophie/core
```

**Step 4: Commit**

```bash
git commit -m "feat(W4b-core): surface TopicEntry + CardEntry in PedagogyIndex"
```

### Task 7 — Add `topics` content collection config (smoke)

**File to modify:** `examples/smoke/src/content.config.ts`

**Step 1: Read the existing config to learn the pattern (sections, units, etc.)**

**Step 2: Add the topics collection**

```typescript
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { TopicEntrySchema } from "@sophie/core/schema";

const topics = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/topics" }),
  schema: TopicEntrySchema,
});
```

Add `topics` to the `collections` export.

**Step 3: Verify `pnpm turbo run build --filter=smoke` still passes** (no topics exist yet; empty collection is fine).

**Step 4: Commit**

```bash
git commit -m "feat(W4b-smoke): topics content collection (Design F glob loader)"
```

### Task 8 — Author the first topic fixture (`topics/math/exponents.mdx`)

**File to create:** `examples/smoke/src/content/topics/math/exponents.mdx`

**Step 1: Write the file**

```mdx
---
id: exponents
label: Exponents
summary: |
  Power-law multiplication; the foundation for logarithms and
  scientific notation.
cards:
  - id: power-laws
    label: Power laws
    difficulty: easy
---

<SkillReview.Card id="power-laws">
  <SkillReview.Prompt>
    What does $b^m \cdot b^n$ equal?
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $b^{m+n}$ — multiplying same-base powers adds the exponents.
  </SkillReview.Answer>
</SkillReview.Card>
```

**Step 2: Verify build still passes** — content collection should now report 1 topic entry.

**Step 3: Commit**

```bash
git commit -m "feat(W4b-smoke): first topic fixture — topics/math/exponents.mdx"
```

### Task 9 — Author the multi-card topic fixture (`topics/math/logarithms.mdx`)

**File to create:** `examples/smoke/src/content/topics/math/logarithms.mdx`

```mdx
---
id: logarithms
label: Logarithms
summary: |
  Functions that invert exponentiation; map products to sums.
prereq_topic_ids: [exponents]
cards:
  - id: product-rule
    label: Product rule
    difficulty: easy
  - id: power-rule
    label: Power rule
    difficulty: medium
  - id: change-of-base
    label: Change of base
    difficulty: hard
---

<SkillReview.Card id="product-rule">
  <SkillReview.Prompt>
    What does $\log_b(xy)$ equal?
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $\log_b(x) + \log_b(y)$ — logarithms turn products into sums.
  </SkillReview.Answer>
</SkillReview.Card>

<SkillReview.Card id="power-rule">
  <SkillReview.Prompt>
    What does $\log_b(x^n)$ equal?
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $n \cdot \log_b(x)$ — the exponent comes down as a multiplier.
  </SkillReview.Answer>
</SkillReview.Card>

<SkillReview.Card id="change-of-base">
  <SkillReview.Prompt>
    Express $\log_2(x)$ using natural log.
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $\log_2(x) = \ln(x) / \ln(2)$ — divide by $\ln$ of the new base.
  </SkillReview.Answer>
</SkillReview.Card>
```

**Step 2: Build to confirm.**

**Step 3: Commit Batch 2**

```bash
git commit -m "feat(W4b-smoke): multi-card topic fixture — topics/math/logarithms.mdx"
```

---

## Batch 3 — Topic extractor + accumulator wiring

### Task 10 — Write extractor test (red)

**File to create:** `packages/astro/src/lib/pedagogy-index/extractors/topic.test.ts`

Pattern follows `definitions.test.ts` and `retrieval-prompt.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import { extractTopicAndCards } from "./topic.ts";

function parseTopic(source: string) {
  return fromMarkdown(source, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });
}

describe("extractTopicAndCards", () => {
  it("emits a TopicEntry from frontmatter + CardEntry[] from body", () => {
    const tree = parseTopic(`<SkillReview.Card id="rule-1"><SkillReview.Prompt>Q?</SkillReview.Prompt><SkillReview.Answer>A.</SkillReview.Answer></SkillReview.Card>`);
    const frontmatter = {
      id: "logarithms",
      label: "Logarithms",
      summary: "...",
      cards: [{ id: "rule-1", label: "Rule 1" }],
    };
    const result = extractTopicAndCards(tree, frontmatter);
    expect(result.topic.id).toBe("logarithms");
    expect(result.cards).toEqual([
      { id: "rule-1", topic_id: "logarithms", label: "Rule 1" },
    ]);
  });

  it("returns empty cards if body has no SkillReview.Card blocks", () => {
    const tree = parseTopic(``);
    const result = extractTopicAndCards(tree, {
      id: "x", label: "X", summary: "y", cards: [],
    });
    expect(result.cards).toEqual([]);
  });
});
```

**Step 2: Test fails** (extractor doesn't exist).

**Step 3: Implement extractor in `packages/astro/src/lib/pedagogy-index/extractors/topic.ts`**

```typescript
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  type CardEntry,
  type TopicEntry,
  TopicEntrySchema,
} from "@sophie/core/schema";

export function extractTopicAndCards(
  tree: Root,
  frontmatter: unknown,
): { topic: TopicEntry; cards: CardEntry[] } {
  const topic = TopicEntrySchema.parse(frontmatter);
  const cards: CardEntry[] = [];
  visit(tree, "mdxJsxFlowElement", (node) => {
    if (node.name !== "SkillReview.Card") return;
    const idAttr = node.attributes?.find((a) => a.type === "mdxJsxAttribute" && a.name === "id");
    const cardId = typeof idAttr?.value === "string" ? idAttr.value : null;
    if (!cardId) return;
    const meta = topic.cards.find((c) => c.id === cardId);
    if (!meta) return;  // PRA-2 will catch this
    cards.push({
      id: meta.id,
      topic_id: topic.id,
      label: meta.label,
      difficulty: meta.difficulty,
    });
  });
  return { topic, cards };
}
```

**Step 4: Tests pass.**

**Step 5: Commit**

```bash
git commit -m "feat(W4b-astro): topic + card extractor (Topic.Card JSX walker)"
```

### Task 11 — Extend accumulator with `addTopic` + `addCard`

**File to modify:** `packages/astro/src/lib/pedagogy-index/accumulator.ts`

**Step 1: Read the existing accumulator to learn the add-X pattern (e.g., `addDefinition`, `addKeyInsight`)**

**Step 2: Add `topics: TopicEntry[]` + `cards: CardEntry[]` to internal state**

**Step 3: Add `addTopic(t: TopicEntry)` + `addCard(c: CardEntry)` methods**

**Step 4: Update `asPedagogyIndex()` to include `topics` + `cards` in returned shape**

**Step 5: Write/update accumulator unit tests covering the new methods**

**Step 6: Commit**

```bash
git commit -m "feat(W4b-astro): accumulator gains addTopic + addCard + topics/cards in PedagogyIndex"
```

### Task 12 — Wire extractor into orchestrator

**File to modify:** `packages/astro/src/lib/pedagogy-index/orchestrator.ts`

The existing orchestrator imports each extractor and wires it into the MDX-compile-time pipeline. Topic extractor is invoked per-topic-content-collection-file at index-population time, not per-chapter-MDX. Pattern likely needs a separate hook.

**Step 1: Read orchestrator's existing iteration over content collections**

**Step 2: Add a topic-collection iteration that calls `extractTopicAndCards` per topic MDX file + populates `indexAccumulator` via `addTopic` + `addCard`**

**Step 3: Smoke build — verify `dist/.sophie-pedagogy-index.json` includes topics + cards arrays**

```bash
pnpm turbo run build --filter=smoke
jq '.topics | length, .cards | length' examples/smoke/dist/.sophie-pedagogy-index.json
```

Expected: 2 (topics: exponents, logarithms), 4 (cards: power-laws, product-rule, power-rule, change-of-base).

**Step 4: Commit Batch 3**

```bash
git commit -m "feat(W4b-astro): topic-collection iteration in orchestrator populates accumulator"
```

---

## Batch 4 — SkillReview self-closing MDX remark plugin

### Task 13 — Write resolver plugin tests (red)

**File to create:** `packages/astro/src/lib/mdx-plugins/skill-review-resolver.test.ts`

Test cases to cover:

1. Self-closing form with single-card topic auto-picks the card.
2. Self-closing form with explicit `topic:X#card` resolves the specified card.
3. Self-closing form against multi-card topic with NO fragment throws ERROR with curated message naming available cards.
4. Self-closing form against unknown topic throws ERROR.
5. Self-closing form against `topic:X#nonexistent-card` throws ERROR.
6. Explicit-children form (`<SkillReview><SkillReview.Prompt>...</SkillReview.Answer></SkillReview>`) is left untouched.
7. Plugin runs before pedagogy-index extractor — resolved children are walked by downstream plugins.

Sample test:

```typescript
import { describe, expect, it } from "vitest";
import { skillReviewResolverRemarkPlugin } from "./skill-review-resolver.ts";
// + parse + apply plugin helper

describe("skill-review-resolver", () => {
  it("resolves single-card topic bare target", async () => {
    const input = `<SkillReview target="topic:exponents" />`;
    const output = await applyPlugin(input, { topicsDir: FIXTURE_DIR });
    expect(output).toContain(`<SkillReview.Prompt>`);
    expect(output).toContain(`What does $b^m \\cdot b^n$ equal?`);
  });

  it("throws on bare multi-card target with curated message", async () => {
    const input = `<SkillReview target="topic:logarithms" />`;
    await expect(applyPlugin(input, { topicsDir: FIXTURE_DIR }))
      .rejects.toThrow(/has 3 cards.*specify one.*product-rule.*power-rule.*change-of-base/s);
  });

  it("resolves explicit topic:X#card target", async () => {
    const input = `<SkillReview target="topic:logarithms#product-rule" />`;
    const output = await applyPlugin(input, { topicsDir: FIXTURE_DIR });
    expect(output).toContain(`What does $\\log_b(xy)$ equal?`);
  });

  // ... etc.
});
```

**Step 2: Tests fail — plugin doesn't exist.**

### Task 14 — Implement resolver plugin (green)

**File to create:** `packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`

```typescript
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { glob } from "glob";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import { matter } from "vfile-matter";
import { visit, SKIP } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, MdxJsxFlowElement } from "mdast";

export interface SkillReviewResolverOptions {
  /** Absolute path to the topics/ content directory. */
  topicsDir: string;
}

export const skillReviewResolverRemarkPlugin: Plugin<[SkillReviewResolverOptions], Root> =
  (options) => (tree, file) => {
    visit(tree, "mdxJsxFlowElement", (node, index, parent) => {
      if (node.name !== "SkillReview") return;
      if (node.children.length > 0) return;  // explicit-children form

      const target = readAttribute(node, "target");
      if (!target?.startsWith("topic:")) {
        throw resolverError(file, node, "non-topic targets reserved for future ADRs");
      }
      const [topicId, cardId] = parseTarget(target);
      const topicFile = findTopicFile(options.topicsDir, topicId);
      if (!topicFile) throw resolverError(file, node, `unknown topic "${topicId}"`);

      const topicAst = parseTopicMdx(topicFile);
      const cards = findCardBlocks(topicAst);
      if (cards.length === 0) throw resolverError(file, node, `topic "${topicId}" has no cards`);

      const chosen = cardId
        ? cards.find((c) => c.id === cardId)
        : cards.length === 1 ? cards[0] : null;
      if (!chosen) {
        if (cardId) {
          throw resolverError(file, node, `card "${cardId}" not found in topic "${topicId}". Available: ${cards.map(c => c.id).join(", ")}`);
        }
        throw resolverError(file, node,
          `<SkillReview target="topic:${topicId}" /> is ambiguous. Topic "${topicId}" has ${cards.length} cards; specify one:\n${
            cards.map(c => `  - topic:${topicId}#${c.id}`).join("\n")
          }`);
      }

      // Lift the card's slot children into the parent SkillReview node.
      const promptSlot = findSlotChild(chosen.node, "SkillReview.Prompt");
      const answerSlot = findSlotChild(chosen.node, "SkillReview.Answer");
      if (!promptSlot || !answerSlot) {
        throw resolverError(file, node, `card "${cardId}" in topic "${topicId}" missing SkillReview.Prompt or SkillReview.Answer`);
      }
      node.children = [promptSlot, answerSlot];
    });
  };

// ... helpers: readAttribute, parseTarget, findTopicFile (glob topics/**/*.mdx for matching id),
//     parseTopicMdx (fromMarkdown + mdxjs), findCardBlocks, findSlotChild, resolverError
```

**Step 2: Tests pass.**

**Step 3: Commit**

```bash
git commit -m "feat(W4b-astro): SkillReview self-closing resolver remark plugin"
```

### Task 15 — Wire plugin into mdx-config.ts

**File to modify:** `packages/astro/src/mdx-config.ts`

**Step 1: Read existing `sophieMdxOptions`**

**Step 2: Add resolver plugin AFTER remarkMath, BEFORE pedagogyIndexRemarkPlugin**

```typescript
import { skillReviewResolverRemarkPlugin } from "./lib/mdx-plugins/skill-review-resolver.ts";

export const sophieMdxOptions = {
  remarkPlugins: [
    remarkGfm,
    remarkFrontmatter,
    remarkMath,
    [skillReviewResolverRemarkPlugin, { topicsDir: "./src/content/topics" }],  // ← new
    pedagogyIndexRemarkPlugin,
  ],
  rehypePlugins: [rehypeKatex],
};
```

NOTE: `topicsDir` needs to resolve relative to the consumer's project root. The hardcoded relative path works for smoke but the real shape may need a config-passing mechanism. For W4b, default to `./src/content/topics`; document the limitation.

**Step 3: Build smoke**

```bash
pnpm turbo run build --filter=smoke --force
```

Expected: build succeeds; no resolver errors (no self-closing forms in chapter content yet).

**Step 4: Commit Batch 4**

```bash
git commit -m "feat(W4b-astro): wire SkillReview resolver into MDX plugin chain"
```

---

## Batch 5 — Convert a smoke chapter callsite + verify resolution

### Task 16 — Swap one chapter's `<SkillReview>` to self-closing form

**File to modify:** A reading.mdx that currently has `<SkillReview target="topic:exponents" ...>` (likely `examples/smoke/src/content/sections/foundations/units/spoiler-alerts/reading.mdx` based on the audit baseline).

**Step 1: Grep for existing SkillReview callsites**

```bash
rg -n '<SkillReview' examples/smoke/src/content/
```

**Step 2: For ONE callsite using `topic:exponents`, swap explicit-children → self-closing:**

```diff
- <SkillReview target="topic:exponents" course="..." unit="...">
-   <SkillReview.Prompt>...</SkillReview.Prompt>
-   <SkillReview.Answer>...</SkillReview.Answer>
- </SkillReview>
+ <SkillReview target="topic:exponents" course="..." unit="..." />
```

(Keep `course` + `unit` attributes — required by SkillReview's schema; only children get lifted.)

**Step 3: Build + inspect**

```bash
pnpm turbo run build --filter=smoke --force
```

Verify the rendered HTML at `dist/units/spoiler-alerts/reading/index.html` includes the expected prompt + answer content (from `topics/math/exponents.mdx`).

**Step 4: Run existing e2e against the modified chapter**

```bash
pnpm exec playwright test e2e/skill-review.spec.ts  # or whichever spec covers it
```

Should pass — rendered DOM is identical to the pre-swap state.

**Step 5: Commit Batch 5 (one task)**

```bash
git commit -m "feat(W4b-smoke): exercise self-closing SkillReview resolver in spoiler-alerts reading"
```

---

## Batch 6 — PRA-1 graduation + audit_overrides + PRA-2

### Task 17 — Write PRA-1 ERROR + audit_overrides honoring tests (red)

**File to modify:** `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.test.ts`

Add tests:

1. PRA-1 emits ERROR (not WARNING) when prereq has no covering SkillReview.
2. PRA-1 SUPPRESSES the finding when chapter has `audit_overrides: [{invariant: PRA-1, anchor: <topic>, tdr: TDR-XX, reason: "..."}]`.
3. PRA-1 still fires when override is `invariant: PRA-1` but `anchor` doesn't match (grain-2 specificity).

**Step 2: Tests fail (severity is still WARNING; audit_overrides not yet honored).**

### Task 18 — Flip PRA-1 severity + wire audit_overrides

**Files to modify:**
- `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts` — line ~108: `severity: "WARNING"` → `severity: "ERROR"`.
- `packages/astro/src/lib/pedagogy-audit/runner.ts` — load `audit_overrides` from chapter frontmatter; pass to invariants; invariants check overrides before emitting findings.

The runner-side change is the load-bearing piece. Per [ADR 0053 §"audit_overrides chapter frontmatter"](../website/decisions/0053-conformance-failure-modes.md), the shape is:

```yaml
audit_overrides:
  - invariant: PRA-1
    anchor: logarithms
    tdr: TDR-XX
    reason: "..."
```

The runner reads each chapter's frontmatter `audit_overrides[]`, indexes by `(invariant, anchor?)`, and provides a `shouldSuppress(invariantCode, location)` helper. Each invariant calls this before emitting via `sink.error/warning/info`.

**Step 2: Tests pass.**

**Step 3: Commit**

```bash
git commit -m "feat(W4b-astro): PRA-1 graduation WARN → ERROR + audit_overrides honoring per ADR 0053"
```

### Task 19 — Write PRA-2 (frontmatter↔body card consistency) test (red)

**File to create:** `packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.test.ts`

```typescript
describe("PRA-2 — topic frontmatter ↔ body card consistency", () => {
  it("passes when frontmatter cards match body SkillReview.Card blocks", () => { /* ... */ });
  it("ERRORs when frontmatter declares card not in body", () => { /* ... */ });
  it("ERRORs when body has SkillReview.Card not in frontmatter", () => { /* ... */ });
});
```

### Task 20 — Implement PRA-2

**File to create:** `packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.ts`

```typescript
export function checkTopicCardConsistency(index: PedagogyIndex, sink: AuditSink) {
  for (const topic of index.topics) {
    const declaredCardIds = new Set(topic.cards.map(c => c.id));
    const actualCardIds = new Set(
      index.cards.filter(c => c.topic_id === topic.id).map(c => c.id),
    );
    for (const declared of declaredCardIds) {
      if (!actualCardIds.has(declared)) {
        sink.error({ code: "PRA-2", severity: "ERROR",
          message: `Topic "${topic.id}" frontmatter declares card "${declared}" but no <SkillReview.Card id="${declared}"> block found in body.`,
        });
      }
    }
    for (const actual of actualCardIds) {
      if (!declaredCardIds.has(actual)) {
        sink.error({ code: "PRA-2", severity: "ERROR",
          message: `Topic "${topic.id}" body has <SkillReview.Card id="${actual}"> but card is not declared in frontmatter cards: [].`,
        });
      }
    }
  }
}
```

**Step 2: Wire into `runner.ts` alongside other invariants.**

**Step 3: Tests pass.**

**Step 4: Commit Batch 6**

```bash
git commit -m "feat(W4b-astro): PRA-2 audit invariant — topic frontmatter ↔ body card consistency"
```

---

## Batch 7 — Bridge rooms + BR-1 audit

### Task 21 — Extend SectionEntrySchema for `type: bridge`

**File to verify/modify:** `packages/core/src/schema/pedagogy-index-entries/section.ts`

If `type` enum already includes `bridge` (per ADR 0067), skip. Otherwise extend.

### Task 22 — Author a bridge Section in smoke

**Files to create:**
- `examples/smoke/src/content/sections/math-fundamentals/section.yaml`
- `examples/smoke/src/content/sections/math-fundamentals/units/logarithms-skill/unit.yaml`
- Possibly an artifact under that unit if existing rendering requires it.

`section.yaml`:

```yaml
id: math-fundamentals
slug: math-fundamentals
title: Math Fundamentals
type: bridge
order: 0
description: |
  Math prerequisites for ASTR 201 — logarithms, exponents,
  basic algebra. Refresh before the first content section.
```

`unit.yaml`:

```yaml
id: logarithms-skill
slug: logarithms-skill
title: Logarithms
type: skill
section_id: math-fundamentals
topic_id: logarithms
order: 0
```

### Task 23 — Add `[bridgeSlug].astro` dynamic route (red test first)

**File to create:** `examples/smoke/e2e/bridge-rooms.spec.ts`

```typescript
test("bridge room renders at /<bridge-slug>", async ({ page }) => {
  await page.goto("/math-fundamentals");
  await expect(page).toHaveTitle(/Math Fundamentals/);
  await expect(page.locator("h1")).toContainText("Math Fundamentals");
});

test("bridge room is axe-clean", async ({ page }) => {
  // ...
});
```

**Test fails** (route doesn't exist).

### Task 24 — Implement `[bridgeSlug].astro`

**File to create:** `examples/smoke/src/pages/[bridgeSlug].astro`

```astro
---
import TextbookHead from "@sophie/astro/components/TextbookHead.astro";
import TextbookLayout from "@sophie/astro/components/TextbookLayout.astro";
import { SophieChapter } from "@sophie/astro/client";
import { getCollection } from "astro:content";
import { figures as figureRegistry } from "../content/figures";

export async function getStaticPaths() {
  const sections = await getCollection("sections");
  const bridges = sections.filter((s) => s.data.type === "bridge");
  return bridges.map((s) => ({
    params: { bridgeSlug: s.data.slug },
    props: { section: s.data },
  }));
}

const { section } = Astro.props;
const figureRegistryArray = Object.values(figureRegistry);
---

<html lang="en">
  <head>
    <title>{section.title}</title>
    <TextbookHead />
  </head>
  <body>
    <SophieChapter client:load>
      <TextbookLayout figureRegistry={figureRegistryArray}>
        <h1>{section.title}</h1>
        {section.description && <p>{section.description}</p>}
        {/* Future: render Unit[skill] children */}
      </TextbookLayout>
    </SophieChapter>
  </body>
</html>
```

**Step 2: Tests pass.**

**Step 3: Commit**

```bash
git commit -m "feat(W4b-smoke): bridge room route — [bridgeSlug].astro with getStaticPaths"
```

### Task 25 — BR-1 audit invariant (slug uniqueness)

**Files to create:**
- `packages/astro/src/lib/pedagogy-audit/invariants/bridge-uniqueness.test.ts`
- `packages/astro/src/lib/pedagogy-audit/invariants/bridge-uniqueness.ts`

**BR-1 rule:** for each Section with `type: bridge`, its `slug` must NOT collide with:
- Any other Section's `slug`
- Any Unit's `slug`
- Reserved Library paths: `library`, `sections`, `units`, `topics`

**Step 1: TDD red — tests for legitimate slug, collision with another bridge, collision with regular section, collision with reserved path.**

**Step 2: Implement + wire into runner.**

**Step 3: Smoke build green; commit.**

### Task 26 — audit_overrides demo fixture (deliberately-broken prereq)

**Files to create/modify:**
- A new TDR file at `examples/smoke/teaching-decisions/TDR-XX-w4b-pra-1-fixture.md` (verify Sophie's TDR location convention).
- Modify one Unit (e.g., add a synthetic `prereqs: [nonexistent-topic]` to an existing unit OR create a new fixture unit).
- That unit's frontmatter gets:

```yaml
audit_overrides:
  - invariant: PRA-1
    anchor: nonexistent-topic
    tdr: TDR-XX-w4b-pra-1-fixture
    reason: |
      Deliberate W4b test fixture: exercises PRA-1's
      audit_overrides escape path through the graduated
      ERROR severity. The "nonexistent-topic" prereq is
      intentionally uncovered; override demonstrates that
      authors can opt out per-callsite with TDR provenance.
```

**Step 2: Smoke build green** — override suppresses the PRA-1 finding.

**Step 3: Test fixture: temporarily remove the override → build fails with PRA-1 ERROR.**

**Step 4: Commit**

```bash
git commit -m "feat(W4b-smoke): audit_overrides demo fixture exercising PRA-1 ERROR escape"
```

---

## Batch 8 — Topic Spec page + Library hub update

### Task 27 — Topic Spec page e2e + dynamic route

**Files to create:**
- `examples/smoke/e2e/topic-spec.spec.ts`
- `examples/smoke/src/pages/library/topics/[topicId].astro`

E2e test:

```typescript
test("/library/topics/logarithms renders topic + cards", async ({ page }) => {
  await page.goto("/library/topics/logarithms");
  await expect(page.locator("h1")).toContainText("Logarithms");
  await expect(page.locator("text=Product rule")).toBeVisible();
  await expect(page.locator("text=Power rule")).toBeVisible();
});
```

Route implementation lists cards inline (each as a `<SkillReview.Card>` rendered standalone, OR a custom flat rendering of prompt+answer).

**Step 2: Tests pass. Commit.**

### Task 28 — Library hub gains Topics tile

**File to modify:** `examples/smoke/src/pages/library/index.astro`

Add a Topics entry to the `rooms` array:

```diff
const rooms = [
  { href: "/library/glossary", title: "Glossary", ... },
+ { href: "/library/topics", title: "Topics", description: "Prerequisite skill review cards." },
  ...
];
```

(May need a `/library/topics/index.astro` listing all topics, OR keep the hub link pointing to a generated topic Spec page.)

**Step 2: Build + e2e green. Commit Batch 8.**

```bash
git commit -m "feat(W4b-smoke): Library hub gains Topics tile + /library/topics Spec route"
```

---

## Batch 9 — Docs sweep + ADR revisions

### Task 29 — `chapter-components.md` updates

**File to modify:** `docs/website/reference/chapter-components.md`

Add:

- Topics-room section under "Course-level pages" table: `/library/topics` row.
- New §"Topic registry" describing the topic file shape (Design F) + `<SkillReview target="topic:..." />` self-closing form authoring.
- Note: bridge rooms render at Course root via `[bridgeSlug].astro`; authored as `Section[type=bridge]` in `section.yaml`.

### Task 30 — `audit-baseline.md` updates

**File to modify:** `docs/website/reference/audit-baseline.md`

- PRA-1 row: severity WARNING → ERROR. Update count expectation (smoke should now have 0 PRA-1 findings without overrides, since topics cover prereqs).
- New PRA-2 row.
- New BR-1 row.
- Note the audit_overrides demo fixture in the "Accepted findings" table.

### Task 31 — ADR 0068 revision history

**File to modify:** `docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md`

Add `## Revision history` entry: W4b ships Scale 1 bridge rooms (route + audit); Scale 2 inline `Section[type=bridge]` deferred; `<SkillReview target="topic:...">` self-closing resolver shipped.

### Task 32 — ADR 0079 status flip + validation.md regen

ADR 0079 status: `proposed` → `accepted` (W4b implementation evidence is the validation).

```bash
pnpm tsx scripts/regenerate-validation-index.mts
```

**Step 4: Commit Batch 9**

```bash
git commit -m "docs(W4b): sweep chapter-components.md + audit-baseline.md + ADR 0068 revision + ADR 0079 accepted"
```

---

## Batch 10 — Pre-PR gates

### Task 33 — Lockfile check

```bash
pnpm install --frozen-lockfile 2>&1 | tail -3
```

### Task 34 — Biome zero-warning gate

```bash
pnpm exec biome check 2>&1 | tee /tmp/biome-w4b.log | tail -3
grep -E "(error|warning)" /tmp/biome-w4b.log
```

Expected: tail says "No fixes applied"; grep returns nothing.

### Task 35 — Typecheck force

```bash
pnpm turbo run typecheck --force 2>&1 | tail -10
```

### Task 36 — Full unit suite

```bash
pnpm turbo run test --filter='@sophie/*' --force 2>&1 | tail -10
```

### Task 37 — Smoke build

```bash
pnpm turbo run build --filter=smoke --force 2>&1 | tail -10
```

Verify: 
- `dist/library/topics/logarithms/index.html` exists.
- `dist/library/topics/exponents/index.html` exists.
- `dist/math-fundamentals/index.html` exists (bridge room).
- Pagefind index covers new routes.

### Task 38 — Full e2e

```bash
lsof -ti:4321 | xargs -r kill; sleep 1
pnpm exec playwright test 2>&1 | tail -10
```

Expected: ~160+ passed (157 baseline + new bridge + topic-spec + resolver-exercise specs).

---

## Batch 11 — R+CR + Pilot report + PR

### Task 39 — Request code review

Dispatch `superpowers:requesting-code-review` with:

- WHAT_WAS_IMPLEMENTED: topic registry + resolver + bridge rooms + PRA-1 graduation + PRA-2 + BR-1.
- PLAN_OR_REQUIREMENTS: this plan + design doc + ADR 0079.
- BASE_SHA: `95d5b4a` (W4a merge, origin/main).
- HEAD_SHA: current.

Address Critical + Important findings before PR.

### Task 40 — Pilot report

**File to create:** `docs/website/pilots/wedge-b-followup-w4b-affordances.md`

Shape α per ADR 0064 + W4a precedent. Sections:

1. What shipped (4 affordances + 3 audits).
2. Estimates vs. actuals.
3. W3 + W4a doctrine review (R1–R5).
4. Surprises (TBD — document during execution).
5. Doctrine refinements.
6. Handoff to W4c.

### Task 41 — Open PR

**PAUSE for Anna's explicit text confirm per `feedback_no_questions_mode_scope`.**

When confirmed:

```bash
gh pr create --title "feat(W4b): wedge B-followup W4b — topic registry + bridge rooms + SkillReview resolver + PRA-1 ERROR" --base main --head feat/wedge-b-followup-w4b --body "$(cat <<'EOF'
[full PR description per gh-pr skill]
EOF
)"
```

---

## Verification — End-to-end summary

After every batch:

1. `git status` — confirm scope.
2. Biome zero-warning gate.
3. Typecheck force.
4. Relevant test slice green.

End-to-end at Batch 10:

- biome 0/0
- typecheck 11/11 force
- unit suite full green
- smoke build with /library/topics/<id>/, /math-fundamentals/ routes
- e2e suite full green
- Pagefind index includes new URLs
- audit-baseline.md reflects new invariants (PRA-1 ERROR, PRA-2, BR-1)

---

## References

- [W4 meta-plan](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md)
- [ADR 0079](../website/decisions/0079-topic-registry-and-resolution-pattern.md) — canonical source of truth
- [W4b design doc](2026-05-23-wedge-b-followup-w4b-design.md)
- [W4a pilot](../website/pilots/wedge-b-followup-w4a-library-routes.md) — doctrine source
- [ADR 0053](../website/decisions/0053-conformance-failure-modes.md) — `audit_overrides` shape
- [ADR 0068](../website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md) — bridge rooms + SkillReview target
- [ADR 0070](../website/decisions/0070-library-room-and-registry-spec-pages.md) — Library URL convention
