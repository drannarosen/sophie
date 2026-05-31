import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Security acceptance gate (ADR 0096, Task 8 / W4 capstone) — proves the
 * gated-solutions feature's central guarantee against the REAL built site,
 * not a unit-level proxy: gated solution text is absent from the deployed
 * `dist/` tree, and even revealed solution text never leaks into the
 * Library rollups / Pagefind search index / pedagogy-index JSON.
 *
 * This is a standing regression gate — it replaces the one-time manual
 * sentinel proof done during the C1 fix. It runs in CI's `e2e` job, which
 * builds the smoke target (`turbo run build --filter=smoke`) before
 * `pnpm test:e2e`, so the `dist/` tree this spec greps is the same artifact
 * Playwright's webServer previews. No page is loaded — these assertions read
 * the filesystem directly (mirrors `proving-chapter.spec.ts`'s
 * `readFileSync` of `dist/.sophie-pedagogy-index.json`).
 *
 * Two permanent fixtures back the gate (set up via explicit per-unit
 * `solutionsRevealDate` so the build wall-clock makes them deterministic
 * forever — no `homework.sophie.yaml` needed in the smoke fixture):
 *
 *  - GATED   — `foundations/units/measuring-the-sky/solutions.mdx`,
 *              unit `solutionsRevealDate: "2999-01-01"` (always future).
 *              Sentinel `GATEDSOLUTIONSENTINELXKCD9Z` must be absent from
 *              the ENTIRE `dist/` tree.
 *  - REVEALED — `stars/units/stellar-evolution/solutions.mdx`,
 *              unit `solutionsRevealDate: "2000-01-01"` (always past).
 *              Sentinel `REVEALEDSOLUTIONSENTINELQJ7P2M` is present ONLY in
 *              its own `/units/stellar-evolution/solutions/index.html`, and
 *              still absent from Pagefind + pedagogy-index JSON + Library
 *              rollups (separate-collection exclusion holds even when
 *              revealed — solutions never ride the `artifacts` sweep, C1).
 *
 * Each sentinel rides three surfaces in its fixture — a `<Solution>` reveal,
 * a `<GlossaryTerm>`, and a misconception `<Aside>` — so a regression of the
 * index/Library/search side-channel (not just the route gate) is caught.
 */

const GATED_SENTINEL = "GATEDSOLUTIONSENTINELXKCD9Z";
const REVEALED_SENTINEL = "REVEALEDSOLUTIONSENTINELQJ7P2M";

const DIST = resolve(import.meta.dirname, "..", "dist");
const REVEALED_ROUTE = join(
  DIST,
  "units",
  "stellar-evolution",
  "solutions",
  "index.html"
);
const GATED_ROUTE = join(
  DIST,
  "units",
  "measuring-the-sky",
  "solutions",
  "index.html"
);

/** Every regular file under `dir`, recursively, as absolute paths. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/** Absolute paths of files under `dist/` whose bytes contain `needle`. */
function distFilesContaining(needle: string): string[] {
  return walk(DIST).filter((file) =>
    readFileSync(file, "utf8").includes(needle)
  );
}

test.describe("gated-solutions security gate (ADR 0096)", () => {
  test("GATED sentinel is absent from the entire dist/ tree", () => {
    // HTML routes, dist/pagefind/*, AND the pedagogy-index JSON dumps are all
    // under dist/, so a single recursive sweep covers every channel.
    const hits = distFilesContaining(GATED_SENTINEL);
    expect(hits, `gated solution text leaked into: ${hits.join(", ")}`).toEqual(
      []
    );
  });

  test("GATED route renders the placeholder, not the withheld artifact", () => {
    const html = readFileSync(GATED_ROUTE, "utf8");
    expect(html).toContain("Solutions not yet available");
    expect(html).toContain("unlock on");
    expect(html).not.toContain(GATED_SENTINEL);
  });

  test("REVEALED sentinel is present ONLY in its own solutions route", () => {
    const hits = distFilesContaining(REVEALED_SENTINEL);
    expect(hits).toEqual([REVEALED_ROUTE]);
    expect(readFileSync(REVEALED_ROUTE, "utf8")).toContain(REVEALED_SENTINEL);
  });

  test("REVEALED sentinel is absent from search + index + Library rollups", () => {
    // Separate-collection exclusion (C1) holds even for a revealed solution:
    // it is never swept into the course-wide artifacts render/index pass.
    const pagefind = walk(join(DIST, "pagefind"));
    for (const file of pagefind) {
      expect(
        readFileSync(file, "utf8").includes(REVEALED_SENTINEL),
        `Pagefind index leaked revealed solution text: ${file}`
      ).toBe(false);
    }

    for (const jsonPath of [
      join(DIST, ".sophie-pedagogy-index.json"),
      join(DIST, ".sophie", "pedagogy-index.json"),
    ]) {
      expect(readFileSync(jsonPath, "utf8")).not.toContain(REVEALED_SENTINEL);
    }

    const libraryFiles = walk(join(DIST, "library"));
    for (const file of libraryFiles) {
      expect(
        readFileSync(file, "utf8").includes(REVEALED_SENTINEL),
        `Library rollup leaked revealed solution text: ${file}`
      ).toBe(false);
    }
  });
});
