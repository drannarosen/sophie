import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mathFromMarkdown } from "mdast-util-math";
import { mdxFromMarkdown } from "mdast-util-mdx";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { math } from "micromark-extension-math";
import { mdxjs } from "micromark-extension-mdxjs";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";

/**
 * SkillReview self-closing resolver remark plugin (ADR 0079).
 *
 * At MDX compile time, expands every `<SkillReview target="topic:X[#card]" />`
 * self-closing form by reading the referenced topic file's body,
 * finding the matching `<SkillReview.Card>` block, and lifting its
 * `<SkillReview.Prompt>` + `<SkillReview.Answer>` slot children into
 * the JSX tree as the SkillReview's new children.
 *
 * Plugin order: this MUST run BEFORE `pedagogyIndexRemarkPlugin` in
 * `sophieMdxOptions.remarkPlugins` so the index extractor sees the
 * expanded (children-present) shape.
 *
 * The plugin is non-destructive on the explicit-children form: if the
 * author wrote `<SkillReview>` with Prompt + Answer slots inline,
 * the plugin leaves the node alone. Authors retain inline authoring
 * for one-off prompts that don't warrant a topic-registry entry.
 *
 * Per ADR 0079 Q6: bare `topic:X` against a multi-card topic throws
 * a build-time ERROR with a curated message naming the available
 * cards. Bare `topic:X` against a single-card topic auto-picks the
 * one card.
 *
 * AST mutation: per unified's transformer contract the plugin
 * mutates the input tree in place (`flow.children = [prompt, answer]`).
 * The Prompt + Answer slot nodes are reused verbatim from the topic
 * file's parsed AST; their descendants — text, math, components —
 * render naturally in the chapter's MDX compilation pass.
 *
 * Module-scoped caches (topic AST, topic-id ↔ path, chapter→topic
 * dep map) survive across compiles within a single process. In
 * production builds (one-shot) that's a pure win. In dev mode HMR
 * the caches MUST be invalidated when a topic file changes — see
 * `skill-review-resolver-vite.ts` for the companion Vite plugin
 * that calls `invalidateTopicFile` from `handleHotUpdate`.
 */

export interface SkillReviewResolverOptions {
  /** Absolute path to the topics/ content directory. */
  topicsDir: string;
}

/** Cached `topic.id → topic-file-path` index per `topicsDir`. */
const topicPathCacheByDir = new Map<string, Map<string, string>>();
/** Cached `topic-file-path → parsed Root` per file. */
const topicAstCache = new Map<string, Root>();
/**
 * Tracks which chapter (or registry) MDX files referenced which
 * topic files during compilation. Populated by the remark plugin
 * each time it lifts a topic's card body into a chapter. Consumed
 * by the companion Vite plugin's `handleHotUpdate` (ADR 0079 C3
 * follow-up) to surgically invalidate dependent chapters when a
 * topic file changes in dev mode. Key: topic file absolute path.
 * Value: set of chapter file absolute paths that depend on it.
 */
const topicToDependentChapters = new Map<string, Set<string>>();

/**
 * Test-only: wipe all resolver caches + dependency map. Used by
 * vitest `beforeEach` / `afterEach` to keep test runs independent.
 */
export function resetSkillReviewResolverCache(): void {
  topicPathCacheByDir.clear();
  topicAstCache.clear();
  topicToDependentChapters.clear();
}

/**
 * Invalidate the resolver's cached state for a single topic file.
 * Called by the companion Vite plugin's `handleHotUpdate` when a
 * topic file changes in dev mode. Returns the set of chapter file
 * paths that depended on the topic at last compile — the Vite
 * plugin uses these to invalidate dependent modules so Vite
 * re-runs the resolver against the fresh topic content.
 *
 * The `topicPathCacheByDir` is cleared wholesale (a single file
 * change can move/add/delete an id↔path mapping that's
 * directory-scoped). The chapter→topic dep map is also pruned of
 * any edges whose target was this topic — dependent chapters will
 * re-register their deps on the next compile pass.
 */
export function invalidateTopicFile(filePath: string): string[] {
  topicAstCache.delete(filePath);
  topicPathCacheByDir.clear();
  const dependents = topicToDependentChapters.get(filePath);
  topicToDependentChapters.delete(filePath);
  if (!dependents) return [];
  return [...dependents];
}

