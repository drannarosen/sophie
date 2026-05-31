// @vitest-environment node
/**
 * axe-core a11y tests for the course-home sub-pieces (ADR 0004 axe
 * mandate). Each piece is a FRAGMENT (no `<html>`/`<head>`), so the
 * shared `renderAstroToBody` helper — which hoists into `document.body`
 * and runs axe there — is the right harness (the full-document shell has
 * its own JSDOM-document test in `CourseHomeShell.axe.test.ts`).
 *
 * Fragments are wrapped in a page `<main>` for the composed-landmark
 * check where the piece is itself a region; CourseHero is a `<header>`
 * (banner) and is tested standalone.
 */

import type { SectionEntry, UnitEntry } from "@sophie/core/schema";
import { afterEach, describe, expect, test } from "vitest";
import {
  renderAstroToBody,
  setupAxeDom,
} from "../../test-utils/container-axe.ts";
import CourseHero from "./CourseHero.astro";
import HomeQuickLinks from "./HomeQuickLinks.astro";
import HowBand from "./HowBand.astro";
import { howBand, whyBand } from "./home-projections.ts";
import ModuleList from "./ModuleList.astro";
import OrientationCards from "./OrientationCards.astro";
import WhyBand from "./WhyBand.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const SECTIONS: SectionEntry[] = [
  { type: "module", slug: "foundations", order: 0, title: "Foundations" },
  { type: "module", slug: "hr-diagram", order: 1, title: "HR Diagram" },
];

const UNITS: UnitEntry[] = [
  {
    id: "u1",
    type: "lecture",
    title: "U1",
    order: 0,
    prereqs: [],
    status: "stable",
    section_id: "foundations",
    chapter: "u1-reading",
  },
];

describe("CourseHero — axe", () => {
  test("renders eyebrow + title with zero violations", async () => {
    const html = await renderAstroToBody(CourseHero, {
      props: {
        instructor: "Anna Rosen",
        institution: "San Diego State University",
        term: "Spring 2027",
        title: "Astronomy for Science Majors",
        tagline: "A quantitative introduction to astrophysics.",
        code: "ASTR 201",
        moduleCount: 4,
        lectureCount: 22,
      },
    });
    expect(html).toContain("Anna Rosen · San Diego State University");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe("OrientationCards — axe", () => {
  test("static layout (slot fallbacks) — zero violations under <main>", async () => {
    await renderAstroToBody(OrientationCards, {
      props: {},
      wrap: (inner) => `<main>${inner}</main>`,
    });
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe("ModuleList — axe", () => {
  test("renders rows with zero violations under <main>", async () => {
    const html = await renderAstroToBody(ModuleList, {
      props: { sections: SECTIONS, units: UNITS },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    expect(html).toContain("Foundations");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe("HomeQuickLinks — axe", () => {
  test("projects info_pages links with zero violations", async () => {
    const html = await renderAstroToBody(HomeQuickLinks, {
      props: { infoPages: { syllabus: {}, "office-hours": {} } },
    });
    expect(html).toContain("Syllabus");
    expect(html).toContain("Office Hours");
    expect(await axe(document.body)).toHaveNoViolations();
  });

  test("absent info_pages — empty nav, zero violations", async () => {
    await renderAstroToBody(HomeQuickLinks, { props: {} });
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

const TOOLS = [
  { id: "dimensional-analysis", tagline: "Smoke detector for physics." },
  { id: "ratio-method", tagline: "Escape giant numbers." },
];
const MOVES = {
  observable: "What we measure",
  model: "What we believe",
  inference: "What we can claim",
  "assumption-audit": "Where it breaks",
};
const TRACKS = {
  enabled: true,
  tracks: [
    { id: "core", label: "Track A", target_time: "20-min" },
    { id: "deep", label: "Track B", target_time: "30-min", deeper: true },
  ],
};

describe("WhyBand — axe", () => {
  test("full projection (lead + three pillars) — zero violations under <main>", async () => {
    const data = whyBand("Think like an astronomer. More.", TOOLS);
    const html = await renderAstroToBody(WhyBand, {
      props: { lead: data.lead, pillars: data.pillars },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    expect(html).toContain("Think like an astronomer.");
    expect(html).toContain("A toolkit that travels");
    expect(html).toContain("Dimensional analysis");
    expect(await axe(document.body)).toHaveNoViolations();
  });

  test("degraded (no lead, toolkit pillar dropped) — zero violations", async () => {
    const data = whyBand(undefined, undefined);
    const html = await renderAstroToBody(WhyBand, {
      props: { lead: data.lead, pillars: data.pillars },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    expect(html).not.toContain("A toolkit that travels");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe("HowBand — axe", () => {
  test("flow + track note — zero violations under <main>, real move labels", async () => {
    const data = howBand(MOVES, TRACKS);
    const html = await renderAstroToBody(HowBand, {
      props: { flow: data.flow, note: data.note },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    // Real required_moves labels appear (not hardcoded).
    expect(html).toContain("Assumption audit");
    expect(html).toContain("Track A");
    expect(html).toContain("30-min");
    expect(await axe(document.body)).toHaveNoViolations();
  });

  test("flow without track note — zero violations", async () => {
    const data = howBand(MOVES, undefined);
    const html = await renderAstroToBody(HowBand, {
      props: { flow: data.flow, note: data.note },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    expect(html).not.toContain("so you choose how far to go");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
