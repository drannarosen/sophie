import { describe, expect, it } from "vitest";
import {
  getStudentChapters,
  isStudentVisible,
} from "./get-student-chapters.ts";

/**
 * Tests for the ADR 0051 student-build filter. The two functions are
 * pure; we exercise the filter against the three status values plus
 * the multi-status mixed shape that consumer apps actually see.
 */

const draftChapter = {
  id: "in-progress",
  data: {
    slug: "in-progress",
    title: "In Progress",
    module: "foundations",
    status: "draft" as const,
  },
};
const reviewChapter = {
  id: "under-review",
  data: {
    slug: "under-review",
    title: "Under Review",
    module: "foundations",
    status: "review" as const,
  },
};
const stableChapter = {
  id: "ready",
  data: {
    slug: "ready",
    title: "Ready",
    module: "foundations",
    status: "stable" as const,
  },
};

describe("isStudentVisible (ADR 0051)", () => {
  it("returns false for draft chapters", () => {
    expect(isStudentVisible(draftChapter)).toBe(false);
  });

  it("returns true for review chapters (renders with under-review badge)", () => {
    expect(isStudentVisible(reviewChapter)).toBe(true);
  });

  it("returns true for stable chapters", () => {
    expect(isStudentVisible(stableChapter)).toBe(true);
  });
});

describe("getStudentChapters (ADR 0051)", () => {
  it("returns an empty array for an empty input", () => {
    expect(getStudentChapters([])).toEqual([]);
  });

  it("returns the input unchanged when every chapter is stable", () => {
    const input = [stableChapter, stableChapter];
    expect(getStudentChapters(input)).toEqual(input);
  });

  it("filters out drafts while preserving review + stable", () => {
    const input = [draftChapter, reviewChapter, stableChapter];
    expect(getStudentChapters(input)).toEqual([reviewChapter, stableChapter]);
  });

  it("does not mutate the input array", () => {
    const input = [draftChapter, stableChapter];
    const snapshot = [...input];
    getStudentChapters(input);
    expect(input).toEqual(snapshot);
  });

  it("preserves the input order of student-visible chapters", () => {
    const input = [stableChapter, draftChapter, reviewChapter];
    expect(getStudentChapters(input)).toEqual([stableChapter, reviewChapter]);
  });
});