/** Walk `topicsDir` recursively for `.mdx` files. */
function listTopicFiles(topicsDir: string): string[] {
  const out: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && entry.endsWith(".mdx")) {
        out.push(fullPath);
      }
    }
  }
  walk(topicsDir);
  return out;
}

/** Read topic file's YAML frontmatter and return its `id` (or null if absent). */
function readTopicId(filePath: string): string | null {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const raw = parseYaml(match[1] ?? "");
  if (
    raw &&
    typeof raw === "object" &&
    "id" in raw &&
    typeof (raw as { id: unknown }).id === "string"
  ) {
    return (raw as { id: string }).id;
  }
  return null;
}

function getTopicPathByIdMap(topicsDir: string): Map<string, string> {
  const cached = topicPathCacheByDir.get(topicsDir);
  if (cached) return cached;
  const map = new Map<string, string>();
  for (const filePath of listTopicFiles(topicsDir)) {
    const id = readTopicId(filePath);
    if (id) map.set(id, filePath);
  }
  topicPathCacheByDir.set(topicsDir, map);
  return map;
}

function getTopicAst(topicFilePath: string): Root {
  const cached = topicAstCache.get(topicFilePath);
  if (cached) return cached;
  const source = readFileSync(topicFilePath, "utf8");
  // Parse with both mdxjs (for <SkillReview.Card> JSX) AND math
  // extensions: topic prompts/answers commonly contain LaTeX like
  // `$\cdot$` that must be parsed into inline-math AST nodes. If we
  // left math as raw text, the LaTeX backslashes (e.g. `\cdot`)
  // would survive into the chapter MDX as JSX text content and the
  // chapter compiler's JS-escape pass would reject `\c` as an
  // invalid JS escape sequence.
  const ast = fromMarkdown(source, {
    extensions: [mdxjs(), math()],
    mdastExtensions: [mdxFromMarkdown(), mathFromMarkdown()],
  });
  topicAstCache.set(topicFilePath, ast);
  return ast;
}

function readStringAttribute(
  node: MdxJsxFlowElement,
  name: string
): string | null {
  for (const attr of node.attributes) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name !== name) continue;
    if (typeof attr.value === "string") return attr.value;
  }
  return null;
}

/** Parse `topic:X` or `topic:X#card` into `[topicId, cardId | null]`. */
function parseTopicTarget(target: string): [string, string | null] {
  const rest = target.slice("topic:".length);
  const hash = rest.indexOf("#");
  if (hash === -1) return [rest, null];
  return [rest.slice(0, hash), rest.slice(hash + 1)];
}

/** Find all `<SkillReview.Card id="X">` blocks in a topic AST. */
function findCardBlocks(
  ast: Root
): Array<{ id: string; node: MdxJsxFlowElement }> {
  const cards: Array<{ id: string; node: MdxJsxFlowElement }> = [];
  visit(ast, "mdxJsxFlowElement", (node) => {
    const flow = node as MdxJsxFlowElement;
    if (flow.name !== "SkillReview.Card") return;
    const id = readStringAttribute(flow, "id");
    if (!id) return;
    cards.push({ id, node: flow });
  });
  return cards;
}

/**
 * Find a slot child (`<SkillReview.Prompt>` or `<SkillReview.Answer>`)
 * anywhere inside a card subtree. Returns either an
 * `mdxJsxFlowElement` (block-level slot) or an `mdxJsxTextElement`
 * (inline slot) — MDX parses inline JSX like `<Slot>text</Slot>` as
 * text-level even when wrapped in paragraphs, so the slot search
 * traverses the full subtree and returns whichever variant it finds
 * first. The chapter's MDX pipeline handles both variants downstream
 * so the caller doesn't need to discriminate.
 */
function findSlotChild(
  card: MdxJsxFlowElement,
  slotName: string
): MdxJsxFlowElement | MdxJsxTextElement | null {
  let found: MdxJsxFlowElement | MdxJsxTextElement | null = null;
  visit(card, (node) => {
    if (found) return;
    if (
      (node.type === "mdxJsxFlowElement" ||
        node.type === "mdxJsxTextElement") &&
      (node as { name?: string }).name === slotName
    ) {
      found = node as MdxJsxFlowElement | MdxJsxTextElement;
    }
  });
  return found;
}

export const skillReviewResolverRemarkPlugin: Plugin<
  [SkillReviewResolverOptions],
  Root
