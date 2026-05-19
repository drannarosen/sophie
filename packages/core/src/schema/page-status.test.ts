import { describe, expect, it } from "vitest";
import { type PageStatus, PageStatusSchema } from "./page-status.ts";

describe("PageStatusSchema", () => {
  it("accepts each of the 4 ADR-0062 values", () => {
    const values: PageStatus[] = [
      "shipped",
      "accepted-design",
      "mixed",
      "future-package-split",
    ];
    for (const v of values) {
      expect(PageStatusSchema.parse(v)).toBe(v);
    }
  });

  it("rejects an unknown value (typo)", () => {
    const result = PageStatusSchema.safeParse("shippeed");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = PageStatusSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects null and undefined (the field is required when present)", () => {
    expect(PageStatusSchema.safeParse(null).success).toBe(false);
    expect(PageStatusSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(PageStatusSchema.safeParse(1).success).toBe(false);
    expect(PageStatusSchema.safeParse(true).success).toBe(false);
    expect(PageStatusSchema.safeParse({}).success).toBe(false);
  });

  it("is case-sensitive (rejects 'Shipped', 'SHIPPED')", () => {
    expect(PageStatusSchema.safeParse("Shipped").success).toBe(false);
    expect(PageStatusSchema.safeParse("SHIPPED").success).toBe(false);
  });

  it("surfaces a Zod issue with code 'invalid_value' on a bad value", () => {
    const result = PageStatusSchema.safeParse("not-a-status");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.code).toBe("invalid_value");
    }
  });
});
