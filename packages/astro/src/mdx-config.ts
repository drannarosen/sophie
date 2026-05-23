import { resolve } from "node:path";
import rehypeKatex from "rehype-katex";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Pluggable } from "unified";
import { skillReviewResolverRemarkPlugin } from "./lib/mdx-plugins/skill-review-resolver.ts";
import { pedagogyIndexRemarkPlugin } from "./lib/pedagogy-index/orchestrator.ts";

/**
 * Default `topicsDir` for the SkillReview self-closing resolver (ADR
 * 0079). Resolves to `<consumer-project-root>/src/content/topics/`
 * — the location Sophie's content-collection convention places topic
 * MDX files. Astro plugins run from the consumer's project root, so
 * `process.cwd()` is the right anchor.
 */
const DEFAULT_TOPICS_DIR = resolve(process.cwd(), "src/content/topics");

/**
 * MDX integration options for `@astrojs/mdx`. Plugin chain:
 * - `remark-gfm`           — GitHub-flavored markdown (tables, autolinks, etc.)
 * - `remark-frontmatter`   — recognize YAML frontmatter (Astro Content
 *                            Collections handle parsing)
 * - `remark-math`          — parse `$inline$` and `$$display$$` into math
 *                            AST nodes (must precede rehype-katex)
 * - `skillReviewResolverRemarkPlugin` — expand
 *                            `<SkillReview target="topic:X[#card]" />`
 *                            self-closing forms by lifting card slot
 *                            children from topic files (ADR 0079).
 *                            Must precede `pedagogyIndexRemarkPlugin`
 *                            so the index extractor sees the expanded
 *                            (children-present) shape.
 * - `pedagogyIndexRemarkPlugin` — extract structured pedagogy
 *                            components (definitions in PR-C1, topics
 *                            in W4b) into the build-time PedagogyIndex
 *                            consumed by `virtual:sophie/pedagogy-index`
 *                            (ADR 0038)
 * - `rehype-katex`         — render the math AST nodes via KaTeX
 *
 * The components map is consumer-supplied per-page via
 * `<Content components={makeStaticComponents({figures})}>`. See
 * `@sophie/astro`'s `makeStaticComponents` factory.
 */
export const sophieMdxOptions = {
  remarkPlugins: [
    remarkGfm,
    remarkFrontmatter,
    remarkMath,
    [
      skillReviewResolverRemarkPlugin,
      { topicsDir: DEFAULT_TOPICS_DIR },
    ] as Pluggable,
    pedagogyIndexRemarkPlugin,
  ] as Pluggable[],
  rehypePlugins: [rehypeKatex],
};
