// @vitest-environment node
/**
 * axe-core a11y test for `<CourseKeyInsights>` (W4c Batch 4 Task 4.2;
 * ADR 0004 mandate). Second of 5 Course* refactors that wrap content in
 * `<LibraryCollectionShell>` (W4c design D2) + emit
 * `data-section`/`data-unit`/`data-anchor` for Tier-2 filter
 * forward-compat (W4c design D8). Mirrors `CourseGlossary.axe.test.ts`.
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseKeyInsights>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state and pushes fixture key-insights; the "renders empty state" test
 * intentionally seeds nothing. Documented in `container-axe.ts` JSDoc.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 2 fixture key-insights seeded; the shell's
 *      default slot renders the `<dl>` list,
 *   2. empty branch — no key-insights seeded; the shell renders the
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
import CourseKeyInsights from "./CourseKeyInsights.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseKeyInsights — axe-core a11y", () => {
  test("renders with key insights — zero violations", async () => {
    indexAccumulator.addKeyInsights([
      {
        title: "Distance is the hardest measurement in astronomy",
        slug: "distance-is-the-hardest-measurement-in-astronomy",
        body: "<p>Every other stellar quantity depends on distance.</p>",
        unit: "ch-distances",
        anchor: "distance-ladder-insight",
      },
      {
        slug: "ch-photometry-flux-vs-luminosity",
        body: "<p>Flux is what we measure; luminosity is what we want.</p>",
        unit: "ch-photometry",
        anchor: "flux-vs-luminosity",
      },
    ]);
    await renderAstroToBody(CourseKeyInsights, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseKeyInsights, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the shell's own axe test:
    // confirm that wrapping the consumer in the production `<main>` parent
    // does NOT produce a duplicate-main violation. The shell now emits
    // `<section aria-labelledby>`, so this composition is clean.
    indexAccumulator.addKeyInsights([
      {
        title: "Distance is the hardest measurement in astronomy",
        slug: "distance-is-the-hardest-measurement-in-astronomy",
        body: "<p>Every other stellar quantity depends on distance.</p>",
        unit: "ch-distances",
        anchor: "distance-ladder-insight",
      },
    ]);
    await renderAstroToBody(CourseKeyInsights, {
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
