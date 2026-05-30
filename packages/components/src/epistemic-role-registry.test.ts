import { EPISTEMIC_ROLES } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_EPISTEMIC_ROLES,
  ROLE_VIA_SLOT_ROLES,
} from "./epistemic-role-registry.ts";

describe("epistemic-role registry", () => {
  it("maps each single-role component to its declared role", () => {
    // Pins the values consumed by the audit. If a component's
    // *_EPISTEMIC_ROLE const changes, this is the cross-check that
    // surfaces it (the registry re-exports the const, so a drift can
    // only mean the const itself moved).
    expect(COMPONENT_EPISTEMIC_ROLES).toMatchObject({
      Assumption: "assumption",
      BreaksWhen: "approximation",
      CommonMisuse: "misconception",
      DerivationStep: "model",
      Observable: "observable",
      WorkedExample: "numerical",
    });
  });

  it("declares the slot-role sets for the role-via-slot roots", () => {
    expect(ROLE_VIA_SLOT_ROLES.OMIFlow).toEqual([
      "observable",
      "model",
      "inference",
    ]);
    expect(ROLE_VIA_SLOT_ROLES.KeyEquation).toEqual([
      "observable",
      "assumption",
      "approximation",
      "misconception",
    ]);
  });

  it("only uses roles from the canonical eight-role taxonomy", () => {
    const allRoles = [
      ...Object.values(COMPONENT_EPISTEMIC_ROLES),
      ...Object.values(ROLE_VIA_SLOT_ROLES).flat(),
    ];
    for (const role of allRoles) {
      expect(EPISTEMIC_ROLES).toContain(role);
    }
  });
});
