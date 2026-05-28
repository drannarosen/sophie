import { resolve } from "node:path";
import rehypeKatex from "rehype-katex";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Pluggable } from "unified";
import { sophieCompoundExpandRemarkPlugin } from "./lib/mdx-plugins/compound-expand.ts";
import { skillReviewResolverRemarkPlugin } from "./lib/mdx-plugins/skill-review-resolver.ts";
import { sophieAutoImportsRemarkPlugin } from "./lib/mdx-plugins/sophie-auto-imports.ts";
import { pedagogyIndexRemarkPlugin } from "./lib/pedagogy-index/orchestrator.ts";
import { rehypeKatexDisplayA11y } from "./lib/pedagogy-index/transforms/katex-display-a11y.ts";

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
 * - `sophieAutoImportsRemarkPlugin` — auto-import Sophie interactive
 *                            components into the MDX ESM block, inject
 *                            `client:load` directives, and thread the
 *                            formative parent's `course`/`unit`/`id`
 *                            into nested `<Solution>` / `<Hint>`
 *                            children (ADR 0073 Amendment 1; ADR 0061
 *                            Rule 4 author surface). Must precede
 *                            `remark-math` so `$…$` content inside
 *                            formative-family children is unaffected
 *                            by the JSX rewrites.
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
 * - `sophieCompoundExpandRemarkPlugin` — expand compound authoring
 *                            tags (`<MCQ>`) into static native form
 *                            structure (`<fieldset role="radiogroup">`
 *                            of `<label><input>` pairs) + a childless
 *                            controller island (`<MCQController>`), and
 *                            self-inject the controller's import +
 *                            `client:load` (ADR 0073 Amendment 1). Runs
 *                            LAST so the pedagogy extractor above sees
 *                            the authored `<MCQ><MCQ.Choice>` shape; the
 *                            shared `choiceSlug` keeps the extractor's
 *                            index anchor and the rendered `<input>`
 *                            value in agreement.
 * - `rehype-katex`         — render the math AST nodes via KaTeX
 * - `rehypeKatexDisplayA11y` — stamp `tabindex="0"` + `role="group"`
 *                            + `aria-label` onto `.katex-display`
 *                            scroll containers so keyboard users can
 *                            scroll wide equations on narrow viewports
 *                            (closes axe `scrollable-region-focusable`
 *                            on mobile per issue #192; ADR 0004 a11y
 *                            mandate). Must run AFTER `rehype-katex`
 *                            so the `.katex-display` elements exist
 *                            in the hast tree.
 *
 * The components map is consumer-supplied per-page via
 * `<Content components={makeStaticComponents({figures})}>`. See
 * `@sophie/astro`'s `makeStaticComponents` factory.
 */
export const sophieMdxOptions = {
  remarkPlugins: [
    remarkGfm,
    remarkFrontmatter,
    sophieAutoImportsRemarkPlugin,
    remarkMath,
    [
      skillReviewResolverRemarkPlugin,
      { topicsDir: DEFAULT_TOPICS_DIR },
    ] as Pluggable,
    pedagogyIndexRemarkPlugin,
    sophieCompoundExpandRemarkPlugin,
  ] as Pluggable[],
  rehypePlugins: [rehypeKatex, rehypeKatexDisplayA11y],
};
