import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactElement,
} from "react";

/**
 * Provenance of the HTML handed to BuildTimeHtml. Every value names a
 * trusted transformation whose INPUT is author- or build-authored
 * content — never runtime user / student input. That input-trust
 * property (not when the transform runs) is what makes the markup safe
 * to inject. The discriminator is required so each call site declares
 * why its HTML is trusted, and the type enumerates the whole surface.
 *
 *  - katex: KaTeX markup rendered from non-user LaTeX — the equation /
 *    search registry html (ADR 0090), renderTextWithMath output for
 *    author component-prop text (ADR 0030), or katex.renderToString on
 *    author-internal figure constants. KaTeX output is structurally
 *    safe; the LaTeX is never user-supplied.
 *  - mdx-serialized: renderChildrenToHtml — authored MDX children
 *    serialized to HTML at build time (inline emphasis / links / code).
 *  - extractor-body: pre-rendered HTML from a build-time extractor /
 *    remark plugin (mdast then hast then html); e.g. glossary + equation
 *    biography bodies.
 */
export type BuildTimeHtmlTrust = "katex" | "mdx-serialized" | "extractor-body";

export type BuildTimeHtmlProps<E extends ElementType> = {
  /** Build/author-authored HTML. undefined renders an empty element. */
  html: string | undefined;
  /** Required provenance — the documented reason this HTML is safe. */
  trust: BuildTimeHtmlTrust;
  /** Host element. Defaults to span. */
  as?: E;
} & Omit<
  ComponentPropsWithoutRef<E>,
  "children" | "dangerouslySetInnerHTML" | "as"
>;

/**
 * The single sanctioned dangerouslySetInnerHTML chokepoint for Sophie
 * components (ADR 0093). Renders trusted, non-user-sourced HTML into a
 * polymorphic host element, collapsing what were 28 per-site trust
 * arguments into one. Raw dangerouslySetInnerHTML anywhere else under
 * packages is CI-rejected by R14 (scripts/lint-no-raw-inner-html.ts).
 *
 * trust is documentation + an enumerable trust-surface marker; it has no
 * runtime effect (destructured out so it never reaches the DOM).
 */
export function BuildTimeHtml<E extends ElementType = "span">({
  html,
  trust,
  as,
  ...rest
}: BuildTimeHtmlProps<E>): ReactElement {
  void trust;
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag
      {...rest}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SINGLE sanctioned chokepoint (ADR 0093). html is always rendered from author/build-authored content via a trusted pipeline (katex / mdx-serialized / extractor-body per the required trust prop), never runtime/student input. R14 forbids raw use elsewhere.
      dangerouslySetInnerHTML={{ __html: html ?? "" }}
    />
  );
}
