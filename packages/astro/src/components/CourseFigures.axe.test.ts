// @vitest-environment node
/**
 * axe-core a11y test for `<CourseFigures>` (W4c Batch 4 Task 4.5;
 * ADR 0004 mandate). Fifth and final of 5 Course* refactors that wrap
 * content in `<LibraryCollectionShell>` (W4c design D2) + emit
 * `data-section`/`data-unit`/`data-anchor` for Tier-2 filter
 * forward-compat (W4c design D8). Mirrors `CourseGlossary.axe.test.ts`,
 * `CourseKeyInsights.axe.test.ts`, `CourseEquations.axe.test.ts`, and
 * `CourseMisconceptions.axe.test.ts`.
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseFigures>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state and pushes fixture figure usages + registry; the "renders empty
 * state" test intentionally seeds nothing.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 2 fixture figures seeded (each as a registry
 *      entry AND a matching usage entry — exercising the two-tier
 *      registry+usage model per ADR 0038 + PR-C3 decision #3); the
 *      shell's default slot renders the `<ol>` list. One usage is
 *      flagged `canonical: true` to exercise the canonical-flag code
 *      path,
 *   2. empty branch — no figures seeded; the shell renders the
 *      empty-state `<p>`,
 *   3. composed-into-`<main>` regression guard — confirms no
 *      `landmark-no-duplicate-main` violation when the consumer sits
 *      inside the page's `<main>` (the shell uses `<section
 *      aria-labelledby>`, not `<main>`).
 *
 * ## Fixture choices vs prior 4 Course* tests
 *
 * `<CourseFigures>` is structurally distinct from the prior 4: it
 * renders `<ol>`/`<li>` (not `<dl>`/`<dt>`+`<dd>`) and depends on a
 * two-tier lookup — `figureUsages` from the chapter MDX walk PLUS
 * `figureRegistry` from the consumer app (`setFigureRegistry` on the
 * accumulator). Both tiers MUST be seeded for the registry-resolved
 * branch to render. To prove both code paths, the content fixture
 * seeds matching pairs (registry name ↔ usage name); the
 * missing-figure marker branch (usage without registry entry) is not
 * specifically tested here because it is a defensive fallback the
 * production page never exercises once Task 11 wires the registry
 * through (W2 — no test for hypothetical state).
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  indexAccumulator,
  resetIndexAccumulator,
} from "../lib/pedagogy-index/accumulator.ts";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import CourseFigures from "./CourseFigures.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseFigures — axe-core a11y", () => {
  test("renders with figures — zero violations", async () => {
    indexAccumulator.setFigureRegistry([
      {
        name: "hr-diagram",
        src: "/figures/hr-diagram.png",
        alt: "Hertzsprung-Russell diagram plotting luminosity against effective temperature.",
        caption:
          "Hertzsprung-Russell diagram of stellar luminosity vs temperature.",
      },
      {
        name: "solar-spectrum",
        src: "/figures/solar-spectrum.png",
        alt: "Solar spectrum showing absorption lines across visible wavelengths.",
        caption: "Solar absorption spectrum across visible wavelengths.",
      },
    ]);
    indexAccumulator.addFigureUsages([
      {
        name: "hr-diagram",
        unit: "ch-stellar-properties",
        anchor: "hr-diagram",
        number: 1,
        canonical: true,
      },
      {
        name: "solar-spectrum",
        unit: "ch-spectra",
        anchor: "solar-spectrum",
        number: 2,
        canonical: false,
      },
    ]);
    await renderAstroToBody(CourseFigures, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseFigures, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the shell's own axe test:
    // confirm that wrapping the consumer in the production `<main>` parent
    // does NOT produce a duplicate-main violation. The shell now emits
    // `<section aria-labelledby>`, so this composition is clean.
    indexAccumulator.setFigureRegistry([
      {
        name: "hr-diagram",
        src: "/figures/hr-diagram.png",
        alt: "Hertzsprung-Russell diagram plotting luminosity against effective temperature.",
        caption:
          "Hertzsprung-Russell diagram of stellar luminosity vs temperature.",
      },
    ]);
    indexAccumulator.addFigureUsages([
      {
        name: "hr-diagram",
        unit: "ch-stellar-properties",
        anchor: "hr-diagram",
        number: 1,
        canonical: true,
      },
    ]);
    await renderAstroToBody(CourseFigures, {
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
