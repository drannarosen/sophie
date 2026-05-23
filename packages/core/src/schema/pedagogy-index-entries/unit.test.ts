import { describe, expect, it } from "vitest";
import { UnitEntrySchema } from "./unit.ts";

describe("UnitEntrySchema", () => {
  it("parses a lecture-variant unit with section_id + chapter binding", () => {
    const input = {
      id: "intro-to-the-sky",
      type: "lecture",
      title: "Introducing the Sky",
      order: 0,
      prereqs: [],
      section_id: "intro",
      chapter: "introducing-the-sky",
      status: "stable",
    };
    expect(UnitEntrySchema.parse(input)).toEqual({
      ...input,
      audit_overrides: [],
    });
  });

  it("accepts the optional `lecture` slides-artifact binding (D7)", () => {
    const input = {
      id: "spectra",
      type: "lecture",
      title: "Spectra & Composition",
      order: 0,
      prereqs: ["logarithms"],
      section_id: "stars",
      chapter: "spectra-and-composition",
      lecture: "L3-spectra-slides",
      status: "stable",
    };
    const parsed = UnitEntrySchema.parse(input);
    expect(parsed.lecture).toBe("L3-spectra-slides");
  });

  it("defaults prereqs to [] when omitted", () => {
    const input = {
      id: "x",
      type: "topic",
      title: "X",
      order: 0,
      section_id: "intro",
      chapter: "x",
      status: "stable",
    };
    const parsed = UnitEntrySchema.parse(input);
    expect(parsed.prereqs).toEqual([]);
  });

  it("accepts non-empty prereqs", () => {
    const input = {
      id: "u1",
      type: "lecture",
      title: "U1",
      order: 0,
      prereqs: ["logarithms", "exponents"],
      section_id: "stars",
      chapter: "u1",
      status: "stable",
    };
    const parsed = UnitEntrySchema.parse(input);
    expect(parsed.prereqs).toEqual(["logarithms", "exponents"]);
  });

  it("rejects when section_id is missing", () => {
    expect(() =>
      UnitEntrySchema.parse({
        id: "x",
        type: "lecture",
        title: "X",
        order: 0,
        chapter: "x",
        status: "stable",
      })
    ).toThrow();
  });

  it("rejects when chapter is missing", () => {
    expect(() =>
      UnitEntrySchema.parse({
        id: "x",
        type: "lecture",
        title: "X",
        order: 0,
        section_id: "intro",
        status: "stable",
      })
    ).toThrow();
  });

  it("rejects an empty section_id", () => {
    expect(() =>
      UnitEntrySchema.parse({
        id: "x",
        type: "lecture",
        title: "X",
        order: 0,
        section_id: "",
        chapter: "x",
        status: "stable",
      })
    ).toThrow();
  });

  it("accepts skill-type Unit with topic_id (bridge context)", () => {
    const input = {
      id: "math-logs",
      type: "skill",
      title: "Logarithms",
      order: 0,
      prereqs: [],
      section_id: "math-prereqs",
      chapter: "logs-bridge",
      topic_id: "logarithms",
      status: "stable",
    };
    const parsed = UnitEntrySchema.parse(input);
    expect(parsed.topic_id).toBe("logarithms");
  });

  it("rejects when status is missing (W2/D2: status required via UnitSchema)", () => {
    expect(() =>
      UnitEntrySchema.parse({
        id: "x",
        type: "lecture",
        title: "X",
        order: 0,
        section_id: "intro",
        chapter: "x",
      })
    ).toThrow();
  });

  it("accepts optional framing: OMI inherited from UnitSchema (W2/D2)", () => {
    const parsed = UnitEntrySchema.parse({
      id: "spectra",
      type: "lecture",
      title: "Spectra & Composition",
      order: 0,
      prereqs: ["logarithms"],
      section_id: "stars",
      chapter: "spectra-and-composition",
      status: "stable",
      framing: "OMI",
    });
    expect(parsed.framing).toBe("OMI");
  });

  it("accepts optional description inherited from UnitSchema (W2/D2)", () => {
    const parsed = UnitEntrySchema.parse({
      id: "u1",
      type: "lecture",
      title: "U1",
      order: 0,
      section_id: "stars",
      chapter: "u1",
      status: "stable",
      description: "Brief Unit summary.",
    });
    expect(parsed.description).toBe("Brief Unit summary.");
  });
});
