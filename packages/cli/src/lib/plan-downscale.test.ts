import { describe, expect, it } from "vitest";
import { planDownscale } from "./plan-downscale.ts";

/**
 * `sophie figures downscale` planning logic (ADR 0094). Pure aspect-ratio
 * math: given each master's intrinsic dimensions and a maximum long-edge,
 * decide which need shrinking and to what target. The command's sharp
 * call (the I/O) consumes this plan; the math is unit-tested here.
 *
 * Masters within the cap are left untouched (no needless re-encode).
 */
describe("planDownscale (ADR 0094)", () => {
  it("omits images already within the long-edge cap", () => {
    const plan = planDownscale(
      [{ file: "small.png", width: 1200, height: 800 }],
      2560
    );
    expect(plan).toEqual([]);
  });

  it("omits an image exactly at the cap (only exceeds triggers)", () => {
    const plan = planDownscale(
      [{ file: "exact.png", width: 2560, height: 1440 }],
      2560
    );
    expect(plan).toEqual([]);
  });

  it("shrinks a landscape master to cap its width (the long edge)", () => {
    const plan = planDownscale(
      [{ file: "wide.png", width: 5120, height: 2880 }],
      2560
    );
    expect(plan).toEqual([
      {
        file: "wide.png",
        width: 5120,
        height: 2880,
        targetWidth: 2560,
        targetHeight: 1440,
      },
    ]);
  });

  it("shrinks a portrait master to cap its height (the long edge)", () => {
    const plan = planDownscale(
      [{ file: "tall.png", width: 1500, height: 3000 }],
      2560
    );
    expect(plan).toEqual([
      {
        file: "tall.png",
        width: 1500,
        height: 3000,
        targetWidth: 1280,
        targetHeight: 2560,
      },
    ]);
  });

  it("rounds the scaled short edge to the nearest integer", () => {
    // long edge 11236 → scale 2560/11236; short edge 7000 → 1595.05 → 1595
    const plan = planDownscale(
      [{ file: "huge.png", width: 11236, height: 7000 }],
      2560
    );
    expect(plan[0]).toMatchObject({
      targetWidth: 2560,
      targetHeight: 1595,
    });
  });

  it("plans only the oversized masters in a mixed set", () => {
    const plan = planDownscale(
      [
        { file: "ok.jpg", width: 2000, height: 1000 },
        { file: "big.jpg", width: 8000, height: 4000 },
      ],
      2560
    );
    expect(plan.map((p) => p.file)).toEqual(["big.jpg"]);
  });
});