> = (options) => (tree, file) => {
  const { topicsDir } = options;
  // file.path is the chapter (or registry) MDX being compiled.
  // Tracked for HMR surgical-invalidation; absent only when callers
  // invoke the transformer directly with a synthetic vfile (tests),
  // in which case no dep is recorded — safe no-op.
  const chapterFilePath =
    typeof (file as { path?: unknown }).path === "string"
      ? ((file as { path: string }).path as string)
      : undefined;

  visit(tree, "mdxJsxFlowElement", (node) => {
    const flow = node as MdxJsxFlowElement;
    if (flow.name !== "SkillReview") return;
    if (flow.children.length > 0) return; // explicit-children form

    const target = readStringAttribute(flow, "target");
    if (!target) {
      throw new Error(
        `<SkillReview ... /> self-closing form requires a "target" attribute (per ADR 0079).`
      );
    }
    if (!target.startsWith("topic:")) {
      throw new Error(
        `<SkillReview target="${target}" /> uses a non-topic target prefix. Non-topic targets reserved for future ADRs (per ADR 0079).`
      );
    }

    const [topicId, cardId] = parseTopicTarget(target);
    const topicPaths = getTopicPathByIdMap(topicsDir);
    const topicFilePath = topicPaths.get(topicId);
    if (!topicFilePath) {
      throw new Error(
        `<SkillReview target="${target}" />: unknown topic "${topicId}". No topic file found in ${topicsDir} declaring this id in frontmatter (per ADR 0079).`
      );
    }
    // Record chapter→topic dep for HMR surgical invalidation. Built
    // up across compile passes; pruned by `invalidateTopicFile` when
    // a topic file changes in dev mode.
    if (chapterFilePath) {
      let dependents = topicToDependentChapters.get(topicFilePath);
      if (!dependents) {
        dependents = new Set();
        topicToDependentChapters.set(topicFilePath, dependents);
      }
      dependents.add(chapterFilePath);
    }

    const topicAst = getTopicAst(topicFilePath);
    const cards = findCardBlocks(topicAst);
    if (cards.length === 0) {
      throw new Error(
        `<SkillReview target="${target}" />: topic "${topicId}" has no <SkillReview.Card> blocks in its body. Topic files must declare at least one card (per ADR 0079).`
      );
    }

    let chosen: { id: string; node: MdxJsxFlowElement } | undefined;
    if (cardId) {
      chosen = cards.find((c) => c.id === cardId);
      if (!chosen) {
        throw new Error(
          `<SkillReview target="${target}" />: card "${cardId}" not found in topic "${topicId}". Available cards: ${cards
            .map((c) => c.id)
            .join(", ")}.`
        );
      }
    } else {
      if (cards.length > 1) {
        // I3 wording (R+CR follow-up): lead with the rule, not the
        // symptom — bare-form auto-pick only resolves for single-card
        // topics, so authors learn the invariant alongside the
        // available-cards list.
        const lines = cards.map((c) => `  - topic:${topicId}#${c.id}`);
        throw new Error(
          `<SkillReview target="${target}" />: bare topic targets auto-pick only when the topic has exactly one card. Topic "${topicId}" has ${cards.length} cards — specify one explicitly with a "#card" fragment (per ADR 0079 Q6):\n${lines.join("\n")}`
        );
      }
      chosen = cards[0];
    }
    if (!chosen) {
      // Defensive — should be unreachable given prior branches.
      throw new Error(
        `<SkillReview target="${target}" />: failed to select a card from topic "${topicId}".`
      );
    }

    const prompt = findSlotChild(chosen.node, "SkillReview.Prompt");
    const answer = findSlotChild(chosen.node, "SkillReview.Answer");
    if (!prompt || !answer) {
      throw new Error(
        `Topic "${topicId}" card "${chosen.id}" is missing required <SkillReview.Prompt> or <SkillReview.Answer> slot child (per ADR 0079).`
      );
    }

    // Lift the chosen card's slot children into the parent SkillReview
    // node. The Prompt + Answer JSX nodes are reused verbatim (their
    // descendants — text, math, components — render naturally in the
    // chapter's MDX compilation pass).
    //
    // Type cast: MdxJsxFlowElement IS a BlockContent member of
    // `flow.children`, but findSlotChild may return a node that was
    // originally an mdxJsxTextElement (MDX often parses inline JSX
    // like `<Slot>text</Slot>` as text-level). The runtime behavior is
    // safe — the chapter's MDX pipeline handles both — but TS needs
    // an explicit widening cast.
    flow.children = [prompt, answer] as unknown as typeof flow.children;
  });
};
