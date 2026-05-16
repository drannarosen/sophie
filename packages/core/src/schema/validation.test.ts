import { describe, expect, it } from "vitest";
import {
  ValidationEvidenceSchema,
  ValidationKindSchema,
  ValidationSchema,
  ValidationStatusSchema,
} from "./validation";

describe("ValidationStatusSchema", () => {
  it.each([
    "unvalidated",
    "in-progress",
    "validated",
    "re-validation-needed",
  ])("accepts %s", (status) => {
    expect(() => ValidationStatusSchema.parse(status)).not.toThrow();
  });

  it("rejects unknown status", () => {
    expect(() => ValidationStatusSchema.parse("partial")).toThrow();
  });
});

describe("ValidationKindSchema", () => {
  it.each([
    "test",
    "chapter",
    "review",
    "deployment",
    "audit",
    "manual",
  ])("accepts %s", (kind) => {
    expect(() => ValidationKindSchema.parse(kind)).not.toThrow();
  });

  it("rejects unknown kind", () => {
    expect(() => ValidationKindSchema.parse("unit-test")).toThrow();
  });
});

describe("ValidationEvidenceSchema", () => {
  it("accepts a complete record", () => {
    const record = {
      kind: "test",
      ref: "packages/components/src/Predict.test.tsx",
      date: "2026-05-12",
      notes: "14 unit tests + axe-core pass",
    };
    expect(() => ValidationEvidenceSchema.parse(record)).not.toThrow();
  });

  it("accepts a deferred record (null ref + null date)", () => {
    const record = {
      kind: "deployment",
      ref: null,
      date: null,
      notes: "ASTR 201 fa26 cohort pending",
    };
    expect(() => ValidationEvidenceSchema.parse(record)).not.toThrow();
  });

  it("makes notes optional", () => {
    const record = { kind: "test", ref: "x.ts", date: "2026-05-12" };
    expect(() => ValidationEvidenceSchema.parse(record)).not.toThrow();
  });
});

describe("ValidationSchema", () => {
  it("accepts a complete validated block", () => {
    const block = {
      status: "validated",
      last_validated_date: "2026-05-14",
      evidence: [
        {
          kind: "test",
          ref: "packages/components/src/Predict.test.tsx",
          date: "2026-05-12",
        },
      ],
      notes: "Persistence + cross-tab sync covered.",
    };
    expect(() => ValidationSchema.parse(block)).not.toThrow();
  });

  it("accepts a default unvalidated block", () => {
    const block = {
      status: "unvalidated",
      last_validated_date: null,
      evidence: [],
    };
    expect(() => ValidationSchema.parse(block)).not.toThrow();
  });

  it("defaults evidence to empty array when omitted", () => {
    const parsed = ValidationSchema.parse({
      status: "unvalidated",
      last_validated_date: null,
    });
    expect(parsed.evidence).toEqual([]);
  });
});

describe("ValidationSchema cross-field refinement", () => {
  it("rejects validated status without last_validated_date", () => {
    const block = {
      status: "validated",
      last_validated_date: null,
      evidence: [],
    };
    expect(() => ValidationSchema.parse(block)).toThrow(
      /last_validated_date is required/i
    );
  });

  it("rejects re-validation-needed without last_validated_date", () => {
    const block = {
      status: "re-validation-needed",
      last_validated_date: null,
      evidence: [],
    };
    expect(() => ValidationSchema.parse(block)).toThrow(
      /last_validated_date is required/i
    );
  });

  it("accepts unvalidated without last_validated_date", () => {
    expect(() =>
      ValidationSchema.parse({
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      })
    ).not.toThrow();
  });
});

describe("ValidationSchema date coercion (gray-matter Date workaround)", () => {
  // gray-matter (via js-yaml) auto-parses bare `YYYY-MM-DD` strings in
  // frontmatter into Date objects. Without preprocessing, every author
  // who writes `last_validated_date: 2026-05-16` (unquoted) hits a
  // silent V0 error because `z.string()` rejects Date. The schema
  // coerces Date → ISO date-string (YYYY-MM-DD) so both shapes work.
  it("coerces a Date in last_validated_date to its ISO date string", () => {
    const parsed = ValidationSchema.parse({
      status: "validated",
      last_validated_date: new Date("2026-05-14"),
      evidence: [],
    });
    expect(parsed.last_validated_date).toBe("2026-05-14");
  });

  it("coerces a Date in evidence[].date to its ISO date string", () => {
    const parsed = ValidationSchema.parse({
      status: "validated",
      last_validated_date: "2026-05-14",
      evidence: [
        {
          kind: "test",
          ref: "x.test.ts",
          date: new Date("2026-05-12"),
        },
      ],
    });
    expect(parsed.evidence[0]?.date).toBe("2026-05-12");
  });

  it("still rejects non-Date non-string values for last_validated_date", () => {
    expect(() =>
      ValidationSchema.parse({
        status: "validated",
        last_validated_date: 12345,
        evidence: [],
      })
    ).toThrow();
  });

  it("preserves quoted-string dates unchanged (no coercion side-effect)", () => {
    const parsed = ValidationSchema.parse({
      status: "validated",
      last_validated_date: "2026-05-14",
      evidence: [],
    });
    expect(parsed.last_validated_date).toBe("2026-05-14");
  });
});
