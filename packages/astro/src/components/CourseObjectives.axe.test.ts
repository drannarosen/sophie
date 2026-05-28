// @vitest-environment node
/**
 * axe-core a11y test for `<CourseObjectives>` (W4c Batch 4 Task 4.6;
 * ADR 0004 mandate). Sixth of 6 `Course*` axe tests. Mirrors
 * `CourseGlossary.axe.test.ts` / `CourseKeyInsights.axe.test.ts` /
 * `CourseEquations.axe.test.ts` / `CourseMisconceptions.axe.test.ts` /
 * `CourseFigures.axe.test.ts`.
 *
 * ## D1 exception — no shell wrapping
 *
 * Per W4c design doc D1, `<CourseObjectives>` is the lone `Course*`
 * consumer that STAYS OUTSIDE `<LibraryCollectionShell>`: its 3-level
 * Module → Chapter → Objectives grouping (`<section>` / `<article>` /
 * `<ul>`) is structurally distinct from the flat-list `<dl>` / `<ol>`
 * shape the shell is optimized for. The nested `<section>` /
 * `<article>` markup already provides region landmarks, so this
 * component's existing structure passes axe without the shell wrap.
 *
 * These tests therefore serve as **forward-compat regression
 * coverage** parallel to the 5 shell-wrapped siblings — not as a
 * driver for refactor. Expect first-run GREEN; if any test fails the
 * existing component has a real a11y issue worth surfacing before
 * patching.
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseObjectives>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state; the content tests push fixture sections + units + objectives
 * via `setSections` / `setUnits` / `addObjectives`. The "renders empty
 * state" test intentionally seeds nothing.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 1 section, 2 units in that section, 2–3
 *      objectives per unit; exercises the full 3-level grouping render
 *      (the `<section>` + `<article>` + `<ul>` cascade),
 *   2. empty branch — no entries seeded; the consumer renders the
 *      empty-state `<p>` ("No modules declared yet."),
 *   3. composed-into-`<main>` regression guard — confirms no
 *      `landmark-no-duplicate-main` violation when the consumer sits
 *      inside the page's `<main>`. The consumer emits `<section>` (not
 *      `<main>`), so this composition is clean.
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  indexAccumulator,
  resetIndexAccumulator,
} from "../lib/pedagogy-index/accumulator.ts";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import CourseObjectives from "./CourseObjectives.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseObjectives — axe-core a11y", () => {
  test("renders with module→chapter→objectives grouping — zero violations", async () => {
    indexAccumulator.setSections([
      {
        type: "module",
        slug: "m-stars",
        title: "Stars",
        order: 1,
      },
    ]);
    indexAccumulator.setUnits([
      {
        id: "ch-stellar-properties",
        type: "lecture",
        title: "Stellar Properties",
        order: 1,
        prereqs: [],
        section_id: "m-stars",
        chapter: "ch-stellar-properties",
        status: "stable",
      },
      {
        id: "ch-spectra",
        type: "lecture",
        title: "Stellar Spectra",
        order: 2,
        prereqs: [],
        section_id: "m-stars",
        chapter: "ch-spectra",
        status: "stable",
      },
    ]);
    indexAccumulator.addObjectives("u", "reading", [
      {
        id: "lum-temp",
        verb: "Recognize",
        body: "<p>that luminosity scales with both radius and temperature.</p>",
        unit: "ch-stellar-properties",
        anchor: "lo-lum-temp",
      },
      {
        id: "hr-diagram",
        verb: "Interpret",
        body: "<p>position on the Hertzsprung–Russell diagram.</p>",
        unit: "ch-stellar-properties",
        anchor: "lo-hr-diagram",
      },
      {
        id: "absorption-lines",
        verb: "Identify",
        body: "<p>absorption lines in a stellar spectrum.</p>",
        unit: "ch-spectra",
        anchor: "lo-absorption-lines",
      },
      {
        id: "spectral-class",
        verb: "Apply",
        body: "<p>the OBAFGKM classification to an unknown spectrum.</p>",
        unit: "ch-spectra",
        anchor: "lo-spectral-class",
      },
      {
        id: "doppler-shift",
        verb: "Calculate",
        body: "<p>radial velocity from a measured line shift.</p>",
        unit: "ch-spectra",
        anchor: "lo-doppler-shift",
      },
    ]);
    await renderAstroToBody(CourseObjectives, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseObjectives, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the 5 shell-wrapped
    // siblings' composed-into-main tests. Confirms that wrapping the
    // consumer in the production `<main>` parent does NOT produce a
    // duplicate-main violation. CourseObjectives emits `<section>` /
    // `<article>` (not `<main>`), so this composition is clean.
    indexAccumulator.setSections([
      {
        type: "module",
        slug: "m-stars",
        title: "Stars",
        order: 1,
      },
    ]);
    indexAccumulator.setUnits([
      {
        id: "ch-stellar-properties",
        type: "lecture",
        title: "Stellar Properties",
        order: 1,
        prereqs: [],
        section_id: "m-stars",
        chapter: "ch-stellar-properties",
        status: "stable",
      },
    ]);
    indexAccumulator.addObjectives("u", "reading", [
      {
        id: "lum-temp",
        verb: "Recognize",
        body: "<p>that luminosity scales with both radius and temperature.</p>",
        unit: "ch-stellar-properties",
        anchor: "lo-lum-temp",
      },
    ]);
    await renderAstroToBody(CourseObjectives, {
      props: {},
      wrap: (html) => `<main class="sophie-content">${html}</main>`,
    });
    const results = (await axe(document.body)) as {
      violations: Array<{ id: string }>;
    };
    expect(results).toHaveNoViolations();
    const duplicateMainViolation = results.violations.find(
      (v) => v.id === "landmark-no-duplicate-main"
    );
    expect(duplicateMainViolation).toBeUndefined();
  });
});
