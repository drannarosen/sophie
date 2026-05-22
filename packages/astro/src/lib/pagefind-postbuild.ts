import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PedagogyIndex } from "@sophie/core/schema";
import * as pagefind from "pagefind";
import {
  converters,
  type PagefindCustomRecord,
} from "./pagefind-converters/index.ts";
import { indexAccumulator } from "./pedagogy-index/accumulator.ts";
import { writeValidationIndexMarkdown } from "./validation/index-writer.ts";

/**
 * Emit the consumer's `PedagogyIndex` snapshot to
 * `<distPath>/.sophie/pedagogy-index.json` — the build artifact that
 * `sophie diff` (Phase 3, ADR 0045) consumes to compare semantic
 * content across two git refs.
 *
 * Per ADR 0045 §"Artifact 2": this file is the contract between
 * `sophie build` and `sophie diff`; diff does not import in-process
 * from build, it reads the JSON. Keeps the two commands independent
 * so a future `@sophie/diff` package can ship without depending on
 * `@sophie/astro`.
 *
 * 2-space indent matches Sophie's general formatting convention and
 * keeps diffs readable. `mkdir({ recursive: true })` covers the case
 * where `.sophie/` doesn't exist yet (always true on a fresh build).
 */
export async function writePedagogyIndexJson(
  distPath: string,
  pedagogyIndex: PedagogyIndex
): Promise<void> {
  const sophieDir = join(distPath, ".sophie");
  await mkdir(sophieDir, { recursive: true });
  const outPath = join(sophieDir, "pedagogy-index.json");
  await writeFile(outPath, JSON.stringify(pedagogyIndex, null, 2), "utf-8");
}

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
 * Reads indexAccumulator directly per plan errata §1. The
 * `dist/.sophie/pedagogy-index.json` artifact (ADR 0045) is emitted
 * as a byproduct via `writePedagogyIndexJson` below; Pagefind
 * conversion still consumes the in-memory accumulator (same data,
 * one source of truth per build).
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

  // W2/D3 graduation: pedagogyIndex.chapters + .modules deleted.
  // chapterBySlug now keys by `u.id` (== chapter slug per W2/D4 1:1);
  // moduleBySlug keys by section slug (the W2 equivalent of module).
  // Records carry section as "module" downstream for pagefind facet
  // continuity until W4 rebrands the search facets.
  const chapterBySlug = new Map(
    pedagogyIndex.units.map((u) => [u.id, u] as const)
  );
  const moduleBySlug = new Map(
    pedagogyIndex.sections.map((s) => [s.slug, s] as const)
  );
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
      // Post-ADR-0060: equations are registry-sourced (no `chapter` on
      // the entry). Look up the first citation to derive the module
      // context for the locator string; skip orphan declarations.
      let entityChapterSlug: string | undefined;
      if (entitySource === "equations") {
        const eq = entity as { id: string };
        entityChapterSlug = pedagogyIndex.equationCitations.find(
          (c) => c.refId === eq.id
        )?.chapter;
      } else {
        entityChapterSlug = (entity as { chapter?: string }).chapter;
      }
      const chapter = entityChapterSlug
        ? chapterBySlug.get(entityChapterSlug)
        : undefined;
      // W2/D2: Unit's section binding is via section_id (was chapter.module).
      const module = chapter ? moduleBySlug.get(chapter.section_id) : undefined;
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

  // ADR 0045 Artifact 2: emit the PedagogyIndex JSON snapshot for
  // `sophie diff` to consume across git refs. Independent of Pagefind;
  // emitted after Pagefind close so a Pagefind failure surfaces first.
  await writePedagogyIndexJson(distPath, pedagogyIndex);

  // ADR 0056 PR 5: emit the validation-status index Markdown page.
  // Consumes the same in-memory `pedagogyIndex` snapshot the JSON
  // write just used — one extraction pass, two outputs. The writer
  // is silent when `SOPHIE_DOCS_INCLUDE_VALIDATION=0` or when
  // `docs/website/status/` is absent (e.g. the smoke fixture's
  // build root). `process.cwd()` matches the `repoRoot` used by
  // TextbookLayout's `extractContractValidations` call so the two
  // sites resolve identically.
  await writeValidationIndexMarkdown(pedagogyIndex, process.cwd());
}
