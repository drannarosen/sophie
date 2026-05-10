import rehypeKatex from "rehype-katex";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { sophieMdxComponents } from "./component-mapping.ts";

/**
 * MDX integration options for `@astrojs/mdx`. Phase 0 plugin chain:
 * - `remark-gfm`           — GitHub-flavored markdown (tables, autolinks, etc.)
 * - `remark-frontmatter`   — recognize YAML frontmatter (Astro Content
 *                            Collections handle parsing)
 * - `rehype-katex`         — KaTeX rendering of `$inline$` and `$$display$$`
 *
 * Plus the hardcoded component map (Callout, Figure).
 */
export const sophieMdxOptions = {
  remarkPlugins: [remarkGfm, remarkFrontmatter],
  rehypePlugins: [rehypeKatex],
  components: { ...sophieMdxComponents },
};
