// @vitest-environment node
/**
 * axe-core a11y test for <CourseMenu> — the course-home global dropdown
 * nav (ADR 0097 #6; ADR 0004 axe mandate). Chrome, role-less (ADR 0058).
 *
 * BOTH STATES are asserted clean (per Task 4): the panel as rendered
 * (closed, `data-open="false"` / `aria-expanded="false"`) AND the open
 * markup. The Container API renders real SSR but does NOT execute the
 * bundled toggle script, so the "open" test flips `data-open` /
 * `aria-expanded` on the already-rendered DOM (exactly the attribute pair
 * the script sets) before running axe — covering the open panel's a11y
 * without a browser. The Escape / click-outside / focus-return BEHAVIOR is
 * JS and is covered by the Task 7 smoke e2e.
 *
 * The a11y WIRING (aria-haspopup / aria-controls → panel id / aria-expanded
 * / aria-labelledby → trigger) is asserted structurally below.
 *
 * Fixture: the astr201 shape — four sections + the real info_pages
 * (syllabus/instructor/policies/accommodations).
 */

import type { SectionEntry, UnitEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  renderAstroToBody,
  setupAxeDom,
} from "../../test-utils/container-axe.ts";
import CourseMenu from "./CourseMenu.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

function section(slug: string, order: number, title: string): SectionEntry {
  return { type: "module", slug, order, title };
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
  section("foundations", 0, "Foundations"),
  section("hr-diagram", 1, "Discovering the HR Diagram"),
  section("stellar", 2, "Stellar Structure & Evolution"),
  section("galaxies", 3, "Galaxies & Cosmology"),
];

const UNITS: UnitEntry[] = [
  ...units("foundations", 4),
  ...units("hr-diagram", 5),
  ...units("stellar", 10),
  ...units("galaxies", 3),
];

const PROPS = {
  sections: SECTIONS,
  units: UNITS,
  infoPages: {
    syllabus: { layout: "SyllabusPage" },
    instructor: { layout: "InstructorPage" },
    policies: { layout: "PoliciesPage" },
    accommodations: { layout: "AccommodationsPage" },
  },
};

/** Render CourseMenu into document.body via the Container API. */
async function render(props: Record<string, unknown> = PROPS): Promise<string> {
  return renderAstroToBody(CourseMenu, { props });
}

describe("CourseMenu — axe a11y (closed + open) + wiring", () => {
  test("panel CLOSED renders zero axe violations", async () => {
    await render();
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("panel OPEN renders zero axe violations", async () => {
    await render();
    const trigger = document.getElementById("sophie-home-menu-trigger");
    const panel = document.getElementById("sophie-home-menu-panel");
    // Apply exactly the attribute pair the bundled toggle script sets.
    trigger?.setAttribute("aria-expanded", "true");
    panel?.setAttribute("data-open", "true");
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("trigger carries aria-haspopup / aria-expanded(false) / aria-controls → panel id", async () => {
    await render();
    const trigger = document.getElementById("sophie-home-menu-trigger");
    expect(trigger?.getAttribute("aria-haspopup")).toBe("true");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.getAttribute("aria-controls")).toBe(
      "sophie-home-menu-panel"
    );
    // aria-controls resolves to a present element.
    expect(document.getElementById("sophie-home-menu-panel")).not.toBeNull();
  });

  test("panel has an accessible name (aria-labelledby → trigger) and starts closed", async () => {
    await render();
    const panel = document.getElementById("sophie-home-menu-panel");
    expect(panel?.getAttribute("aria-labelledby")).toBe(
      "sophie-home-menu-trigger"
    );
    expect(panel?.getAttribute("data-open")).toBe("false");
  });

  test("nav landmark carries an accessible name (R10)", async () => {
    await render();
    expect(
      document.querySelector("nav")?.getAttribute("aria-label")
    ).toBeTruthy();
  });

  test("the bundled toggle script is wired (Escape/click-outside/focus-return covered by smoke e2e)", async () => {
    // Astro emits the bundled <script> as a module reference, not inline
    // source; assert the reference is present (the toggle behavior runs
    // in the browser, exercised by the Task 7 smoke e2e).
    const html = await render();
    expect(html).toMatch(
      /<script type="module" src="[^"]*CourseMenu\.astro\?astro&type=script/
    );
  });

  test("renders the three groups with real + placeholder entries", async () => {
    const html = await render();
    expect(html).toContain("Course");
    expect(html).toContain("The Course");
    expect(html).toContain("Reference &amp; Help");
    expect(html).toContain("Foundations");
    expect(html).toContain("Math &amp; Physics Review");
    expect(html).toContain("Optional");
  });

  test("placeholder entries render as non-link spans (no dead href)", async () => {
    await render();
    const placeholders = document.querySelectorAll(
      "span.sophie-home-menu__link--placeholder"
    );
    expect(placeholders.length).toBe(2);
    placeholders.forEach((el) => {
      expect(el.tagName.toLowerCase()).toBe("span");
      expect(el.getAttribute("aria-disabled")).toBe("true");
    });
  });

  test("absent info_pages → Course has only Home; still axe-clean", async () => {
    await render({ ...PROPS, infoPages: undefined });
    const links = [
      ...document.querySelectorAll(".sophie-home-menu__group"),
    ][0]?.querySelectorAll("a, span.sophie-home-menu__link");
    // Only the Home link in the Course group.
    expect(links?.length).toBe(1);
    expect(links?.[0]?.textContent?.trim()).toBe("Home");
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
