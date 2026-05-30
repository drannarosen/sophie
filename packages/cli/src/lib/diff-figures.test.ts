import { describe, expect, it } from "vitest";
import { diffFigures } from "./diff-figures.ts";

/**
 * `sophie figures check` audit logic (ADR 0094). Pure: it diffs the
 * registry entries against the basenames present in `src/figures/`,
 * resolving each entry through `@sophie/core`'s `resolveFigureFile` (the
 * shared convention) so the audit and the build agree by construction.
 *
 *   - **orphan**  — a master file no registry entry claims.
 *   - **missing** — a registry entry with no resolvable master and no
 *     legacy `src` (or an explicit `file`/ambiguous error from the
 *     shared resolver).
 */
describe("diffFigures (ADR 0094)", () => {
  it("reports no orphans/missing when every file is claimed by convention", () => {
    const result = diffFigures(
      [
        { name: "m51", alt: "a" },
        { name: "ngc1300", alt: "b" },
      ],
      ["m51.png", "ngc1300.jpg"]
    );
    expect(result).toEqual({ orphans: [], missing: [] });
  });

  it("flags a master file no entry claims as an orphan", () => {
    const result = diffFigures(
      [{ name: "m51", alt: "a" }],
      ["m51.png", "stray-diagram.png"]
    );
    expect(result.orphans).toEqual(["stray-diagram.png"]);
    expect(result.missing).toEqual([]);
  });

  it("flags an entry with no master and no src as missing", () => {
    const result = diffFigures([{ name: "ghost", alt: "a" }], ["m51.png"]);
    expect(result.missing).toEqual([
      { name: "ghost", reason: expect.stringContaining("no master") },
    ]);
    expect(result.orphans).toEqual(["m51.png"]);
  });

  it("treats a legacy/inline `src` entry as neither missing nor orphan", () => {
    const result = diffFigures(
      [{ name: "external-logo", alt: "a", src: "/logos/x.svg" }],
      []
    );
    expect(result).toEqual({ orphans: [], missing: [] });
  });

  it("surfaces an explicit-but-absent `file` as a missing finding", () => {
    const result = diffFigures(
      [{ name: "m51", alt: "a", file: "gone.png" }],
      ["m51.png"]
    );
    expect(result.missing).toEqual([
      { name: "m51", reason: expect.stringContaining('file "gone.png"') },
    ]);
    // The convention-named m51.png is unclaimed (the entry pointed
    // elsewhere), so it is an orphan.
    expect(result.orphans).toEqual(["m51.png"]);
  });

  it("partitions a mixed registry correctly", () => {
    const result = diffFigures(
      [
        { name: "m51", alt: "a" }, // claims m51.png
        { name: "ghost", alt: "b" }, // missing (no file, no src)
        { name: "logo", alt: "c", src: "/logo.svg" }, // legacy, fine
      ],
      ["m51.png", "orphan.webp"]
    );
    expect(result.orphans).toEqual(["orphan.webp"]);
    expect(result.missing).toEqual([
      { name: "ghost", reason: expect.stringContaining("no master") },
    ]);
  });
});
