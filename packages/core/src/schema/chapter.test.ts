import { describe, expect, it } from "vitest";
import { ChapterSchema } from "./chapter.ts";

// Baseline valid-chapter fixture. Every chapter belongs to a
// module per PR 3 (2026-05-12); the `module` field is required.
const M = { module: "foundations" };

describe("ChapterSchema", () => {
  it("accepts the minimum-valid chapter (title + slug + module)", () => {
    const result = ChapterSchema.safeParse({
      title: "Lecture 1: Spoiler Alerts",
      slug: "spoiler-alerts",
      ...M,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional within-module order", () => {
    expect(
      ChapterSchema.safeParse({ title: "T", slug: "t", ...M, order: 0 }).success
    ).toBe(true);
    expect(
      ChapterSchema.safeParse({ title: "T", slug: "t", ...M, order: 7 }).success
    ).toBe(true);
  });

  it("rejects a missing module field", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-kebab module slug", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      module: "UPPER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative or non-integer chapter order", () => {
    expect(
      ChapterSchema.safeParse({ title: "T", slug: "t", ...M, order: -1 })
        .success
    ).toBe(false);
    expect(
      ChapterSchema.safeParse({ title: "T", slug: "t", ...M, order: 1.5 })
        .success
    ).toBe(false);
  });

  it("accepts an optional lang tag (BCP 47)", () => {
    expect(
      ChapterSchema.safeParse({
        title: "T",
        slug: "t",
        ...M,
        lang: "en",
      }).success
    ).toBe(true);
    expect(
      ChapterSchema.safeParse({
        title: "T",
        slug: "t",
        ...M,
        lang: "pt-BR",
      }).success
    ).toBe(true);
  });

  it("rejects lang tags that aren't BCP 47", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      ...M,
      lang: "Not-A-Lang",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = ChapterSchema.safeParse({ title: "", slug: "s", ...M });
    expect(result.success).toBe(false);
  });

  it("rejects slugs that aren't kebab-case", () => {
    for (const bad of [
      "UPPER",
      "with space",
      "trailing-",
      "-leading",
      "a--b",
    ]) {
      const result = ChapterSchema.safeParse({ title: "T", slug: bad, ...M });
      expect(result.success, `expected slug "${bad}" to be rejected`).toBe(
        false
      );
    }
  });

  it("accepts an embedded figures registry mapping slug → FigureSchema", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      ...M,
      figures: {
        "three-questions": {
          name: "three-questions",
          src: "/figures/three-questions.png",
          alt: "Three big questions",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a figures entry with empty alt", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      ...M,
      figures: {
        "no-alt": {
          name: "no-alt",
          src: "/figures/x.png",
          alt: "",
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional description and tags array", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      ...M,
      description: "A trailer for the semester.",
      tags: ["course-overview", "foundations"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty strings inside the tags array", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      ...M,
      tags: ["ok", ""],
    });
    expect(result.success).toBe(false);
  });
});
