// @vitest-environment node
/**
 * axe-core a11y test for `<CourseModels>` (W4c Batch 5 Task 5.2;
 * ADR 0004 mandate). Second of 3 new Course* rollups (Tasks 5.1-5.3)
 * that surface `<OMIFlow>` slot data per the ADR 0058 eight-role
 * contract. Wraps content in `<LibraryCollectionShell>` (W4c design D2)
 * + emits `data-section`/`data-unit`/`data-anchor` for Tier-2 filter
 * forward-compat (W4c design D8). Mirrors `CourseObservables.axe.test.ts`
 * with role substitution (observable → model).
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseModels>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state and pushes fixture OMIFlow entries; the "renders empty state"
 * test intentionally seeds nothing. Documented in `container-axe.ts`
 * JSDoc.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 2 fixture OMIFlow entries seeded; the shell's
 *      default slot renders the `<dl>` list with the model slot of
 *      each entry. One entry has an empty model title to exercise the
 *      `"Model"` fallback path,
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
import CourseModels from "./CourseModels.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseModels — axe-core a11y", () => {
  test("renders with OMIFlow models — zero violations", async () => {
    indexAccumulator.addOMIFlows("u", "reading", [
      {
        unit: "ch-spectra",
        anchor: "spectrum-of-the-sun",
        observable: {
          title: "Dark lines crossing the solar continuum",
          body: "<p>Photographs show narrow absorption lines.</p>",
        },
        model: {
          title: "Cool gas above a hot photosphere",
          body: "<p>Atoms in a cooler layer absorb photons at their characteristic wavelengths from the hotter continuum below.</p>",
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
          title: "Periodic brightness variations in distant stars",
          body: "<p>Cepheids brighten and dim on a fixed period.</p>",
        },
        model: {
          title: "",
          body: "<p>Radial pulsation driven by opacity changes in partially ionized helium.</p>",
        },
        inference: {
          title: "Period encodes intrinsic luminosity",
          body: "<p>Apparent brightness gives distance.</p>",
        },
        sourceOrder: ["observable", "model", "inference"],
      },
    ]);
    await renderAstroToBody(CourseModels, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseModels, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the shell's own axe test:
    // confirm that wrapping the consumer in the production `<main>` parent
    // does NOT produce a duplicate-main violation. The shell now emits
    // `<section aria-labelledby>`, so this composition is clean.
    indexAccumulator.addOMIFlows("u", "reading", [
      {
        unit: "ch-spectra",
        anchor: "spectrum-of-the-sun",
        observable: {
          title: "Dark lines crossing the solar continuum",
          body: "<p>Photographs show narrow absorption lines.</p>",
        },
        model: {
          title: "Cool gas above a hot photosphere",
          body: "<p>Atoms in a cooler layer absorb photons at their characteristic wavelengths from the hotter continuum below.</p>",
        },
        inference: {
          title: "The Sun's atmosphere contains hydrogen",
          body: "<p>Line patterns match laboratory hydrogen.</p>",
        },
        sourceOrder: ["observable", "model", "inference"],
      },
    ]);
    await renderAstroToBody(CourseModels, {
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
