import type { CourseSpec } from "@sophie/core/schema";
import { afterEach, describe, expect, test } from "vitest";
import {
  __resetCourseSpecStoreForTesting,
  __setCourseSpec,
  getCourseSpec,
  useCourseSpec,
} from "./course-spec-store.ts";

const FIXTURE_SPEC = {
  identity: { id: "test-101", title: "Test", code: "TEST 101" },
  grading: { categories: [{ id: "hw", name: "HW", weight: 1.0 }] },
  office_hours: [],
} as unknown as CourseSpec;

afterEach(() => {
  __resetCourseSpecStoreForTesting();
  // Clear any DOM-injected script tags from auto-hydrate tests.
  document.getElementById("sophie-course-spec")?.remove();
});

describe("course-spec-store — __setCourseSpec + getCourseSpec", () => {
  test("getCourseSpec returns null before __setCourseSpec is called", () => {
    expect(getCourseSpec()).toBeNull();
  });

  test("getCourseSpec returns the spec after __setCourseSpec is called", () => {
    __setCourseSpec(FIXTURE_SPEC);
    expect(getCourseSpec()).toBe(FIXTURE_SPEC);
  });

  test("__setCourseSpec replaces a prior set (last writer wins)", () => {
    const first = {
      ...FIXTURE_SPEC,
      identity: { ...FIXTURE_SPEC.identity, id: "first" },
    } as unknown as CourseSpec;
    const second = {
      ...FIXTURE_SPEC,
      identity: { ...FIXTURE_SPEC.identity, id: "second" },
    } as unknown as CourseSpec;
    __setCourseSpec(first);
    __setCourseSpec(second);
    expect(getCourseSpec()).toBe(second);
  });
});

describe("course-spec-store — script-tag auto-hydration", () => {
  test("hydrates from <script id='sophie-course-spec'> when no setter has run", () => {
    const script = document.createElement("script");
    script.id = "sophie-course-spec";
    script.type = "application/json";
    script.textContent = JSON.stringify({
      identity: { id: "from-script", title: "X" },
      grading: { categories: [] },
    });
    document.body.appendChild(script);

    const spec = getCourseSpec();
    expect(spec?.identity.id).toBe("from-script");
  });

  test("does not re-hydrate if __setCourseSpec already ran (SSR-set wins)", () => {
    const script = document.createElement("script");
    script.id = "sophie-course-spec";
    script.type = "application/json";
    script.textContent = JSON.stringify({
      identity: { id: "from-script", title: "X" },
    });
    document.body.appendChild(script);

    __setCourseSpec(FIXTURE_SPEC);
    expect(getCourseSpec()).toBe(FIXTURE_SPEC); // SSR setter takes precedence
  });

  test("does not throw when the script tag contains malformed JSON", () => {
    const script = document.createElement("script");
    script.id = "sophie-course-spec";
    script.type = "application/json";
    script.textContent = "{ not valid json";
    document.body.appendChild(script);

    expect(() => getCourseSpec()).not.toThrow();
    expect(getCourseSpec()).toBeNull();
  });

  test("handles the literal 'null' payload emitted by TextbookLayout when no consumer spec exists (back-compat roundtrip)", () => {
    // TextbookLayout serializes `JSON.stringify(courseSpec)` which for
    // a null spec emits the literal string "null". The store must
    // round-trip that as a parse-success-with-null-value (NOT a parse
    // failure), and useCourseSpec must throw with the curated message.
    const script = document.createElement("script");
    script.id = "sophie-course-spec";
    script.type = "application/json";
    script.textContent = "null";
    document.body.appendChild(script);

    // getCourseSpec returns null (parse succeeded, value is null).
    expect(getCourseSpec()).toBeNull();
  });
});

describe("useCourseSpec — hook", () => {
  test("returns the spec when one is set", () => {
    __setCourseSpec(FIXTURE_SPEC);
    expect(useCourseSpec()).toBe(FIXTURE_SPEC);
  });

  test("throws a curated error when no spec is available", () => {
    expect(() => useCourseSpec()).toThrow(/course.*spec/i);
  });

  test("error message names course.sophie.yaml so authors can locate the fix", () => {
    expect(() => useCourseSpec()).toThrow(/course\.sophie\.yaml/i);
  });
});
