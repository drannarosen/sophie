import type { PedagogyIndex } from "@sophie/core/schema";
import type { AuditContext } from "../context.ts";
import type { FindingSink } from "../types.ts";

/**
 * Orphan-target audit invariants (D5 / F4).
 *
 *   D5 WARNING — definition declared but no <GlossaryTerm> references it.
 *   F4 WARNING — figureRegistry entry with zero <Figure> AND zero
 *                <FigureRef> usages anywhere in the textbook.
 *
 * Mirror invariants of the "undefined cross-ref" inline-refs file: D5
 * is the inverse of D4, F4 is the inverse of F1 + F2. Different
 * severity (WARNING vs ERROR) because an orphan target is a coverage
 * gap, not a structural error — the build can ship without it.
 *
 * M3 (orphan misconception) is deferred to v2; see the header comment
 * in pedagogy-audit.ts (now the runner) for the rationale.
 */
export function checkOrphans(
  index: PedagogyIndex,
  ctx: AuditContext,
  sink: FindingSink
): void {
  // D5 — orphan definition.
  for (const def of index.definitions) {
    if (ctx.glossaryRefSlugs.has(def.slug)) continue;
    sink.warnings.push({
      severity: "WARNING",
      code: "D5",
      message: `D5: definition "${def.term}" (slug "${def.slug}") in chapter "${def.unit}" has zero <GlossaryTerm> references anywhere in the textbook.`,
      location: { unit: def.unit, anchor: def.anchor },
    });
  }

  // F4 — registry figure with zero usages.
  const usedFigureNames = new Set<string>();
  for (const use of index.figureUsages) usedFigureNames.add(use.name);
  for (const usage of index.inlineRefUsages) {
    if (usage.kind === "figure-ref") usedFigureNames.add(usage.refKey);
  }
  for (const fig of index.figureRegistry) {
    if (usedFigureNames.has(fig.name)) continue;
    sink.warnings.push({
      severity: "WARNING",
      code: "F4",
      message: `F4: figureRegistry entry "${fig.name}" has zero <Figure> and zero <FigureRef> usages anywhere in the textbook.`,
    });
  }
}
