import * as pagefind from "pagefind";
import {
  converters,
  type PagefindCustomRecord,
} from "./pagefind-converters/index.ts";
import { indexAccumulator } from "./pedagogy-index-extractor.ts";

/**
 * Pagefind postbuild orchestrator. Runs from the
 * astro:build:done integration hook in
 * packages/astro/src/integration.ts.
 *
 * Two pipelines feeding one index:
 *   1. index.addDirectory(distPath) — Pagefind's default HTML crawl
 *      walks the built site; emits page records from chapter prose
 *      with filters.type=['page'].
 *   2. converters[entitySource](entity, ctx) for each entity in the
 *      in-memory indexAccumulator (the same singleton populated by
 *      pedagogyIndexRemarkPlugin during MDX render).
 *
 * Reads indexAccumulator directly per plan errata §1 — the
 * dist/.sophie/pedagogy-index.json artifact referenced in design
 * doc §4 doesn't exist today (ADR 0045 is docs-only). When that
 * artifact ships, the read can switch to it without changing the
 * converters or the pipeline shape.
 */
export async function buildPagefindIndex(distPath: string): Promise<void> {
  const pedagogyIndex = indexAccumulator.asPedagogyIndex();

  const { index } = await pagefind.createIndex({
    rootSelector: "main",
    excludeSelectors: [".no-index", "nav", "footer", "[data-pagefind-ignore]"],
    forceLanguage: "en",
  });
  if (!index) {
    throw new Error("pagefind.createIndex returned no index handle");
  }

  const { errors: dirErrors } = await index.addDirectory({
    path: distPath,
  });
  if (dirErrors.length > 0) {
    throw new Error(`Pagefind HTML crawl errors: ${dirErrors.join("; ")}`);
  }

  const chapterBySlug = new Map(pedagogyIndex.chapters.map((c) => [c.slug, c]));
  const moduleBySlug = new Map(pedagogyIndex.modules.map((m) => [m.slug, m]));
  // Figures are 1:N to chapters; each FigureUsageEntry joins to
  // FigureRegistryEntry by `name` for src/alt/caption metadata.
  const registryByName = new Map(
    pedagogyIndex.figureRegistry.map((r) => [r.name, r])
  );

  const entitySources = Object.keys(converters) as Array<
    keyof typeof converters
  >;

  for (const entitySource of entitySources) {
    const entities = pedagogyIndex[entitySource] ?? [];
    const converter = converters[entitySource];
    for (const entity of entities) {
      const chapter = chapterBySlug.get(entity.chapter);
      const module = chapter ? moduleBySlug.get(chapter.module) : undefined;
      if (!chapter || !module) continue;
      const ctx = {
        chapterTitle: chapter.title,
        moduleTitle: module.title,
        moduleSlug: module.slug,
      };

      // figureUsages is the only converter that takes a lookup arg
      // (the matching FigureRegistryEntry for src/alt/caption).
      // Orphan usages (no matching registry entry) are skipped — the
      // audit pass catches them as F-class invariants.
      let record: PagefindCustomRecord;
      if (entitySource === "figureUsages") {
        const registry = registryByName.get((entity as { name: string }).name);
        if (!registry) continue;
        record = (
          converter as (
            e: typeof entity,
            r: typeof registry,
            c: typeof ctx
          ) => PagefindCustomRecord
        )(entity, registry, ctx);
      } else {
        record = (
          converter as (e: typeof entity, c: typeof ctx) => PagefindCustomRecord
        )(entity, ctx);
      }
      const { errors } = await index.addCustomRecord(record);
      if (errors.length > 0) {
        throw new Error(
          `Pagefind addCustomRecord errors for ${entitySource}: ${errors.join("; ")}`
        );
      }
    }
  }

  const { errors: writeErrors } = await index.writeFiles({
    outputPath: `${distPath}/pagefind`,
  });
  if (writeErrors.length > 0) {
    throw new Error(`Pagefind writeFiles errors: ${writeErrors.join("; ")}`);
  }

  await pagefind.close();
}
