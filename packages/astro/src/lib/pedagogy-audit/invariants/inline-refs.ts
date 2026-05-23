import type { PedagogyIndex } from "@sophie/core/schema";
import { slugify } from "@sophie/core/schema";
import type { AuditContext } from "../context.ts";
import type { FindingSink } from "../types.ts";

/**
 * Inline-cross-ref audit invariants (D4 / E4 / F1 / F2 / C1).
 *
 *   D4 ERROR — <GlossaryTerm name="X"> for X not in definitions.
 *   E4 ERROR — <EquationRef refId="X"> for X not in equations registry.
 *   F1 ERROR — <Figure name="X"> for X not in figureRegistry.
 *   F2 ERROR — <FigureRef name="X"> for X not in figureRegistry.
 *   C1 ERROR — <ChapterRef slug="X"> for X not in chapters collection.
 *
 * Co-located here because all five share the same structural shape:
 * walk a single collection and assert each reference resolves against
 * a pre-computed lookup set on `AuditContext`. F1 walks `figureUsages`
 * (registry-mode `<Figure>` callsites); the other four walk
 * `inlineRefUsages` filtered by `kind`.
 */
export function checkInlineRefs(
  index: PedagogyIndex,
  ctx: AuditContext,
  sink: FindingSink
): void {
  // D4 — undefined <GlossaryTerm name="X">. Slugify both sides so
  // casing/whitespace differences (e.g. `name="Dark matter"` vs
  // `<Aside title="Dark Matter">`) don't trigger false ERRORs.
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "glossary-term") continue;
    const refSlug = slugify(usage.refKey);
    if (ctx.definitionSlugs.has(refSlug)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "D4",
      message: `D4: <GlossaryTerm name="${usage.refKey}"> in chapter "${usage.unit}" — no matching <Aside kind="definition"> found.`,
      location: { unit: usage.unit },
    });
  }

  // E4 — undefined <EquationRef refId="X">.
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "eq-ref") continue;
    if (ctx.equationSlugs.has(usage.refKey)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "E4",
      message: `E4: <EquationRef refId="${usage.refKey}"> in chapter "${usage.unit}" — no matching equation registry entry found.`,
      location: { unit: usage.unit },
    });
  }

  // F1 — <Figure name="X"> for X not in figureRegistry. The extractor
  // (`extractFigures`) records figureUsages without validating the
  // name against the registry — the registry isn't visible to the
  // extractor at MDX-parse time. The audit is the first place we hold
  // both pieces of state.
  for (const use of index.figureUsages) {
    if (ctx.figureRegistryNames.has(use.name)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "F1",
      message: `F1: <Figure name="${use.name}"> in chapter "${use.unit}" — name not present in figureRegistry. Resolution: add an entry to content/figures.ts, or fix the name typo.`,
      location: { unit: use.unit, anchor: use.anchor },
    });
  }

  // F2 — <FigureRef name="X"> for X not in figureRegistry. Different
  // element type (FigureRef vs Figure), same name space.
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "figure-ref") continue;
    if (ctx.figureRegistryNames.has(usage.refKey)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "F2",
      message: `F2: <FigureRef name="${usage.refKey}"> in chapter "${usage.unit}" — name not present in figureRegistry.`,
      location: { unit: usage.unit },
    });
  }

  // C1 — <ChapterRef chapter="X"> for unknown chapter slug. W2/D3:
  // prop renamed from `slug` → `chapter`; the resolution set comes
  // from index.units[u.id] per context.ts (the W2 D4 1:1 convention
  // means the chapter slug == unit id == reading-artifact id).
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "chapter-ref") continue;
    if (ctx.chapterSlugs.has(usage.refKey)) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "C1",
      message: `C1: <ChapterRef chapter="${usage.refKey}"> in chapter "${usage.unit}" — no matching unit in the units collection.`,
      location: { unit: usage.unit },
    });
  }
}
