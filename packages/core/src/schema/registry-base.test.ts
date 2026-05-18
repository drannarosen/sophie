import { describe, expect, it } from "vitest";
import { RegistryBaseSchema } from "./registry-base.ts";

describe("RegistryBaseSchema", () => {
  const minValid = {
    id: "wiens-law",
    title: "Wien's Law",
  };

  it("accepts the minimum-valid entry (id + title)", () => {
    expect(RegistryBaseSchema.safeParse(minValid).success).toBe(true);
  });

  it("accepts optional tags array", () => {
    expect(
      RegistryBaseSchema.safeParse({
        ...minValid,
        tags: ["thermal", "spectroscopy"],
      }).success
    ).toBe(true);
  });

  it("accepts optional version", () => {
    expect(
      RegistryBaseSchema.safeParse({ ...minValid, version: "1" }).success
    ).toBe(true);
  });

  it("rejects missing id", () => {
    const { id: _id, ...rest } = minValid;
    expect(RegistryBaseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing title", () => {
    const { title: _title, ...rest } = minValid;
    expect(RegistryBaseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty id", () => {
    expect(RegistryBaseSchema.safeParse({ ...minValid, id: "" }).success).toBe(
      false
    );
  });

  it("rejects empty title", () => {
    expect(
      RegistryBaseSchema.safeParse({ ...minValid, title: "" }).success
    ).toBe(false);
  });

  it("rejects non-kebab-case id", () => {
    expect(
      RegistryBaseSchema.safeParse({ ...minValid, id: "Wien's Law" }).success
    ).toBe(false);
    expect(
      RegistryBaseSchema.safeParse({ ...minValid, id: "wiens_law" }).success
    ).toBe(false);
    expect(
      RegistryBaseSchema.safeParse({ ...minValid, id: "WIENS-LAW" }).success
    ).toBe(false);
  });

  it("rejects empty tag string", () => {
    expect(
      RegistryBaseSchema.safeParse({ ...minValid, tags: [""] }).success
    ).toBe(false);
  });

  it("rejects unknown keys (.strict())", () => {
    // Load-bearing per ADR 0060: this base is the inheritance root for
    // every future registry. Silent stripping at the base would mask typos
    // in any registry that extends without re-locking strict mode.
    expect(
      RegistryBaseSchema.safeParse({
        ...minValid,
        // typo: "tag" instead of "tags"
        tag: ["thermal"],
      }).success
    ).toBe(false);
  });
});
