import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import type { Root } from "mdast";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  resetSkillReviewResolverCache,
  skillReviewResolverRemarkPlugin,
} from "./skill-review-resolver.ts";

const FIXTURE_TOPICS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__/topics",
);

function parseChapter(source: string): Root {
  return fromMarkdown(source, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });
}

function applyResolver(source: string): Root {
  const tree = parseChapter(source);
  const transformer = skillReviewResolverRemarkPlugin({
    topicsDir: FIXTURE_TOPICS_DIR,
  });
  // Plugin is synchronous; call its transformer directly. Avoids
  // pulling `unified` into @sophie/astro's dep graph.
  // biome-ignore lint/suspicious/noExplicitAny: synchronous-transformer cast for test only.
  (transformer as any)(tree, { path: "test-chapter.mdx" });
  return tree;
}

beforeEach(() => {
  resetSkillReviewResolverCache();
});
afterEach(() => {
  resetSkillReviewResolverCache();
});

describe("skillReviewResolverRemarkPlugin (ADR 0079)", () => {
  test("resolves single-card topic with bare target — auto-picks the card", () => {
    const tree = applyResolver(
      `<SkillReview course="c" unit="u" target="topic:exponents" />`,
    );
    const skillReview = tree.children[0] as { children: unknown[] };
    expect(skillReview.children).toHaveLength(2);
    const names = (skillReview.children as Array<{ name?: string }>).map(
      (c) => c.name,
    );
    expect(names).toEqual(["SkillReview.Prompt", "SkillReview.Answer"]);
  });

  test("resolves specific card with topic:X#card target", () => {
    const tree = applyResolver(
      `<SkillReview course="c" unit="u" target="topic:logarithms#product-rule" />`,
    );
    const skillReview = tree.children[0] as { children: unknown[] };
    expect(skillReview.children).toHaveLength(2);
  });

  test("throws ERROR for bare topic against multi-card topic with curated available-cards message", () => {
    expect(() =>
      applyResolver(
        `<SkillReview course="c" unit="u" target="topic:logarithms" />`,
      ),
    ).toThrow(
      /topic[\s\S]*logarithms[\s\S]*has 3 cards[\s\S]*product-rule[\s\S]*power-rule[\s\S]*change-of-base/,
    );
  });

  test("throws ERROR for unknown topic id", () => {
    expect(() =>
      applyResolver(
        `<SkillReview course="c" unit="u" target="topic:nonexistent" />`,
      ),
    ).toThrow(/unknown topic.*nonexistent/i);
  });

  test("throws ERROR for unknown card id within a known topic", () => {
    expect(() =>
      applyResolver(
        `<SkillReview course="c" unit="u" target="topic:logarithms#bogus-card" />`,
      ),
    ).toThrow(/card.*bogus-card.*not found.*logarithms/i);
  });

  test("leaves explicit-children SkillReview untouched (resolver only triggers on self-closing form)", () => {
    const source = `<SkillReview course="c" unit="u" target="topic:exponents">
  <SkillReview.Prompt>Custom prompt</SkillReview.Prompt>
  <SkillReview.Answer>Custom answer</SkillReview.Answer>
</SkillReview>`;
    const tree = applyResolver(source);
    const skillReview = tree.children[0] as { children: unknown[] };
    // Children preserved verbatim — resolver did NOT lift anything.
    // The explicit-children form gets parsed with the inner JSX slots
    // as nested mdxJsxFlowElement nodes; we just verify both slot
    // names are present somewhere in the subtree.
    const childNames = new Set<string>();
    const collect = (n: { children?: unknown[]; name?: string }): void => {
      if (n.name) childNames.add(n.name);
      for (const c of n.children ?? []) collect(c as typeof n);
    };
    collect(skillReview as { children: unknown[]; name?: string });
    expect(childNames.has("SkillReview.Prompt")).toBe(true);
    expect(childNames.has("SkillReview.Answer")).toBe(true);
  });

  test("throws ERROR for non-topic target prefix (reserved for future ADRs)", () => {
    expect(() =>
      applyResolver(`<SkillReview course="c" unit="u" target="eq:foo" />`),
    ).toThrow(/non-topic targets reserved/i);
  });

  test("ignores non-SkillReview JSX elements", () => {
    const tree = applyResolver(
      `<RetrievalPrompt target="topic:logarithms" />`,
    );
    const node = tree.children[0] as { children: unknown[]; name?: string };
    expect(node.name).toBe("RetrievalPrompt");
    expect(node.children).toEqual([]); // unchanged
  });
});
