import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import { unified } from "unified";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  renderTopicCardSlotsToHtml,
  resetSkillReviewResolverCache,
  skillReviewResolverRemarkPlugin,
} from "./skill-review-resolver.ts";

const FIXTURE_TOPICS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__/topics"
);

function parseChapter(source: string): Root {
  return fromMarkdown(source, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  }) as Root;
}

/**
 * Run the resolver through unified's `run` pipeline against an
 * in-memory tree. This exercises the plugin's actual unified
 * `Plugin<>` signature end-to-end (I4 follow-up) rather than
 * casting the transformer's `this` context. The `path` field on
 * the synthetic vfile is what the resolver records into its
 * chapter→topic dependency map.
 */
async function applyResolver(source: string): Promise<Root> {
  const tree = parseChapter(source);
  await unified()
    .use(skillReviewResolverRemarkPlugin, { topicsDir: FIXTURE_TOPICS_DIR })
    .run(tree, { path: "test-chapter.mdx" } as never);
  return tree;
}

beforeEach(() => {
  resetSkillReviewResolverCache();
});
afterEach(() => {
  resetSkillReviewResolverCache();
});

describe("skillReviewResolverRemarkPlugin (ADR 0079)", () => {
  test("resolves single-card topic with bare target — auto-picks the card", async () => {
    const tree = await applyResolver(
      `<SkillReview course="c" unit="u" target="topic:exponents" />`
    );
    const skillReview = tree.children[0] as { children: unknown[] };
    expect(skillReview.children).toHaveLength(2);
    const names = (skillReview.children as Array<{ name?: string }>).map(
      (c) => c.name
    );
    expect(names).toEqual(["SkillReview.Prompt", "SkillReview.Answer"]);
  });

  test("resolves specific card with topic:X#card target", async () => {
    const tree = await applyResolver(
      `<SkillReview course="c" unit="u" target="topic:logarithms#product-rule" />`
    );
    const skillReview = tree.children[0] as { children: unknown[] };
    expect(skillReview.children).toHaveLength(2);
  });

  test("throws ERROR for bare topic against multi-card topic; message leads with the rule, then lists available cards", async () => {
    await expect(
      applyResolver(
        `<SkillReview course="c" unit="u" target="topic:logarithms" />`
      )
    ).rejects.toThrow(
      /bare topic targets auto-pick only when the topic has exactly one card[\s\S]*has 3 cards[\s\S]*#card.*fragment[\s\S]*product-rule[\s\S]*power-rule[\s\S]*change-of-base/
    );
  });

  test("throws ERROR for unknown topic id", async () => {
    await expect(
      applyResolver(
        `<SkillReview course="c" unit="u" target="topic:nonexistent" />`
      )
    ).rejects.toThrow(/unknown topic.*nonexistent/i);
  });

  test("throws ERROR for unknown card id within a known topic", async () => {
    await expect(
      applyResolver(
        `<SkillReview course="c" unit="u" target="topic:logarithms#bogus-card" />`
      )
    ).rejects.toThrow(/card.*bogus-card.*not found.*logarithms/i);
  });

  test("leaves explicit-children SkillReview untouched (resolver only triggers on self-closing form)", async () => {
    const source = `<SkillReview course="c" unit="u" target="topic:exponents">
  <SkillReview.Prompt>Custom prompt</SkillReview.Prompt>
  <SkillReview.Answer>Custom answer</SkillReview.Answer>
</SkillReview>`;
    const tree = await applyResolver(source);
    const skillReview = tree.children[0] as { children: unknown[] };
    // Children preserved verbatim — resolver did NOT lift anything.
    // The explicit-children form gets parsed with the inner JSX slots
    // as nested mdxJsxFlowElement nodes; verify both slot names
    // appear somewhere in the subtree.
    const childNames = new Set<string>();
    const collect = (n: { children?: unknown[]; name?: string }): void => {
      if (n.name) childNames.add(n.name);
      for (const c of n.children ?? []) collect(c as typeof n);
    };
    collect(skillReview as { children: unknown[]; name?: string });
    expect(childNames.has("SkillReview.Prompt")).toBe(true);
    expect(childNames.has("SkillReview.Answer")).toBe(true);
  });

  test("throws ERROR for non-topic target prefix (reserved for future ADRs)", async () => {
    await expect(
      applyResolver(`<SkillReview course="c" unit="u" target="eq:foo" />`)
    ).rejects.toThrow(/non-topic targets reserved/i);
  });

  test("ignores non-SkillReview JSX elements", async () => {
    const tree = await applyResolver(
      `<RetrievalPrompt target="topic:logarithms" />`
    );
    const node = tree.children[0] as { children: unknown[]; name?: string };
    expect(node.name).toBe("RetrievalPrompt");
    expect(node.children).toEqual([]); // unchanged
  });
});

describe("renderTopicCardSlotsToHtml (W4c Task 8.4 — closes W4b R+CR N5)", () => {
  test("returns one entry per card with promptHtml + answerHtml", () => {
    const slots = renderTopicCardSlotsToHtml(FIXTURE_TOPICS_DIR, "logarithms");
    expect(slots.size).toBe(3);
    expect([...slots.keys()]).toEqual([
      "product-rule",
      "power-rule",
      "change-of-base",
    ]);
    const productRule = slots.get("product-rule");
    expect(productRule).toBeDefined();
    expect(productRule?.promptHtml).toContain("log_b(xy)");
    expect(productRule?.answerHtml).toContain("log_b(x) + log_b(y)");
  });

  test("returns single-card topics with one entry", () => {
    const slots = renderTopicCardSlotsToHtml(FIXTURE_TOPICS_DIR, "exponents");
    expect(slots.size).toBe(1);
  });

  test("throws ERROR for unknown topic id", () => {
    expect(() =>
      renderTopicCardSlotsToHtml(FIXTURE_TOPICS_DIR, "nonexistent")
    ).toThrow(/unknown topic.*nonexistent/i);
  });
});
