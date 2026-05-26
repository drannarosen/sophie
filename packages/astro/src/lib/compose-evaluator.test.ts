import type { CourseSpec } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  type ComposedItem,
  evaluateCompose,
  type ProseFragmentRef,
} from "./compose-evaluator.ts";

/**
 * Minimal spec shape — only the fields the evaluator reads. The
 * compose evaluator is pure (spec + composeEntries + prose-lookup →
 * ordered ComposedItem[]), so we cast through `unknown` to avoid
 * fabricating the full CourseSpec surface for every test.
 */
function fixtureSpec(): CourseSpec {
  return {
    identity: { title: "Test Course" },
    objectives: [{ id: "lo-1", verb: "Test", body: "Test body" }],
    grading: {
      categories: [{ id: "hw", name: "Homework", weight: 1.0 }],
      letter_scale: [{ grade: "A", min: 93 }],
    },
    office_hours: [
      {
        day: "Tuesday",
        start_time: "14:00",
        end_time: "15:30",
        location: "P-149",
        modality: "in-person",
        by_appointment: false,
      },
    ],
    contact: {
      email: "test@example.edu",
      response_window_hours: 24,
    },
    accessibility: {
      drc_link: "https://example.edu/drc",
      contact_email: "drc@example.edu",
      request_deadline_weeks: 2,
    },
  } as unknown as CourseSpec;
}

function fixtureProseLookup(): Record<string, ProseFragmentRef> {
  return {
    "prose/policies": {
      slug: "policies",
      frontmatter: { title: "Course policies" },
    },
    "prose/instructor-bio": {
      slug: "instructor-bio",
      frontmatter: { title: "Instructor — Anna Rosen" },
    },
  };
}

describe("evaluateCompose", () => {
  test("returns empty array when compose is undefined", () => {
    const result = evaluateCompose({
      compose: undefined,
      spec: fixtureSpec(),
      proseLookup: fixtureProseLookup(),
    });
    expect(result).toEqual([]);
  });

  test("resolves a known data ref ('objectives') to a data item carrying the spec value", () => {
    const result = evaluateCompose({
      compose: ["objectives"],
      spec: fixtureSpec(),
      proseLookup: fixtureProseLookup(),
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("data");
    if (result[0]?.kind === "data") {
      expect(result[0].key).toBe("objectives");
      expect(result[0].value).toEqual([
        { id: "lo-1", verb: "Test", body: "Test body" },
      ]);
    }
  });

  test("resolves a prose ref ('prose/policies') to a prose item carrying the fragment ref", () => {
    const result = evaluateCompose({
      compose: ["prose/policies"],
      spec: fixtureSpec(),
      proseLookup: fixtureProseLookup(),
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("prose");
    if (result[0]?.kind === "prose") {
      expect(result[0].slug).toBe("policies");
      expect(result[0].frontmatter.title).toBe("Course policies");
    }
  });

  test("preserves compose-entry order (data + prose interleaved)", () => {
    const result = evaluateCompose({
      compose: [
        "objectives",
        "prose/policies",
        "grading",
        "prose/instructor-bio",
      ],
      spec: fixtureSpec(),
      proseLookup: fixtureProseLookup(),
    });
    expect(result.map(itemKey)).toEqual([
      "data:objectives",
      "prose:policies",
      "data:grading",
      "prose:instructor-bio",
    ]);
  });

  test("throws curated error when a data ref is declared but the spec field is absent", () => {
    const spec = { identity: { title: "X" } } as unknown as CourseSpec;
    expect(() =>
      evaluateCompose({
        compose: ["objectives"],
        spec,
        proseLookup: fixtureProseLookup(),
      })
    ).toThrow(/objectives/i);
  });

  test("throws curated error when a prose ref is declared but the lookup is missing it", () => {
    expect(() =>
      evaluateCompose({
        compose: ["prose/nonexistent"],
        spec: fixtureSpec(),
        proseLookup: fixtureProseLookup(),
      })
    ).toThrow(/nonexistent/i);
  });

  test("includes the unresolved ref in the error message (author can find the typo)", () => {
    try {
      evaluateCompose({
        compose: ["prose/typo-here"],
        spec: fixtureSpec(),
        proseLookup: fixtureProseLookup(),
      });
      throw new Error("expected evaluateCompose to throw");
    } catch (err) {
      expect(String(err)).toMatch(/typo-here/);
    }
  });

  test("supports all 7 known data keys (objectives, prereqs, grading, office_hours, accessibility, contact, schedule_overview)", () => {
    const spec = fixtureSpec();
    const composeAllData = [
      "objectives",
      "grading",
      "office_hours",
      "contact",
      "accessibility",
    ] as const;
    const result = evaluateCompose({
      compose: [...composeAllData],
      spec,
      proseLookup: fixtureProseLookup(),
    });
    expect(result.map((i) => (i.kind === "data" ? i.key : null))).toEqual([
      ...composeAllData,
    ]);
  });
});

function itemKey(item: ComposedItem): string {
  if (item.kind === "data") return `data:${item.key}`;
  return `prose:${item.slug}`;
}
