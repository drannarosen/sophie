// @vitest-environment node
/**
 * axe-core a11y test for `<CourseGlossary>` (W4c Batch 4 Task 4.1; ADR
 * 0004 mandate). First of 5 Course* refactors that wrap content in
 * `<LibraryCollectionShell>` (W4c design D2) + emit
 * `data-section`/`data-unit`/`data-anchor` for Tier-2 filter
 * forward-compat (W4c design D8).
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseGlossary>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state and pushes fixture definitions; the "renders empty state" test
 * intentionally seeds nothing. Documented in `container-axe.ts` JSDoc.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 2 fixture definitions seeded; the shell's
 *      default slot renders the `<dl>` list,
 *   2. empty branch — no definitions seeded; the shell renders the
 *      empty-state `<p>`,
 *   3. composed-into-`<main>` regression guard — confirms no
 *      `landmark-no-duplicate-main` violation when the consumer sits
 *      inside the page's `<main>` (the shell uses `<section
 *      aria-labelledby>`, not `<main>`).
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  indexAccumulator,
  resetIndexAccumulator,
} from "../lib/pedagogy-index/accumulator.ts";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import CourseGlossary from "./CourseGlossary.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseGlossary — axe-core a11y", () => {
  test("renders with definitions — zero violations", async () => {
    indexAccumulator.addDefinitions("u", "reading", [
      {
        term: "Parallax",
        slug: "parallax",
        body: "<p>Apparent shift of a nearby star against background stars.</p>",
        unit: "ch-distances",
        anchor: "parallax",
      },
      {
        term: "Flux",
        slug: "flux",
        body: "<p>Energy crossing unit area per unit time.</p>",
        unit: "ch-photometry",
        anchor: "flux",
      },
    ]);
    await renderAstroToBody(CourseGlossary, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseGlossary, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the shell's own axe test:
    // confirm that wrapping the consumer in the production `<main>` parent
    // does NOT produce a duplicate-main violation. The shell now emits
    // `<section aria-labelledby>`, so this composition is clean.
    indexAccumulator.addDefinitions("u", "reading", [
      {
        term: "Parallax",
        slug: "parallax",
        body: "<p>Apparent shift of a nearby star.</p>",
        unit: "ch-distances",
        anchor: "parallax",
      },
    ]);
    await renderAstroToBody(CourseGlossary, {
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
