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
 * Empty / missing lookup props are silently dropped — the
 * authoring shape (e.g., `<GlossaryTerm>` with no `name=`) is
 * malformed JSX that TypeScript's prop-type check should flag
 * at the call site. The audit pass D4/E4/F2/C1 invariants do
 * catch *different* shapes: they check that referenced target
 * IDs resolve to populated registry entries (a missing
 * glossary entry, a missing equation refId). Bare-source-side
 * malformed JSX is out of scope here.
 *
 * Append-only: no dedup. The same `refKey` referenced N times
 * in one chapter yields N entries (useful for usage-count
 * facets later).
 */
export function extractInlineRefUsages(
  tree: Root,
  unitId: string
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
    // R7 disposition: defensive guard for unnamed JSX visited via the
    // generic mdast walker — never reachable for valid MDX (parser
    // always sets a name on flow/text JSX elements), but the type
    // narrowing requires the check. Not an authoring-error path.
    if (!el.name) return;
    const target = INLINE_REF_TARGETS[el.name];
    // R7 disposition: pass-through filter for non-inline-ref JSX. The
    // visitor walks every mdxJsxFlowElement + mdxJsxTextElement in the
    // tree; the vast majority (Strong, Em, code components, etc.) are
    // not inline-refs and produce no entry. NOT an authoring error —
    // see the file-level JSDoc on `extractInlineRefUsages` above for
    // the full disposition rationale (TypeScript's prop-type gate
    // catches the actual malformed cases at the call site).
    if (!target) return;

    const refKey = readStringAttr(el, target.prop);
    // R7 disposition: missing lookup prop. Per the file-level JSDoc
    // above, malformed JSX shape (e.g., <GlossaryTerm> with no name=)
    // is caught by TypeScript's prop-type check at the call site, not
    // by the extractor. The audit's D4/E4/F2/C1 invariants check
    // different shapes (unresolved target IDs against the registry),
    // not source-side empty-prop. Silent skip is correct here.
    if (!refKey) return;

    out.push({
      kind: target.kind,
      refKey,
      unit: unitId,
    });
  };

  visit(tree, "mdxJsxFlowElement", visitor);
  visit(tree, "mdxJsxTextElement", visitor);

  return out;
}
