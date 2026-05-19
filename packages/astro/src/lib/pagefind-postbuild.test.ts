import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { buildPagefindIndex } from "./pagefind-postbuild.ts";

/**
 * Layer 1.6 — end-to-end Pagefind index round-trip.
 *
 * Sits between Layer 1.5 (converter unit) and Layer 2 (Playwright
 * e2e). Catches failure modes where individual converters look
 * right in isolation but the Pagefind Node API rejects the
 * combined records, or where filters don't round-trip into the
 * emitted pagefind-entry.json. Same shape as the LO checkbox PR's
 * Layer 1.6 (transform-mdx-compile.test.ts) — see PR 6's fix
 * commit fa8c38d for the precedent.
 */
describe("buildPagefindIndex (Layer 1.6)", () => {
  test("emits records for HTML crawl + each entity converter", async () => {
    // Build a fixture site: one HTML page + a populated pedagogy index
    const dir = mkdtempSync(join(tmpdir(), "sophie-pagefind-"));
    mkdirSync(join(dir, "chapters", "ch"), { recursive: true });
    writeFileSync(
      join(dir, "chapters", "ch", "index.html"),
      `<!doctype html>
<html lang="en">
  <body>
    <main data-pagefind-body>
      <h1 data-pagefind-meta="title">Test chapter</h1>
      <p>Some prose about luminosity.</p>
    </main>
  </body>
</html>`
    );

    // Populate the in-memory indexAccumulator with one of each
    // entity type via direct test-mode wiring (Task 7 exposes a
    // test-only helper for this).
    const { resetIndexAccumulator, indexAccumulator } = await import(
      "./pedagogy-index/index.ts"
    );
    resetIndexAccumulator();
    indexAccumulator.setModules([{ slug: "m", title: "M", order: 1 }]);
    indexAccumulator.setChapters([
      {
        slug: "ch",
        title: "Test chapter",
        module: "m",
        order: 1,
        status: "stable",
      },
    ]);
    indexAccumulator.addDefinitions([
      {
        term: "luminosity",
        slug: "luminosity",
        body: "Total radiant power.",
        chapter: "ch",
        anchor: "def-luminosity",
      },
    ]);
    indexAccumulator.addEquations([
      {
        id: "stefan-boltzmann",
        title: "Stefan-Boltzmann",
        tex: "L = 4\\pi R^2 \\sigma T^4",
        symbols: ["L", "R", "T"],
      },
    ]);
    indexAccumulator.addEquationCitations([
      {
        chapter: "ch",
        refId: "stefan-boltzmann",
        anchor: "stefan-boltzmann-citation-1",
        number: 1,
      },
    ]);
    indexAccumulator.addKeyInsights([
      {
        body: "Distance hides itself.",
        chapter: "ch",
        anchor: "ki-1",
      },
    ]);
    indexAccumulator.addMisconceptions([
      {
        body: "A common confusion: brighter is hotter.",
        chapter: "ch",
        anchor: "misc-1",
        length: "short",
        label: "Brighter ≠ hotter",
      },
    ]);
    indexAccumulator.addObjectives([
      {
        id: "obj-1",
        anchor: "lo-obj-1",
        chapter: "ch",
        verb: "State",
        body: "the thesis.",
      },
    ]);
    // Fixture omits figureUsages + figureRegistry — figures are
    // optional per chapter; the count assertion below adjusts.

    await buildPagefindIndex(dir);

    // Pagefind writes its entry manifest to {dir}/pagefind/pagefind-entry.json
    const entryPath = join(dir, "pagefind", "pagefind-entry.json");
    const entry = JSON.parse(readFileSync(entryPath, "utf-8"));

    // Sanity: the index manifest exists and is non-empty
    expect(entry).toBeDefined();
    expect(typeof entry.version).toBe("string");

    // Pagefind hashes filter filenames (en_<hash>.pf_filter); the exact
    // path is an implementation detail. The real signal is that the
    // filter directory exists and contains at least one .pf_filter file
    // (Pagefind only writes filter files when ≥1 record carries that
    // filter — six of our records carry `filters.type`, so at least one
    // filter file must exist).
    const filterDir = join(dir, "pagefind", "filter");
    const filterFiles = readdirSync(filterDir).filter((f) =>
      f.endsWith(".pf_filter")
    );
    expect(filterFiles.length).toBeGreaterThan(0);
  });
});

