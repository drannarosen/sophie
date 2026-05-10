import { describe, expect, it } from "vitest";
import { ChapterSchema } from "./chapter.ts";

describe("ChapterSchema", () => {
  it("accepts the minimum-valid chapter (title + slug)", () => {
    const result = ChapterSchema.safeParse({
      title: "Lecture 1: Spoiler Alerts",
      slug: "spoiler-alerts",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional lang tag (BCP 47)", () => {
    expect(
      ChapterSchema.safeParse({
        title: "T",
        slug: "t",
        lang: "en",
      }).success
    ).toBe(true);
    expect(
      ChapterSchema.safeParse({
        title: "T",
        slug: "t",
        lang: "pt-BR",
      }).success
    ).toBe(true);
  });

  it("rejects lang tags that aren't BCP 47", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      lang: "Not-A-Lang",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = ChapterSchema.safeParse({ title: "", slug: "s" });
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
      const result = ChapterSchema.safeParse({ title: "T", slug: bad });
      expect(result.success, `expected slug "${bad}" to be rejected`).toBe(
        false
      );
    }
  });

  it("accepts an embedded figures registry mapping slug → FigureSchema", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
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
      description: "A trailer for the semester.",
      tags: ["course-overview", "foundations"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty strings inside the tags array", () => {
    const result = ChapterSchema.safeParse({
      title: "T",
      slug: "t",
      tags: ["ok", ""],
    });
    expect(result.success).toBe(false);
  });
});
