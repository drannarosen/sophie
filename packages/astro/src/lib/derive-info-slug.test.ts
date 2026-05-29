import { describe, expect, it } from "vitest";
import { deriveInfoSlug } from "./derive-info-slug.ts";

describe("deriveInfoSlug", () => {
  it("returns the last segment under a non-root base", () => {
    expect(deriveInfoSlug("/astr201/accommodations/")).toBe("accommodations");
  });

  it("returns the segment under root base", () => {
    expect(deriveInfoSlug("/accommodations/")).toBe("accommodations");
  });

  it("returns the last segment under a non-root base (syllabus)", () => {
    expect(deriveInfoSlug("/astr201/syllabus/")).toBe("syllabus");
  });

  it("handles a path without a trailing slash", () => {
    expect(deriveInfoSlug("/syllabus")).toBe("syllabus");
  });
});
