import { describe, expect, it } from "vitest";
import {
  EPISTEMIC_ROLES,
  type EpistemicRole,
  EpistemicRoleSchema,
} from "./epistemic-role.ts";

describe("EpistemicRoleSchema", () => {
  it("accepts each of the 8 canonical roles per ADR 0058 §Decision", () => {
    const canonical: EpistemicRole[] = [
      "observable",
      "model",
      "inference",
      "assumption",
      "approximation",
      "uncertainty",
      "numerical",
      "misconception",
    ];
    for (const role of canonical) {
      const result = EpistemicRoleSchema.safeParse(role);
      expect(result.success, `expected role "${role}" to parse`).toBe(true);
    }
  });

  it("rejects non-canonical role strings (intervention, remediation, chrome, etc.)", () => {
    // Per ADR 0044 Intervention design hardening §R5: <Intervention> deliberately
    // carries no epistemicRole. The taxonomy is closed at 8 per ADR 0058 §1.
    for (const noise of ["intervention", "remediation", "chrome", "fact", ""]) {
      const result = EpistemicRoleSchema.safeParse(noise);
      expect(result.success, `expected "${noise}" to be rejected`).toBe(false);
    }
  });

  it("rejects case-variant role strings (Observable, MODEL, etc.)", () => {
    for (const variant of ["Observable", "MODEL", "Inference", "ASSUMPTION"]) {
      const result = EpistemicRoleSchema.safeParse(variant);
      expect(result.success, `expected "${variant}" to be rejected`).toBe(
        false
      );
    }
  });

  it("exposes EPISTEMIC_ROLES tuple matching the enum values", () => {
    expect(EPISTEMIC_ROLES).toEqual([
      "observable",
      "model",
      "inference",
      "assumption",
      "approximation",
      "uncertainty",
      "numerical",
      "misconception",
    ]);
  });

  it("EPISTEMIC_ROLES tuple is readonly (closed set per ADR 0058 §1)", () => {
    // Closure matters per ADR 0058: a ninth role earns its keep only via a
    // new ADR amending 0058. The constant export is typed as a tuple so
    // consumers iterating it get the canonical set at compile time.
    const roles: readonly EpistemicRole[] = EPISTEMIC_ROLES;
    expect(roles.length).toBe(8);
  });
});
