// @vitest-environment node
/**
 * axe-core a11y test for `<CourseObservables>` (W4c Batch 5 Task 5.1;
 * ADR 0004 mandate). First of 3 new Course* rollups (Tasks 5.1-5.3)
 * that surface `<OMIFlow>` slot data per the ADR 0058 eight-role
 * contract. Wraps content in `<LibraryCollectionShell>` (W4c design D2)
 * + emits `data-section`/`data-unit`/`data-anchor` for Tier-2 filter
 * forward-compat (W4c design D8). Template for `CourseModels` +
 * `CourseInferences` axe tests — copy with role substitution.
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseObservables>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state and pushes fixture OMIFlow entries; the "renders empty state"
 * test intentionally seeds nothing. Documented in `container-axe.ts`
 * JSDoc.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 2 fixture OMIFlow entries seeded; the shell's
 *      default slot renders the `<dl>` list with the observable slot of
 *      each entry,
 *   2. empty branch — no OMIFlow entries seeded; the shell renders the
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
import CourseObservables from "./CourseObservables.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseObservables — axe-core a11y", () => {
  test("renders with OMIFlow observables — zero violations", async () => {
    indexAccumulator.addOMIFlows([
      {
        unit: "ch-spectra",
        anchor: "spectrum-of-the-sun",
        observable: {
          title: "Dark lines crossing the solar continuum",
          body: "<p>Photographs show narrow absorption lines.</p>",
        },
        model: {
          title: "Cool gas above a hot photosphere",
          body: "<p>Atoms absorb at characteristic wavelengths.</p>",
        },
        inference: {
          title: "The Sun's atmosphere contains hydrogen",
          body: "<p>Line patterns match laboratory hydrogen.</p>",
        },
        sourceOrder: ["observable", "model", "inference"],
      },
      {
        unit: "ch-distances",
        anchor: "cepheid-light-curves",
        observable: {
          title: "",
          body: "<p>Periodic brightness variations in distant stars.</p>",
        },
        model: {
          title: "Pulsating outer envelopes",
          body: "<p>Opacity changes drive radial pulsation.</p>",
        },
        inference: {
          title: "Period encodes intrinsic luminosity",
          body: "<p>Apparent brightness gives distance.</p>",
        },
        sourceOrder: ["observable", "model", "inference"],
      },
    ]);
    await renderAstroToBody(CourseObservables, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseObservables, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the shell's own axe test:
    // confirm that wrapping the consumer in the production `<main>` parent
    // does NOT produce a duplicate-main violation. The shell now emits
    // `<section aria-labelledby>`, so this composition is clean.
    indexAccumulator.addOMIFlows([
      {
        unit: "ch-spectra",
        anchor: "spectrum-of-the-sun",
        observable: {
          title: "Dark lines crossing the solar continuum",
          body: "<p>Photographs show narrow absorption lines.</p>",
        },
        model: {
          title: "Cool gas above a hot photosphere",
          body: "<p>Atoms absorb at characteristic wavelengths.</p>",
        },
        inference: {
          title: "The Sun's atmosphere contains hydrogen",
          body: "<p>Line patterns match laboratory hydrogen.</p>",
        },
        sourceOrder: ["observable", "model", "inference"],
      },
    ]);
    await renderAstroToBody(CourseObservables, {
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
