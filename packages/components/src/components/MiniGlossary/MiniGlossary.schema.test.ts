import { describe, expect, it } from "vitest";
import { MiniGlossaryPropsSchema } from "./MiniGlossary.schema.ts";

describe("MiniGlossaryPropsSchema", () => {
  const validProps = {
    id: "mini-glossary",
    title: "Mini-Glossary",
    terms: [{ term: "Photon", definition: "A packet of light." }],
  };

  it("accepts valid props without lede", () => {
    expect(MiniGlossaryPropsSchema.safeParse(validProps).success).toBe(true);
  });

  it("accepts valid props with lede", () => {
    const result = MiniGlossaryPropsSchema.safeParse({
      ...validProps,
      lede: "Recognize, don't memorize.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty terms array", () => {
    const result = MiniGlossaryPropsSchema.safeParse({
      ...validProps,
      terms: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty term string", () => {
    const result = MiniGlossaryPropsSchema.safeParse({
      ...validProps,
      terms: [{ term: "", definition: "A packet of light." }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty definition string", () => {
    const result = MiniGlossaryPropsSchema.safeParse({
      ...validProps,
      terms: [{ term: "Photon", definition: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const { id: _id, ...rest } = validProps;
    expect(MiniGlossaryPropsSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty id string", () => {
    expect(
      MiniGlossaryPropsSchema.safeParse({ ...validProps, id: "" }).success
    ).toBe(false);
  });

  it("rejects empty title string", () => {
    expect(
      MiniGlossaryPropsSchema.safeParse({ ...validProps, title: "" }).success
    ).toBe(false);
  });
});
