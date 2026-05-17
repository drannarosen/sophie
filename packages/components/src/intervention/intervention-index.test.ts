import { InterventionLibraryEntrySchema } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import {
  getInterventionByName,
  getInterventionLibrary,
} from "./intervention-index.ts";

describe("intervention-index.ts (canonical library per ADR 0044)", () => {
  it("ships exactly 12 canonical interventions per design §D1", () => {
    expect(getInterventionLibrary().length).toBe(12);
  });

  it("ships entries spanning all 4 families", () => {
    const families = new Set(
      getInterventionLibrary().map((entry) => entry.family)
    );
    expect(families).toEqual(
      new Set(["confrontation", "bridging", "restructuring", "reinforcement"])
    );
  });

  it("ships exactly 3 entries per family (4 families × 3 = 12)", () => {
    const families = getInterventionLibrary().reduce<Record<string, number>>(
      (acc, entry) => {
        acc[entry.family] = (acc[entry.family] ?? 0) + 1;
        return acc;
      },
      {}
    );
    expect(families).toEqual({
      confrontation: 3,
      bridging: 3,
      restructuring: 3,
      reinforcement: 3,
    });
  });

  it("every entry passes InterventionLibraryEntrySchema", () => {
    for (const entry of getInterventionLibrary()) {
      const result = InterventionLibraryEntrySchema.safeParse(entry);
      if (!result.success) {
        // Surface the first failure with the entry name for actionable triage
        throw new Error(
          `Library entry "${entry.name}" failed schema validation: ${result.error.message}`
        );
      }
    }
  });

  it("every entry has a unique `name` slug (audit I2 keys on this)", () => {
    const names = getInterventionLibrary().map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every entry has a unique `move` slug (forward-compat with ADR 0041 I4 audit)", () => {
    // Pre-launch: enforce uniqueness so that when I4 ships, every
    // entry maps to a distinct teaching-move. Duplicate moves would
    // collapse multiple interventions into the same MoveLibrary entry
    // and lose the cognitive-science-family distinction.
    const moves = getInterventionLibrary().map((entry) => entry.move);
    expect(new Set(moves).size).toBe(moves.length);
  });

  it("getInterventionByName resolves a known canonical name", () => {
    const entry = getInterventionByName("contrasting-cases");
    expect(entry).toBeDefined();
    expect(entry?.family).toBe("confrontation");
    expect(entry?.citation).toBe("Bransford & Schwartz 1999");
  });

  it("getInterventionByName returns undefined for unknown names (component degrades gracefully; audit I2 catches at build)", () => {
    expect(getInterventionByName("not-a-real-intervention")).toBeUndefined();
  });

  it("ships the three named Confrontation-family literature anchors", () => {
    const confrontation = getInterventionLibrary().filter(
      (entry) => entry.family === "confrontation"
    );
    const names = confrontation.map((entry) => entry.name).sort();
    expect(names).toEqual([
      "contrasting-cases",
      "predict-then-reveal",
      "productive-cognitive-conflict",
    ]);
  });

  it("ships the three named Bridging-family literature anchors (Clement 1993 ×2 + Bruner)", () => {
    const bridging = getInterventionLibrary().filter(
      (entry) => entry.family === "bridging"
    );
    expect(bridging.map((entry) => entry.name).sort()).toEqual([
      "anchoring-intuition",
      "bridging-analogy",
      "concrete-to-abstract-scaffold",
    ]);
  });

  it("ships the three Restructuring-family literature anchors (Liem 1987, Chi 2008, Chi et al. 1989)", () => {
    const restructuring = getInterventionLibrary().filter(
      (entry) => entry.family === "restructuring"
    );
    expect(restructuring.map((entry) => entry.name).sort()).toEqual([
      "conceptual-exchange",
      "discrepant-event",
      "worked-example-contrast",
    ]);
  });

  it("ships the three Reinforcement-family literature anchors", () => {
    const reinforcement = getInterventionLibrary().filter(
      (entry) => entry.family === "reinforcement"
    );
    expect(reinforcement.map((entry) => entry.name).sort()).toEqual([
      "refutation-text",
      "self-explanation-against-misconception",
      "spaced-retrieval-with-misconception-probe",
    ]);
  });
});
