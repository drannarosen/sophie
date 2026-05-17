import { describe, expect, it } from "vitest";
import { InterventionPropsSchema } from "./Intervention.schema.ts";

/**
 * Component-side schema tests for `<Intervention>`. The
 * @sophie/core-side tests cover the data-only `InterventionEntrySchema`
 * and `InterventionLibraryEntrySchema`; here we exercise the
 * React-aware props schema, including the `.superRefine` cross-field
 * constraint that "custom" requires a `name`.
 *
 * Mirrors `KeyEquation.schema.test.ts` precedent.
 */

describe("InterventionPropsSchema (component callsite)", () => {
  it("accepts the minimum-valid canonical-type form (string addresses)", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "contrasting-cases",
      addresses: "universe-with-a-center",
      children: "body prose here",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the optional `id` prop (PR-γ extractor threads anchor through for #hash navigation)", () => {
    const result = InterventionPropsSchema.safeParse({
      id: "intervention-contrasting-cases-1",
      type: "contrasting-cases",
      addresses: "this",
      children: "body prose",
    });
    expect(result.success).toBe(true);
  });

  it("accepts type=custom WITH name", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "custom",
      name: "scale-comparison",
      addresses: "stars-are-points",
      children: "body prose here",
    });
    expect(result.success).toBe(true);
  });

  it("REJECTS type=custom WITHOUT name (.superRefine cross-field constraint)", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "custom",
      addresses: "stars-are-points",
      children: "body prose here",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // The error message must name the `name` field so the surfaced
      // build failure tells the chapter author what to fix.
      const issue = result.error.issues.find((i) => i.path.includes("name"));
      expect(issue).toBeDefined();
      expect(issue?.message).toMatch(/name.*required.*custom/i);
    }
  });

  it("accepts the literal 'this' addresses value (extractor rewrites at extract time)", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "bridging-analogy",
      addresses: "this",
      limits: "Bread has an outside; the universe doesn't.",
      depth: "substantial",
      children: "body prose here",
    });
    expect(result.success).toBe(true);
  });

  it("accepts multi-target addresses (array form, v2 forward-compat per design F2)", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "refutation-text",
      addresses: ["misc-a", "misc-b"],
      children: "body prose here",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty-string `type`", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "",
      addresses: "x",
      children: "body",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty-array addresses", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "contrasting-cases",
      addresses: [],
      children: "body",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing children", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "contrasting-cases",
      addresses: "x",
    });
    expect(result.success).toBe(false);
  });

  it("accepts unknown canonical names at schema layer (audit I2 enforces taxonomy at build, PR-δ)", () => {
    // The schema is permissive on `type`; I2 invariant (PR-δ) is what
    // catches misuse. This separation lets new canonical names ship
    // via one-file edit to `intervention-index.ts` without a schema
    // bump.
    const result = InterventionPropsSchema.safeParse({
      type: "imaginary-future-intervention",
      addresses: "x",
      children: "body",
    });
    expect(result.success).toBe(true);
  });

  it("treats depth as optional (component supplies the 'light' default on the JS side)", () => {
    const result = InterventionPropsSchema.safeParse({
      type: "contrasting-cases",
      addresses: "this",
      children: "body",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // No `.default` on the schema; depth is undefined when absent.
      // The PR-γ extractor fills the default before emitting the
      // pedagogy-index entry (where depth IS required).
      expect(result.data.depth).toBeUndefined();
    }
  });
});
