import type { AssignmentRegistry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { assertAssignmentKindsDeclared } from "./assert-assignment-kinds.ts";

/**
 * Unit coverage for the ADR 0080 Amendment 3 cross-file membership check
 * that runs in `defineSophieIntegration` (`astro:config:setup`, where both
 * `course.sophie.yaml` and `assignments.sophie.yaml` are visible). The
 * helper itself is framework-pure — two typed inputs, no fs / Astro — so
 * the cross-refine logic is exercised here without the integration harness.
 */

function registry(
  ...kinds: Array<{ id: string; kind: string }>
): AssignmentRegistry {
  return {
    assignments: kinds.map(({ id, kind }) => ({
      id,
      title: `Title ${id}`,
      kind,
      assignedDate: "tbd" as const,
      dueDate: "tbd" as const,
    })),
  };
}

describe("assertAssignmentKindsDeclared", () => {
  test("no-op when declared map is undefined (absent assignment_kinds)", () => {
    expect(() =>
      assertAssignmentKindsDeclared(
        registry({ id: "hw1", kind: "anything-goes" }),
        undefined
      )
    ).not.toThrow();
  });

  test("no-op when the assignments registry is null", () => {
    expect(() =>
      assertAssignmentKindsDeclared(null, { homework: "Homework" })
    ).not.toThrow();
  });

  test("passes when every assignment kind is a declared key", () => {
    expect(() =>
      assertAssignmentKindsDeclared(
        registry(
          { id: "hw1", kind: "homework" },
          { id: "proj1", kind: "project" }
        ),
        { homework: "Homework", project: "Project" }
      )
    ).not.toThrow();
  });

  test("throws naming the offending kind + assignment id when a kind is undeclared", () => {
    let thrown: Error | undefined;
    try {
      assertAssignmentKindsDeclared(
        registry(
          { id: "hw1", kind: "homework" },
          { id: "memo1", kind: "growth-memo" }
        ),
        { homework: "Homework", project: "Project" }
      );
    } catch (err) {
      thrown = err as Error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).toContain("growth-memo");
    expect(thrown?.message).toContain("memo1");
    // Lists the declared kinds so the author can spot the typo.
    expect(thrown?.message).toContain("homework");
    expect(thrown?.message).toContain("project");
  });

  test("collects ALL undeclared kinds into one message (not just the first)", () => {
    let thrown: Error | undefined;
    try {
      assertAssignmentKindsDeclared(
        registry(
          { id: "memo1", kind: "growth-memo" },
          { id: "lab1", kind: "lab" }
        ),
        { homework: "Homework" }
      );
    } catch (err) {
      thrown = err as Error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).toContain("growth-memo");
    expect(thrown?.message).toContain("memo1");
    expect(thrown?.message).toContain("lab");
    expect(thrown?.message).toContain("lab1");
  });
});
