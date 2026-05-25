import {
  type AuditFinding,
  type EquationCitationEntry,
  slugify,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  type MdxJsxFlowElement,
  readStringAttr,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

/**
 * Return true when `el.attributes` declares any Astro hydration
 * directive (`client:load`, `client:visible`, `client:idle`,
 * `client:only`, `client:media`). Detection is name-prefix only —
 * CL1 cares only whether *any* `client:*` directive is declared.
 *
 * Local copy of the same predicate in `inline-refs.ts`. Kept local
 * rather than hoisted to jsx-utils.ts: two callers does not yet
 * warrant a shared helper (DRY threshold is ≥2 paying callers AND a
 * cleanly factor-able shape; the inline-refs caller walks both flow
 * and text JSX, this caller walks flow only — refactor once a third
 * extractor needs the same check).
 */
function hasClientDirective(node: MdxJsxFlowElement): boolean {
  for (const attr of node.attributes ?? []) {
    if (attr.name?.startsWith("client:")) return true;
  }
  return false;
}

/**
 * Result of one read-only `extractEquationCitations` pass: the parsed
 * entries + any extractor-layer findings. Today the only finding code
 * is **CL1** (ERROR) — missing `client:*` directive on `<KeyEquation>`
 * (ADR 0038 § A2.6). Findings flow into
 * `PedagogyIndex.extractorFindings` via
 * `indexAccumulator.addExtractorFindings(findings)` and route into the
 * audit report's `errors` array through
 * `passthroughExtractorFindings`.
 */
export interface EquationCitationExtractionResult {
  entries: EquationCitationEntry[];
  findings: AuditFinding[];
}

/**
 * Pure chapter walker per ADR 0060. Walks an mdast tree for
 * `<KeyEquation refId="X" />` callsites; returns one
 * `EquationCitationEntry` per callsite with extractor-assigned per-
 * chapter `number` (1-indexed, source order). Optional children render
 * to `framingHtml` for chapter-specific framing prose; absent children
 * → `framingHtml` is unset.
 *
 * Throws when:
 *   - A `<KeyEquation>` is missing the `refId` attr (the registry
 *     contract requires a target id).
 *
 * **CL1 (ADR 0038 § A2.6):** For each `<KeyEquation>` callsite,
 * additionally check for any `client:*` hydration directive. When
 * absent, emit one ERROR finding. `<KeyEquation>` hydrates via the
 * equations registry store; without `client:*` the `useHydrated` gate
 * never opens and the component renders as bare prose. CL1 catches
 * this at build time. Findings ride `PedagogyIndex.extractorFindings`
 * and surface in the audit report via `passthroughExtractorFindings`.
 */
export function extractEquationCitations(
  tree: Root,
  unitId: string,
  chapterNumber?: number
): EquationCitationExtractionResult {
  const entries: EquationCitationEntry[] = [];
  const findings: AuditFinding[] = [];
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "KeyEquation") return;

    const refId = readStringAttr(el, "refId");
    if (!refId) {
      throw new Error(
        `<KeyEquation> in chapter "${unitId}" is missing a non-empty \`refId\` attr. Post-ADR-0060, every chapter-side <KeyEquation> must cite a registry entry via \`refId\`.`
      );
    }

    if (!hasClientDirective(el)) {
      findings.push({
        severity: "ERROR",
        code: "CL1",
        message: `CL1: <KeyEquation refId="${refId}"> in chapter "${unitId}" is missing a \`client:*\` hydration directive (e.g. \`client:load\`). <KeyEquation> hydrates from the equations registry store — without a \`client:*\` directive the \`useHydrated\` gate never opens and the equation renders permanently as bare prose. Resolution: add \`client:load\` (or another \`client:*\` directive) at the callsite. (ADR 0038 § A2.6.)`,
        location: { unit: unitId },
      });
    }

    counter += 1;
    const framingHtml = renderChildrenToHtml(el.children).trim();
    const anchor = `${slugify(refId)}-citation-${counter}`;
    entries.push({
      unit: unitId,
      refId: slugify(refId),
      anchor,
      number: counter,
      ...(chapterNumber !== undefined ? { chapterNumber } : {}),
      ...(framingHtml.length > 0 ? { framingHtml } : {}),
    });
  });

  return { entries, findings };
}
