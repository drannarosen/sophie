// @vitest-environment node
/**
 * axe-core a11y + landmark-structure test for the course-home dashboard
 * (ADR 0097 #2; ADR 0004 axe mandate). Chrome, role-less (ADR 0058).
 *
 * <CourseHomeShell> is a FULL-DOCUMENT shell (`<!doctype html><html>…`),
 * unlike the component fragments the shared `renderAstroToBody` helper
 * targets (which hoist into `document.body`, dropping the html/head/body
 * skeleton). So this file renders the shell to a string via the Container
 * API, then parses the WHOLE document into a fresh JSDOM and runs axe
 * against its `documentElement` — the only way to assert landmark
 * structure (single `<main>`, named regions) honestly.
 *
 * The Container API renders real SSR markup but does NOT execute bundled
 * `<script>`s (HomeBackground's starfield loop is covered at smoke e2e,
 * Task 7) — exactly the no-JS condition: the page is fully formed and
 * a11y-clean before/without script.
 *
 * Fixture: the astr201 shape — "Astronomy for Science Majors", Anna
 * Rosen, four sections (Foundations 4 / Discovering the HR Diagram 5 /
 * Stellar Structure & Evolution 10 / Galaxies & Cosmology 3).
 */

import reactRenderer from "@astrojs/react/server.js";
import type { SectionEntry, UnitEntry } from "@sophie/core/schema";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { setupAxeDom } from "../../test-utils/container-axe.ts";
import CourseHomeShell from "./CourseHomeShell.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

function section(
  slug: string,
  order: number,
  title: string,
  description: string
): SectionEntry {
  return { type: "module", slug, order, title, description };
}

function units(sectionId: string, count: number): UnitEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${sectionId}-u${i}`,
    type: "lecture" as const,
    title: `${sectionId} lecture ${i + 1}`,
    order: i,
    prereqs: [],
    status: "stable" as const,
    section_id: sectionId,
    chapter: `${sectionId}-u${i}-reading`,
  }));
}

const SECTIONS: SectionEntry[] = [
  section("foundations", 0, "Foundations", "Math toolkit · gravity & light"),
  section("hr-diagram", 1, "Discovering the HR Diagram", "Parallax · spectra"),
  section("stellar", 2, "Stellar Structure & Evolution", "Fusion · lifecycles"),
  section("galaxies", 3, "Galaxies & Cosmology", "Dark matter · Hubble's law"),
];

const UNITS: UnitEntry[] = [
  ...units("foundations", 4),
  ...units("hr-diagram", 5),
  ...units("stellar", 10),
  ...units("galaxies", 3),
];

const PROPS = {
  code: "ASTR 201",
  title: "Astronomy for Science Majors",
  tagline:
    "A quantitative introduction to astrophysics — extract physical insight from limited observations.",
  instructor: "Anna Rosen",
  institution: "San Diego State University",
  term: "Spring 2027",
  sections: SECTIONS,
  units: UNITS,
  infoPages: {
    syllabus: {},
    schedule: {},
    "office-hours": {},
    instructor: {},
  },
};

/** Render the full-document shell to a string via the Container API. */
async function renderShell(
  props: Record<string, unknown> = PROPS
): Promise<string> {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
  return container.renderToString(CourseHomeShell as never, { props });
}

describe("CourseHomeShell — axe-core a11y + landmark structure", () => {
  test("astr201 fixture renders zero axe violations", async () => {
    const html = await renderShell();
    const dom = new JSDOM(html);
    const results = await axe(dom.window.document.documentElement);
    expect(results).toHaveNoViolations();
  });

  test("exactly one <main> landmark (no nested-main collision, R10)", async () => {
    const html = await renderShell();
    const dom = new JSDOM(html);
    expect(dom.window.document.querySelectorAll("main")).toHaveLength(1);
  });

  test("named regions carry accessible names (R10)", async () => {
    const html = await renderShell();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Orientation cards region: aria-labelledby → a present heading id.
    const cards = doc.querySelector(".sophie-home-cards");
    expect(cards?.getAttribute("aria-labelledby")).toBeTruthy();
    const cardsLabel = cards?.getAttribute("aria-labelledby");
    expect(doc.getElementById(cardsLabel ?? "")?.textContent).toBeTruthy();

    // Module list region: aria-labelledby → a present heading id.
    const modules = doc.querySelector(".sophie-home-modules");
    const modLabel = modules?.getAttribute("aria-labelledby");
    expect(modLabel).toBeTruthy();
    expect(doc.getElementById(modLabel ?? "")?.textContent).toBeTruthy();

    // Footer nav has an accessible name.
    expect(
      doc.querySelector("footer nav")?.getAttribute("aria-label")
    ).toBeTruthy();
  });

  test("hero projects eyebrow (instructor first), title, and counts", async () => {
    const html = await renderShell();
    expect(html).toContain(
      "Anna Rosen · San Diego State University · Spring 2027"
    );
    expect(html).toContain("Astronomy for Science Majors");
    // 4 sections, 22 non-draft lectures.
    expect(html).toContain("4 modules · 22 lectures");
  });

  test("module list renders all four sections with derived lecture counts", async () => {
    const html = await renderShell();
    const dom = new JSDOM(html);
    expect(html).toContain("Foundations");
    expect(html).toContain("Discovering the HR Diagram");
    // Per-section lecture counts (whitespace-collapsed like the browser).
    const counts = [
      ...dom.window.document.querySelectorAll(".sophie-home-mod__right"),
    ].map((el) => el.textContent?.replace(/\s+/g, " ").trim());
    expect(counts).toEqual([
      "4 lectures",
      "5 lectures",
      "10 lectures",
      "3 lectures",
    ]);
  });

  test("footer quick-links project info_pages slugs", async () => {
    const html = await renderShell();
    expect(html).toContain("Syllabus");
    expect(html).toContain("Office Hours");
  });

  test("background mounts (no-JS .sky fallback present)", async () => {
    const html = await renderShell();
    expect(html).toContain("sophie-home-bg__sky");
    expect(html).toContain('id="starfield"');
  });

  test("absent info_pages → no crash, no quick-links", async () => {
    const html = await renderShell({ ...PROPS, infoPages: undefined });
    const dom = new JSDOM(html);
    expect(dom.window.document.querySelectorAll("footer nav a")).toHaveLength(
      0
    );
    const results = await axe(dom.window.document.documentElement);
    expect(results).toHaveNoViolations();
  });
});
