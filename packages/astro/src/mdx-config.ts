import rehypeKatex from "rehype-katex";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { pedagogyIndexRemarkPlugin } from "./lib/pedagogy-index/orchestrator.ts";

/**
 * MDX integration options for `@astrojs/mdx`. Plugin chain:
 * - `remark-gfm`           — GitHub-flavored markdown (tables, autolinks, etc.)
 * - `remark-frontmatter`   — recognize YAML frontmatter (Astro Content
 *                            Collections handle parsing)
 * - `remark-math`          — parse `$inline$` and `$$display$$` into math
 *                            AST nodes (must precede rehype-katex)
 * - `pedagogyIndexRemarkPlugin` — extract structured pedagogy
 *                            components (definitions in PR-C1) into
 *                            the build-time PedagogyIndex consumed by
 *                            `virtual:sophie/pedagogy-index` (ADR 0038)
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
    pedagogyIndexRemarkPlugin,
  ],
  rehypePlugins: [rehypeKatex],
};
