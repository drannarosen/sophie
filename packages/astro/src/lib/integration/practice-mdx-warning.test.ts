import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { warnOnUnroutedPracticeMdx } from "./practice-mdx-warning.ts";

/**
 * Builds a throwaway content-collection tree per test and exercises
 * the walk. Tests use `vi.fn()` for the logger so we can assert
 * both the call count and the message text without coupling to a
 * specific Logger implementation.
 */

describe("warnOnUnroutedPracticeMdx", () => {
  let root: string;
  let logger: { warn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "sophie-practice-warn-"));
    logger = { warn: vi.fn() };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeFile(relPath: string, body = ""): void {
    const full = path.join(root, relPath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }

  test("returns empty + does not warn when no sections dir exists", () => {
    const found = warnOnUnroutedPracticeMdx(root, logger);
    expect(found).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test("returns empty + does not warn when no practice.mdx files exist", () => {
    writeFile("sections/stars/units/spectra/reading.mdx", "# spectra");
    const found = warnOnUnroutedPracticeMdx(root, logger);
    expect(found).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test("warns once per practice.mdx found, returns absolute paths", () => {
    writeFile("sections/stars/units/spectra/practice.mdx", "# practice");
    writeFile(
      "sections/stars/units/hydrostatic-equilibrium/practice.mdx",
      "# practice"
    );
    writeFile("sections/stars/units/spectra/reading.mdx", "# reading");
    const found = warnOnUnroutedPracticeMdx(root, logger);
    expect(found).toHaveLength(2);
    expect(found.every((p) => path.isAbsolute(p))).toBe(true);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    // Each warn message mentions the file path and the tracking issue.
    for (const call of logger.warn.mock.calls) {
      const [msg] = call as [string];
      expect(msg).toMatch(/practice\.mdx/);
      expect(msg).toMatch(/issues\/189/);
    }
  });

  test("skips node_modules and dot-directories", () => {
    writeFile("sections/stars/units/spectra/practice.mdx", "# real");
    writeFile("node_modules/dep/practice.mdx", "# noise");
    writeFile(".astro/practice.mdx", "# noise");
    const found = warnOnUnroutedPracticeMdx(root, logger);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/sections\/stars\/units\/spectra\/practice\.mdx$/);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  test("ignores files named differently even if path looks practice-like", () => {
    writeFile("sections/stars/units/spectra/practice-extra.mdx", "# nope");
    writeFile("sections/stars/units/practice/reading.mdx", "# also nope");
    const found = warnOnUnroutedPracticeMdx(root, logger);
    expect(found).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
