import { EquationEntrySchema, type PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Registry-ecosystem audit invariants per ADR 0060 (R1–R4).
 *
 *   R1 ERROR    chapter cites <KeyEquation refId="X"> but no registry
 *               entry with id="X" exists.
 *   R2 WARNING  registry declares an equation but no chapter cites it
 *               (orphan declaration — common during in-flight
 *               authoring, so WARNING not ERROR).
 *   R3 ERROR    registry entry fails EquationEntrySchema-shape
 *               validation. The extractor's content-layer validation
 *               catches this at parse time; R3 is defense-in-depth for
 *               index entries that reached the audit somehow malformed.
 *   R4 WARNING  equation entry's `related[].refId` points at a non-
 *               existent registry entry. Authoring slip-up; surface as
 *               warning rather than error so in-flight cross-refs land.
 */
export function checkEquationRegistry(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  const registeredEquationIds = new Set(index.equations.map((e) => e.id));

  // R1 ERROR — citation references a refId not in the registry.
  for (const citation of index.equationCitations) {
    if (registeredEquationIds.has(citation.refId)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "R1",
      message: `R1: <KeyEquation refId="${citation.refId}"> in chapter "${citation.unit}" references an equation not declared in the registry. Resolution: create \`examples/smoke/src/content/equations/${citation.refId}.mdx\` (or fix the refId).`,
      location: { unit: citation.unit, anchor: citation.anchor },
    });
  }

  // R2 WARNING — registry entry has zero citations.
  const citedRefIds = new Set(index.equationCitations.map((c) => c.refId));
  for (const eq of index.equations) {
    if (citedRefIds.has(eq.id)) continue;
    sink.warnings.push({
      severity: "WARNING",
      code: "R2",
      message: `R2: equation registry entry "${eq.id}" is declared but no chapter cites it via <KeyEquation refId="${eq.id}">. Either reference it from a chapter or remove the registry file.`,
      location: { anchor: eq.id },
    });
  }

  // R3 ERROR — registry entry violates EquationEntrySchema shape.
  // Defense in depth — the extractor already validates frontmatter via
  // EquationRegistryEntrySchema.safeParse and throws on failure. R3
  // catches the case where a future code path skips that validation
  // and pushes a malformed entry into the index.
  for (const eq of index.equations) {
    const parsed = EquationEntrySchema.safeParse(eq);
    if (parsed.success) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "R3",
      message: `R3: equation registry entry "${eq.id ?? "(unknown)"}" failed schema validation. ${parsed.error.message}`,
      location: typeof eq.id === "string" ? { anchor: eq.id } : {},
    });
  }

  // R4 WARNING — related[].refId points at a non-existent equation.
  for (const eq of index.equations) {
    if (!eq.related || eq.related.length === 0) continue;
    for (const rel of eq.related) {
      if (registeredEquationIds.has(rel.refId)) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "R4",
        message: `R4: equation "${eq.id}" declares related[].refId="${rel.refId}" but no registry entry with that id exists. Either add the registry file or remove the cross-reference.`,
        location: { anchor: eq.id },
      });
    }
  }
}
