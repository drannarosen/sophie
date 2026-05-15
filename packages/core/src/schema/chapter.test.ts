import { describe, expect, it } from "vitest";
import { ChapterSchema } from "./chapter.ts";

// Baseline valid-chapter fixture. Every chapter belongs to a
// module per PR 3 (2026-05-12); the `module` field is required.
// Every chapter also declares a maturity `status` per ADR 0051.
const M = { module: "foundations", status: "stable" as const };

describe("ChapterSchema", () => {
  it("accepts the minimum-valid chapter (title + slug + module + status)", () => {
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

  // ADR 0051: `status` is a required frontmatter field. Enforcing
  // presence at the Zod layer makes the CS1 "missing status" audit
  // invariant unreachable from below — the schema rejects the chapter
  // before the audit ever runs. The tests pin both shape (enum values)
  // and the required-ness of the field.
  describe("status (ADR 0051)", () => {
    it("accepts each of draft, review, stable", () => {
      for (const status of ["draft", "review", "stable"] as const) {
        const result = ChapterSchema.safeParse({
          title: "T",
          slug: "t",
          module: "foundations",
          status,
        });
        expect(
          result.success,
          `expected status "${status}" to be accepted`
        ).toBe(true);
      }
    });

    it("rejects a chapter without a status field (CS1)", () => {
      const result = ChapterSchema.safeParse({
        title: "T",
        slug: "t",
        module: "foundations",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid status value", () => {
      for (const bad of ["published", "archived", "Stable", "", "DRAFT"]) {
        const result = ChapterSchema.safeParse({
          title: "T",
          slug: "t",
          module: "foundations",
          status: bad,
        });
        expect(result.success, `expected status "${bad}" to be rejected`).toBe(
          false
        );
      }
    });
  });
});
