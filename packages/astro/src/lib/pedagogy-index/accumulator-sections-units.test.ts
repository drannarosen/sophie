import type {
  ArtifactEntry,
  SectionEntry,
  UnitEntry,
} from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

// W2/D3 — `setChapters` / `setModules` describe block deleted alongside
// ChapterEntrySchema + ModuleEntrySchema. The W1 `setSections` /
// `setUnits` + W2 `setArtifacts` blocks below replace it.

describe("indexAccumulator setSections / setUnits (W1)", () => {
  // Per Wedge B-followup design doc D1 + D7. Mirror setChapters /
  // setModules semantics: last-write-wins, consumer-global, NOT touched
  // by clearUnit.

  test("setSections overwrites prior entries (last-write-wins)", () => {
    const intro: SectionEntry = {
      type: "module",
      slug: "intro",
      title: "Introduction",
      order: 0,
    };
    const stars: SectionEntry = {
      type: "module",
      slug: "stars",
      title: "Stars",
      order: 1,
    };
    const bridge: SectionEntry = {
      type: "bridge",
      slug: "math",
      title: "Math Prereqs",
      order: 0,
    };

    indexAccumulator.setSections([intro, stars]);
    expect(indexAccumulator.asPedagogyIndex().sections).toEqual([intro, stars]);

    indexAccumulator.setSections([bridge]);
    expect(indexAccumulator.asPedagogyIndex().sections).toEqual([bridge]);
  });

  test("setUnits overwrites prior entries (last-write-wins)", () => {
    const u1: UnitEntry = {
      id: "u1-chapter",
      type: "lecture",
      title: "U1",
      order: 0,
      prereqs: [],
      section_id: "intro",
      chapter: "u1-chapter",
      status: "stable",
    };
    const u2: UnitEntry = {
      id: "u2-chapter",
      type: "lecture",
      title: "U2",
      order: 1,
      prereqs: ["logarithms"],
      section_id: "stars",
      chapter: "u2-chapter",
      lecture: "u2-slides",
      status: "stable",
    };

    indexAccumulator.setUnits([u1]);
    expect(indexAccumulator.asPedagogyIndex().units).toEqual([u1]);

    indexAccumulator.setUnits([u1, u2]);
    expect(indexAccumulator.asPedagogyIndex().units).toEqual([u1, u2]);
  });

  test("clearUnit does NOT touch sections / units (consumer-global)", () => {
    const intro: SectionEntry = {
      type: "module",
      slug: "intro",
      title: "Introduction",
      order: 0,
    };
    const u1: UnitEntry = {
      id: "ch-x",
      type: "lecture",
      title: "U1",
      order: 0,
      prereqs: [],
      section_id: "intro",
      chapter: "ch-x",
      status: "stable",
    };

    indexAccumulator.setSections([intro]);
    indexAccumulator.setUnits([u1]);
    indexAccumulator.clearUnit("ch-x");

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.sections).toEqual([intro]);
    expect(index.units).toEqual([u1]);
  });

  test("resetIndexAccumulator clears sections + units", () => {
    indexAccumulator.setSections([
      { type: "module", slug: "intro", title: "Intro", order: 0 },
    ]);
    indexAccumulator.setUnits([
      {
        id: "u1",
        type: "lecture",
        title: "U1",
        order: 0,
        prereqs: [],
        section_id: "intro",
        chapter: "u1",
        status: "stable",
      },
    ]);
    resetIndexAccumulator();
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.sections).toEqual([]);
    expect(index.units).toEqual([]);
  });
});

describe("indexAccumulator setArtifacts (W2)", () => {
  // Per Wedge B-followup W2 design doc D1 (Path A). Mirrors setSections /
  // setUnits semantics: last-write-wins, consumer-global, NOT touched by
  // clearUnit. ArtifactEntry is a discriminated union over scope.

  const unitReading: ArtifactEntry = {
    id: "spectra-and-composition",
    type: "reading",
    scope: "unit",
    title: "Spectra & Composition — reading",
    source_path:
      "src/content/sections/stars/units/spectra-and-composition/reading.mdx",
    references: {},
    section_id: "stars",
    unit_id: "spectra-and-composition",
  };

  const sectionIntro: ArtifactEntry = {
    id: "stars-intro",
    type: "intro",
    scope: "section",
    title: "Stars — module intro",
    source_path: "src/content/sections/stars/intro.mdx",
    references: {},
    section_id: "stars",
  };

  test("setArtifacts overwrites prior entries (last-write-wins)", () => {
    indexAccumulator.setArtifacts([unitReading]);
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([unitReading]);

    indexAccumulator.setArtifacts([unitReading, sectionIntro]);
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([
      unitReading,
      sectionIntro,
    ]);

    indexAccumulator.setArtifacts([sectionIntro]);
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([
      sectionIntro,
    ]);
  });

  test("clearUnit does NOT touch artifacts (consumer-global)", () => {
    indexAccumulator.setArtifacts([unitReading]);
    indexAccumulator.clearUnit("spectra-and-composition");
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([unitReading]);
  });

  test("resetIndexAccumulator clears artifacts", () => {
    indexAccumulator.setArtifacts([unitReading, sectionIntro]);
    resetIndexAccumulator();
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([]);
  });

  test("asPedagogyIndex returns [] when setArtifacts never called", () => {
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([]);
  });
});
