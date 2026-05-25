import type {
  AuditFinding,
  InlineRefKind,
  InlineRefUsageEntry,
} from "@sophie/core/schema";
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
 * Return true when `el.attributes` declares any Astro hydration
 * directive (`client:load`, `client:visible`, `client:idle`,
 * `client:only`, `client:media`). Detection is name-prefix only —
 * the value shape varies per directive (`client:only="react"`,
 * `client:media="(min-width: 768px)"`, the rest are boolean-presence)
 * and CL1 only cares whether *any* `client:*` is declared.
 *
 * The five store-backed components (`GlossaryTerm`, `EquationRef`,
 * `FigureRef`, `ChapterRef`, `KeyEquation`) MUST hydrate to function
 * post-ADR-0038-Amendment-2's `useHydrated` gate — without a `client:*`
 * directive they stay SSR'd, the gate never opens, and they render
 * permanently as bare prose. CL1 is the build-time audit invariant
 * that catches this authoring drift before the chapter ships.
 */
function hasClientDirective(el: {
  attributes?: ReadonlyArray<{ name: string }>;
}): boolean {
  for (const attr of el.attributes ?? []) {
    if (attr.name?.startsWith("client:")) return true;
  }
  return false;
}

/**
 * Result of one read-only `extractInlineRefUsages` pass: the inline-
 * ref usages + any extractor-layer findings. Today the only finding
 * code is **CL1** (ERROR) — missing `client:*` directive on a store-
 * backed component (ADR 0038 § A2.6). Findings flow into
 * `PedagogyIndex.extractorFindings` via
 * `indexAccumulator.addExtractorFindings(findings)` and route into
 * the audit report's `errors` array through
 * `passthroughExtractorFindings`.
 */
export interface InlineRefExtractionResult {
  usages: InlineRefUsageEntry[];
  findings: AuditFinding[];
}

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
 *
 * **CL1 (ADR 0038 § A2.6):** For each matched inline-ref callsite,
 * additionally check for any `client:*` hydration directive. When
 * absent, emit one ERROR finding per callsite. The three store-backed
 * inline-ref components hydrate via Astro islands; without a
 * `client:*` directive they stay SSR'd and the `useHydrated` gate
 * never opens. CL1 catches this at build time. Findings ride
 * `PedagogyIndex.extractorFindings` and surface in the audit report
 * via `passthroughExtractorFindings`.
 */
export function extractInlineRefUsages(
  tree: Root,
  unitId: string
): InlineRefExtractionResult {
  const usages: InlineRefUsageEntry[] = [];
  const findings: AuditFinding[] = [];

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

    // CL1: emit BEFORE the lookup-prop early-return so a
    // `<GlossaryTerm>` (bare AND missing name) still surfaces the
    // hydration drift. Without this ordering an author who drops both
    // attrs only sees the prop-type warning, never the CL1 error.
    if (!hasClientDirective(el)) {
      findings.push({
        severity: "ERROR",
        code: "CL1",
        message: `CL1: <${el.name}> in chapter "${unitId}" is missing a \`client:*\` hydration directive (e.g. \`client:load\`). The store-backed inline-ref components (GlossaryTerm, EquationRef, FigureRef, ChapterRef) require Astro hydration to function — without it the \`useHydrated\` gate never opens and the component renders permanently as bare prose. Resolution: add \`client:load\` (or another \`client:*\` directive) at the callsite. (ADR 0038 § A2.6.)`,
        location: { unit: unitId },
      });
    }

    const refKey = readStringAttr(el, target.prop);
    // R7 disposition: missing lookup prop. Per the file-level JSDoc
    // above, malformed JSX shape (e.g., <GlossaryTerm> with no name=)
    // is caught by TypeScript's prop-type check at the call site, not
    // by the extractor. The audit's D4/E4/F2/C1 invariants check
    // different shapes (unresolved target IDs against the registry),
    // not source-side empty-prop. Silent skip is correct here.
    if (!refKey) return;

    usages.push({
      kind: target.kind,
      refKey,
      unit: unitId,
    });
  };

  visit(tree, "mdxJsxFlowElement", visitor);
  visit(tree, "mdxJsxTextElement", visitor);

  return { usages, findings };
}
