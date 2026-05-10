import { describe, expect, it } from "vitest";
import { FigureSchema } from "./figure.ts";

describe("FigureSchema", () => {
  it("accepts the minimum-valid figure (name + src + alt)", () => {
    const result = FigureSchema.safeParse({
      name: "three-questions",
      src: "/figures/three-questions.png",
      alt: "Three guiding questions of the chapter",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional caption and credit", () => {
    const result = FigureSchema.safeParse({
      name: "decoder-ring",
      src: "/figures/decoder.png",
      alt: "Decoder ring flowchart",
      caption: "From photons to physical reality",
      credit: "Course illustration (A. Rosen)",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing alt text", () => {
    const result = FigureSchema.safeParse({
      name: "no-alt",
      src: "/figures/x.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty alt text", () => {
    const result = FigureSchema.safeParse({
      name: "empty-alt",
      src: "/figures/x.png",
      alt: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty src", () => {
    const result = FigureSchema.safeParse({
      name: "empty-src",
      src: "",
      alt: "Alt text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects names that aren't kebab-case slugs", () => {
    for (const bad of ["UPPER", "with space", "trailing-", "a--b"]) {
      const result = FigureSchema.safeParse({
        name: bad,
        src: "/figures/x.png",
        alt: "Alt",
      });
      expect(result.success, `expected name "${bad}" to be rejected`).toBe(
        false
      );
    }
  });
});
