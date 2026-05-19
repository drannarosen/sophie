import type { InlineRefKind, InlineRefUsageEntry } from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { readStringAttr } from "../jsx-utils.ts";

/**
 * Map from JSX element name → (kind, lookup-prop-name) for the four
 * inline-ref components. Centralized so the extractor and any future
 * audit-config diagnostics share a single source of truth.
 */
const INLINE_REF_TARGETS: Record<
  string,
  { kind: InlineRefKind; prop: string }
> = {
  GlossaryTerm: { kind: "glossary-term", prop: "name" },
  EquationRef: { kind: "eq-ref", prop: "refId" },
  FigureRef: { kind: "figure-ref", prop: "name" },
  ChapterRef: { kind: "chapter-ref", prop: "slug" },
};

/**
 * Pure extractor. Walks an mdast tree for BOTH `mdxJsxFlowElement` and
 * `mdxJsxTextElement` nodes whose name matches one of the four inline-
 * ref components (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`,
 * `<ChapterRef>`). Returns one `InlineRefUsageEntry` per match.
 *
 * Inline-refs can appear inline within prose (mdxJsxTextElement) OR
 * standalone as block elements (mdxJsxFlowElement); both shapes count.
 *
 * Empty / missing lookup props are silently skipped — the audit pass
 * (D4 / E4 / F2 / C1) surfaces those as their own ERROR codes against
 * the populated target collections. Append-only: no dedup. The same
 * `refKey` referenced N times in one chapter yields N entries (useful
 * for usage-count facets later).
 */
export function extractInlineRefUsages(
  tree: Root,
  chapterSlug: string
): InlineRefUsageEntry[] {
  const out: InlineRefUsageEntry[] = [];

  const visitor = (node: unknown) => {
    const el = node as {
      name?: string | null;
      attributes?: ReadonlyArray<{
        type: string;
        name: string;
        value: unknown;
      }>;
    };
    if (!el.name) return;
    const target = INLINE_REF_TARGETS[el.name];
    if (!target) return;

    const refKey = readStringAttr(el, target.prop);
    if (!refKey) return;

    out.push({
      kind: target.kind,
      refKey,
      chapter: chapterSlug,
    });
  };

  visit(tree, "mdxJsxFlowElement", visitor);
  visit(tree, "mdxJsxTextElement", visitor);

  return out;
}
