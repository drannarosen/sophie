import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

/**
 * Security acceptance gate (ADR 0096, Task 8 / W4 capstone) — proves the
 * gated-solutions feature's central guarantee against the REAL built site,
 * not a unit-level proxy: gated solution text is absent from EVERY surface of
 * the deployed `dist/` tree — HTML routes, pedagogy-index JSON, Library
 * rollups, AND the (gzip-compressed) Pagefind search index.
 *
 * The search-index surface is load-bearing and subtle: Pagefind stores its
 * fragments/index/meta/filter files as gzip-compressed binary
 * (magic bytes `0x1f 0x8b`). A plaintext `readFileSync(file).includes(...)`
 * can NEVER match a sentinel inside a gzipped fragment, so a plaintext sweep
 * over `dist/pagefind/` is a structural false-green — it would MISS a
 * regression that compiled + indexed gated content into search. This spec
 * therefore DECOMPRESSES every Pagefind artifact before asserting (see
 * `readPagefindText`).
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
 *              EVERY surface: the HTML/JSON/Library plaintext of the dist
 *              tree AND the DECOMPRESSED Pagefind index. The gated route
 *              renders only a placeholder, and gated content never compiles
 *              into any rendered page, so it can never reach search.
 *  - REVEALED — `stars/units/stellar-evolution/solutions.mdx`,
 *              unit `solutionsRevealDate: "2000-01-01"` (always past).
 *              Sentinel `REVEALEDSOLUTIONSENTINELQJ7P2M` is present in its
 *              own `/units/stellar-evolution/solutions/index.html` AND, by
 *              design, in the Pagefind index — a revealed solution is public
 *              study material after the due date, so its `/solutions` page is
 *              crawled and intentionally searchable. It remains ABSENT from
 *              the pedagogy-index JSON and Library rollups: solutions are a
 *              separate collection that never rides the course-wide
 *              `artifacts` render/index sweep (C1, `CHAPTER_ARTIFACT_LEAF_RE`).
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

/**
 * Concatenated decompressed text of the entire Pagefind index under
 * `dist/pagefind/`. Pagefind stores fragments / index / meta / filter
 * artifacts as gzip-compressed binary (magic bytes `0x1f 0x8b`); the JS/CSS
 * runtime assets and `pagefind-entry.json` are plaintext. We gunzip the
 * gzip-magic files and read the rest as UTF-8, so a sentinel that landed
 * inside a compressed fragment is actually visible to `.includes(...)`.
 * Without this, any Pagefind assertion is a vacuous false-green.
 */
function readPagefindText(distDir: string): string {
  const GZIP_MAGIC_0 = 0x1f;
  const GZIP_MAGIC_1 = 0x8b;
  return walk(join(distDir, "pagefind"))
    .map((file) => {
      const bytes = readFileSync(file);
      const gzipped =
        bytes.length >= 2 &&
        bytes[0] === GZIP_MAGIC_0 &&
        bytes[1] === GZIP_MAGIC_1;
      return (gzipped ? gunzipSync(bytes) : bytes).toString("utf8");
    })
    .join("\n");
}

test.describe("gated-solutions security gate (ADR 0096)", () => {
  test("GATED sentinel is absent from every plaintext surface of dist/", () => {
    // HTML routes, the pedagogy-index JSON dumps, and the Library rollups are
    // all real plaintext under dist/, so a single recursive sweep covers them.
    // (The Pagefind index is gzipped binary — covered by the decompressed
    // assertion below, not here.)
    const hits = distFilesContaining(GATED_SENTINEL);
    expect(hits, `gated solution text leaked into: ${hits.join(", ")}`).toEqual(
      []
    );
  });

  test("GATED sentinel is absent from the DECOMPRESSED Pagefind index", () => {
    // Load-bearing: Pagefind fragments are gzip-compressed, so a plaintext
    // grep over dist/pagefind/ can never match and would silently pass even if
    // gated content were indexed. Decompress first, then assert absence — this
    // is the assertion that genuinely guards the search surface.
    expect(readPagefindText(DIST)).not.toContain(GATED_SENTINEL);
  });

  test("GATED route renders the placeholder, not the withheld artifact", () => {
    const html = readFileSync(GATED_ROUTE, "utf8");
    expect(html).toContain("Solutions not yet available");
    expect(html).toContain("unlock on");
    expect(html).not.toContain(GATED_SENTINEL);
  });

  test("REVEALED sentinel is present in its own solutions route", () => {
    // The revealed sentinel rides the rendered /solutions page (real
    // plaintext HTML) and, intentionally, the Pagefind index (asserted
    // separately below). It must NOT appear in any OTHER plaintext file —
    // pedagogy-index JSON and Library rollups stay clean (next test).
    const plaintextHits = distFilesContaining(REVEALED_SENTINEL);
    expect(plaintextHits).toEqual([REVEALED_ROUTE]);
    expect(readFileSync(REVEALED_ROUTE, "utf8")).toContain(REVEALED_SENTINEL);
  });

  test("REVEALED sentinel IS searchable (public after reveal) but absent from index + Library", () => {
    // A revealed solution is public study material after the due date, so its
    // /solutions page is crawled by Pagefind and intentionally searchable.
    // Pin that intent with a positive assertion: an accidental change that
    // dropped revealed solutions from search would turn this RED.
    expect(readPagefindText(DIST)).toContain(REVEALED_SENTINEL);

    // Separate-collection exclusion (C1, CHAPTER_ARTIFACT_LEAF_RE) still holds
    // even for a revealed solution: it never rides the course-wide artifacts
    // render/index pass, so it stays out of the pedagogy-index JSON and the
    // Library rollups.
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