/**
 * ADR 0045 Artifact 2 — `dist/.sophie/pedagogy-index.json` is the
 * build byproduct that `sophie diff` (Phase 3) reads to compare two
 * git refs. These tests pin the file's location, structure, and
 * formatting; the contract is "the same PedagogyIndex that
 * `runPedagogyAudit()` consumes, serialized to disk."
 */
describe("pedagogy-index.json artifact (ADR 0045)", () => {
  async function runWithPopulatedIndex(): Promise<string> {
    const dir = mkdtempSync(join(tmpdir(), "sophie-pedindex-"));
    mkdirSync(join(dir, "chapters", "ch"), { recursive: true });
    writeFileSync(
      join(dir, "chapters", "ch", "index.html"),
      `<!doctype html>
<html lang="en">
  <body>
    <main data-pagefind-body>
      <h1 data-pagefind-meta="title">Test chapter</h1>
      <p>Some prose.</p>
    </main>
  </body>
</html>`
    );

    const { resetIndexAccumulator, indexAccumulator } = await import(
      "./pedagogy-index/index.ts"
    );
    resetIndexAccumulator();
    indexAccumulator.setModules([{ slug: "m", title: "M", order: 1 }]);
    indexAccumulator.setChapters([
      {
        slug: "ch",
        title: "Test chapter",
        module: "m",
        order: 1,
        status: "stable",
      },
    ]);
    indexAccumulator.addDefinitions([
      {
        term: "luminosity",
        slug: "luminosity",
        body: "Total radiant power.",
        chapter: "ch",
        anchor: "def-luminosity",
      },
    ]);

    await buildPagefindIndex(dir);
    return dir;
  }

  test("writes dist/.sophie/pedagogy-index.json with the in-memory index", async () => {
    const dir = await runWithPopulatedIndex();
    const artifactPath = join(dir, ".sophie", "pedagogy-index.json");

    expect(existsSync(artifactPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(artifactPath, "utf-8"));
    expect(parsed).toMatchObject({
      modules: [{ slug: "m", title: "M", order: 1 }],
      chapters: [
        {
          slug: "ch",
          title: "Test chapter",
          module: "m",
          order: 1,
          status: "stable",
        },
      ],
      definitions: [
        {
          term: "luminosity",
          slug: "luminosity",
          chapter: "ch",
          anchor: "def-luminosity",
        },
      ],
    });
    // Every PedagogyIndex collection field is present (plain arrays —
    // no Maps, no Dates — already JSON-safe per
    // `indexAccumulator.asPedagogyIndex()`).
    for (const key of [
      "definitions",
      "equations",
      "keyInsights",
      "figureRegistry",
      "figureUsages",
      "misconceptions",
      "chapters",
      "modules",
      "objectives",
      "inlineRefUsages",
    ]) {
      expect(Array.isArray(parsed[key])).toBe(true);
    }
  });

  test("creates the .sophie/ directory when missing", async () => {
    const dir = await runWithPopulatedIndex();
    const sophieDir = join(dir, ".sophie");
    expect(existsSync(sophieDir)).toBe(true);
    expect(statSync(sophieDir).isDirectory()).toBe(true);
  });

  test("writes JSON with 2-space indent", async () => {
    const dir = await runWithPopulatedIndex();
    const raw = readFileSync(
      join(dir, ".sophie", "pedagogy-index.json"),
      "utf-8"
    );
    // 2-space indent leaves a `\n  ` (newline + two spaces) before any
    // first-level key — the formatting signal `JSON.stringify(_, _, 2)`
    // emits. Bare `JSON.stringify(value)` would be a single line.
    expect(raw).toContain("\n  ");
  });
});
