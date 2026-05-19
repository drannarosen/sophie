import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexAccumulator } from "@sophie/astro";
import type { AstroIntegration } from "astro";

/**
 * Smoke-target-only Astro integration that writes a snapshot of the
 * populated PedagogyIndex to `dist/.sophie-pedagogy-index.json` after
 * the build completes (Session 9 Area 3).
 *
 * Why this exists: `examples/smoke/e2e/proving-chapter.spec.ts`
 * previously hard-coded structural counts (36 asides, 18 figures, 8
 * tables…) that had to be updated every time the rendering shape
 * evolved (PR-7 +24 from biography children, PR-A −17 from lazy
 * popovers, etc.). The 2026-05-18 post-PR-A audit's Priority 5
 * proposed "drive e2e expectations from `indexAccumulator.asPedagogyIndex()`
 * snapshots, not literal counts" so the test survives shape refactors.
 *
 * This integration is the bridge: the e2e test's beforeAll reads this
 * JSON, derives expected element counts + per-entry existence
 * assertions from the index data, and writes assertions in terms of
 * the index — not in terms of literal numbers.
 *
 * Why not in `@sophie/astro`: the JSON dump is test-only infrastructure.
 * Production consumers don't need it; embedding it would add an
 * unused dist artifact to every Sophie-consumer build. Astro's
 * integration system supports stacking, so the smoke target adds this
 * one alongside the main `defineSophieIntegration()`.
 *
 * Output shape: `JSON.stringify(index, null, 2)` of the full
 * PedagogyIndex (all 16 collections). Total size is small (~10–50 KB
 * for the smoke chapter) — the dump runs once per build and is
 * gitignored under `dist/`.
 */
export function pedagogyIndexDumpIntegration(): AstroIntegration {
  return {
    name: "smoke:pedagogy-index-dump",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const distPath = fileURLToPath(dir);
        const outPath = join(distPath, ".sophie-pedagogy-index.json");
        const index = indexAccumulator.asPedagogyIndex();
        await writeFile(outPath, JSON.stringify(index, null, 2), "utf8");
        const total =
          index.definitions.length +
          index.equations.length +
          index.keyInsights.length +
          index.misconceptions.length +
          index.interventions.length +
          index.figureUsages.length;
        logger.info(
          `Wrote pedagogy-index snapshot (${total} pedagogy entries) to ${outPath}`
        );
      },
    },
  };
}
