import { describe, expect, it } from "vitest";
import { humanLabelFromTarget } from "./humanLabel.ts";

describe("humanLabelFromTarget", () => {
  it("maps each known prefix to its expanded name", () => {
    expect(humanLabelFromTarget("eq:stefan-boltzmann")).toBe(
      "equation: stefan-boltzmann"
    );
    expect(humanLabelFromTarget("gl:luminosity")).toBe("glossary: luminosity");
    expect(humanLabelFromTarget("misc:earth-center")).toBe(
      "misconception: earth-center"
    );
    expect(humanLabelFromTarget("lo:explain-spectra")).toBe(
      "learning objective: explain-spectra"
    );
    expect(humanLabelFromTarget("ki:luminosity-scales-r2")).toBe(
      "key insight: luminosity-scales-r2"
    );
    expect(humanLabelFromTarget("topic:logarithms")).toBe("topic: logarithms");
  });

  it("returns the raw target unchanged when the prefix is unknown", () => {
    expect(humanLabelFromTarget("mystery:something")).toBe("mystery:something");
  });

  it("returns the raw target unchanged when there is no colon", () => {
    expect(humanLabelFromTarget("stefan-boltzmann")).toBe("stefan-boltzmann");
  });

  it("returns the raw target unchanged when the slug is empty", () => {
    expect(humanLabelFromTarget("eq:")).toBe("eq:");
  });
});
