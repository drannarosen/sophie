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

const DUE_SOON_ITEMS = [
  {
    id: "hw1",
    title: "Homework 1",
    kind: "homework",
    kindLabel: "Homework",
    due: "2027-02-20",
    tbd: false,
    problemCount: 4,
  },
  {
    id: "gm2",
    title: "Growth Memo 2",
    kind: "growth-memo",
    kindLabel: "Growth Memo",
    due: "tbd",
    tbd: true,
    problemCount: 3,
  },
];
const START_READING = {
  label: "Stellar Foundations",
  href: "/units/u1/reading",
};

// A rolling-7-day window mixing class events (schedule kinds) with a
// `kind:"due"` deadline pulled from the assignments registry. Six items
// total to exercise the no-cap stacking (the window is naturally short,
// but the card must render a longer list cleanly — ADR 0098 / ADR 0097 #4).
const THIS_WEEK_ITEMS = [
  { date: "2027-02-15", label: "Stellar Spectra", kind: "lecture" },
  { date: "2027-02-16", label: "Spectroscopy Lab", kind: "activity" },
  { date: "2027-02-17", label: "Problem Set 3", kind: "due" },
  { date: "2027-02-18", label: "Stellar Classification", kind: "lecture" },
  { date: "2027-02-19", label: "Midterm 1", kind: "exam" },
  { date: "2027-02-20", label: "Reading Reflection", kind: "due" },
];

describe("OrientationCards — axe + graceful degradation", () => {
  test("fail-closed: no dueSoon + no thisWeek + no announcement → only Start-Reading, no empty card, axe-clean", async () => {
    const html = await renderAstroToBody(OrientationCards, {
      props: { dueSoon: [], thisWeek: [], startReading: START_READING },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    // Exactly one card (Start Reading); Due-Soon + This-Week dropped.
    expect(html.match(/sophie-home-card"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("Due Soon");
    expect(html).not.toContain("This Week");
    expect(html).toContain('data-card-count="1"');
    expect(html).toContain("Stellar Foundations");
    expect(await axe(document.body)).toHaveNoViolations();
  });

  test("thisWeek populated → This-Week card renders labels + dates + kind markers, +1 card, axe-clean", async () => {
    const html = await renderAstroToBody(OrientationCards, {
      props: {
        dueSoon: [],
        thisWeek: THIS_WEEK_ITEMS,
        startReading: START_READING,
      },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    // Two cards: This Week + Start Reading (Due-Soon dropped).
    expect(html.match(/sophie-home-card"/g) ?? []).toHaveLength(2);
    expect(html).toContain('data-card-count="2"');
    expect(html).toContain("This Week");
    // Every item's label + date renders (no cap on the rolling window).
    for (const item of THIS_WEEK_ITEMS) {
      expect(html).toContain(item.label);
      expect(html).toContain(item.date);
    }
    // Kind markers are TEXT (not color-only): humanized schedule kinds and
    // the literal "Due" for deadlines.
    expect(html).toContain("Lecture");
    expect(html).toContain("Activity");
    expect(html).toContain("Exam");
    expect(html).toContain("Due");
    expect(await axe(document.body)).toHaveNoViolations();
  });

  test("absent startReading → Start-Reading card still renders a static prompt, axe-clean", async () => {
    const html = await renderAstroToBody(OrientationCards, {
      props: { dueSoon: [] },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    expect(html).toContain("Readings open as the course begins.");
    expect(html).toContain('data-card-count="1"');
    expect(await axe(document.body)).toHaveNoViolations();
  });

  test("two cards (dueSoon + start-reading) — intentional 2-up layout, axe-clean", async () => {
    const html = await renderAstroToBody(OrientationCards, {
      props: { dueSoon: DUE_SOON_ITEMS, startReading: START_READING },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    expect(html.match(/sophie-home-card"/g) ?? []).toHaveLength(2);
    expect(html).toContain('data-card-count="2"');
    expect(html).toContain("Due Soon");
    expect(html).toContain("Homework 1");
    expect(html).toContain("2027-02-20");
    // Problem count surfaced (prototype's "N problems" sub-line).
    expect(html).toContain("4 problems");
    // Kind label rendered as a text badge (ADR 0096 Am1 / ADR 0080 Am3).
    expect(html).toContain("sophie-home-due__kind");
    expect(html).toContain("Growth Memo");
    // tbd row is dimmed.
    expect(html).toContain("is-tbd");
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

  test("absent scheduleRows → lecture-count-only render, no week label / Now tag / row state, axe-clean", async () => {
    const html = await renderAstroToBody(ModuleList, {
      props: { sections: SECTIONS, units: UNITS },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    // Graceful degradation (ADR 0097 #7): today's behavior is unchanged.
    expect(html).toMatch(/1\s+lecture/);
    expect(html).not.toContain("sophie-home-mod__now");
    expect(html).not.toContain("sophie-home-mod__weeks");
    expect(html).not.toContain("is-now");
    expect(html).not.toContain("is-past");
    expect(await axe(document.body)).toHaveNoViolations();
  });

  test("with scheduleRows → week range + Now tag + is-now/is-past row state, axe-clean", async () => {
    const html = await renderAstroToBody(ModuleList, {
      props: {
        sections: SECTIONS,
        units: UNITS,
        scheduleRows: [
          {
            slug: "foundations",
            weekStart: 1,
            weekEnd: 3,
            isNow: true,
            isPast: false,
          },
          {
            slug: "hr-diagram",
            weekStart: 4,
            weekEnd: 4,
            isNow: false,
            isPast: true,
          },
        ],
      },
      wrap: (inner) => `<main>${inner}</main>`,
    });
    // Multi-week section → "Weeks N–M" (en-dash U+2013); single-week → "Week N".
    expect(html).toContain("Weeks 1–3");
    expect(html).toContain("Week 4");
    // "Now" tag is text (not color-only) for screen readers.
    expect(html).toContain("sophie-home-mod__now");
    expect(html).toContain("Now");
    // Row state classes drive the dim/highlight styling.
    expect(html).toContain("is-now");
    expect(html).toContain("is-past");
    // Lecture count still present alongside the schedule status.
    expect(html).toMatch(/1\s+lecture/);
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
