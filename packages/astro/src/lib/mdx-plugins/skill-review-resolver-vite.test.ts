import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import { unified } from "unified";
import type { Plugin as VitePlugin } from "vite";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  invalidateTopicFile,
  resetSkillReviewResolverCache,
  skillReviewResolverRemarkPlugin,
} from "./skill-review-resolver.ts";
import { skillReviewResolverVitePlugin } from "./skill-review-resolver-vite.ts";

const FIXTURE_TOPICS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__/topics"
);

interface MockModuleNode {
  id: string;
  url: string;
}

function mockHotContext(
  file: string,
  modulesById: Map<string, MockModuleNode>
) {
  return {
    file,
    modules: [],
    timestamp: Date.now(),
    server: {
      moduleGraph: {
        getModuleById: vi.fn((id: string) => modulesById.get(id)),
      },
    },
  };
}

/**
 * Helper: run the resolver against a chapter source through unified
 * so the transformer's `(tree, file)` contract is exercised exactly
 * as the production MDX pipeline does. This also seeds the resolver's
 * chapter→topic dependency map so the Vite plugin has data to work
 * against.
 */
async function compileChapter(
  source: string,
  chapterPath: string
): Promise<Root> {
  // Use unified's `run` pipeline rather than calling the transformer
  // directly so the resolver's Plugin<> signature is exercised end-
  // to-end (I4 follow-up). The chapter source is parsed via the same
  // mdast-util-from-markdown + mdxjs extensions Astro's MDX pipeline
  // uses for production compilation.
  const tree = fromMarkdown(source, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  }) as Root;
  await unified()
    .use(skillReviewResolverRemarkPlugin, { topicsDir: FIXTURE_TOPICS_DIR })
    .run(tree, { path: chapterPath } as never);
  return tree;
}

beforeEach(() => {
  resetSkillReviewResolverCache();
});
afterEach(() => {
  resetSkillReviewResolverCache();
});

describe("skillReviewResolverVitePlugin handleHotUpdate (ADR 0079 C3)", () => {
  test("ignores changes to files outside topicsDir", () => {
    const plugin = skillReviewResolverVitePlugin({
      topicsDir: FIXTURE_TOPICS_DIR,
    });
    const ctx = mockHotContext(
      resolve(FIXTURE_TOPICS_DIR, "../not-a-topic.mdx"),
      new Map()
    );
    const handler = getHandler(plugin);
    const result = handler.call({} as never, ctx as never);
    expect(result).toBeUndefined();
    expect(ctx.server.moduleGraph.getModuleById).not.toHaveBeenCalled();
  });

  test("returns undefined (Vite default propagation) when no chapter had registered a dep yet", () => {
    const plugin = skillReviewResolverVitePlugin({
      topicsDir: FIXTURE_TOPICS_DIR,
    });
    const topicFile = resolve(FIXTURE_TOPICS_DIR, "math/exponents.mdx");
    const ctx = mockHotContext(topicFile, new Map());
    const handler = getHandler(plugin);
    const result = handler.call({} as never, ctx as never);
    expect(result).toBeUndefined();
  });

  test("returns dependent chapter modules from Vite module graph for surgical re-run", async () => {
    const plugin = skillReviewResolverVitePlugin({
      topicsDir: FIXTURE_TOPICS_DIR,
    });

    // 1. Compile a chapter so chapter→topic dep is recorded.
    const chapterPath = "/abs/chapter.mdx";
    await compileChapter(
      `<SkillReview course="c" unit="u" target="topic:exponents" />`,
      chapterPath
    );

    // 2. Simulate a topic file change in HMR — handleHotUpdate
    //    should return the chapter module so Vite re-runs it.
    const topicFile = resolve(FIXTURE_TOPICS_DIR, "math/exponents.mdx");
    const chapterModule: MockModuleNode = {
      id: chapterPath,
      url: chapterPath,
    };
    const ctx = mockHotContext(
      topicFile,
      new Map([[chapterPath, chapterModule]])
    );
    const handler = getHandler(plugin);
    const result = handler.call({} as never, ctx as never) as
      | MockModuleNode[]
      | undefined;

    expect(result).toBeDefined();
    expect(result).toContain(chapterModule);

    // After invalidation, the dep map is pruned so a second HMR fire
    // on the same topic finds no dependents (until a re-compile
    // re-registers).
    const second = handler.call({} as never, ctx as never);
    expect(second).toBeUndefined();
  });

  test("normalizes path-prefix to avoid `/foo` matching `/foobar`", () => {
    const plugin = skillReviewResolverVitePlugin({
      topicsDir: "/abs/topics",
    });
    const handler = getHandler(plugin);
    // A path that shares prefix but isn't under the dir.
    const ctx = mockHotContext("/abs/topicsfoo/other.mdx", new Map());
    const result = handler.call({} as never, ctx as never);
    expect(result).toBeUndefined();
  });
});

describe("invalidateTopicFile() — direct API (ADR 0079 C3)", () => {
  test("returns empty array when no dependents were registered", () => {
    expect(invalidateTopicFile("/abs/never-seen.mdx")).toEqual([]);
  });
});

function getHandler(
  plugin: VitePlugin
): (this: unknown, ctx: unknown) => unknown {
  const hook = plugin.handleHotUpdate;
  if (typeof hook === "function") {
    return hook as unknown as (this: unknown, ctx: unknown) => unknown;
  }
  if (
    hook &&
    typeof hook === "object" &&
    "handler" in hook &&
    typeof (hook as { handler: unknown }).handler === "function"
  ) {
    return (hook as { handler: (ctx: unknown) => unknown })
      .handler as unknown as (this: unknown, ctx: unknown) => unknown;
  }
  throw new Error("handleHotUpdate hook is missing or wrong shape");
}
