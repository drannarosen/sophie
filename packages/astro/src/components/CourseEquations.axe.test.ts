// @vitest-environment node
/**
 * axe-core a11y test for `<CourseEquations>` (W4c Batch 4 Task 4.3;
 * ADR 0004 mandate). Third of 5 Course* refactors that wrap content in
 * `<LibraryCollectionShell>` (W4c design D2) + emit
 * `data-section`/`data-unit`/`data-anchor` for Tier-2 filter
 * forward-compat (W4c design D8). Mirrors `CourseGlossary.axe.test.ts`
 * and `CourseKeyInsights.axe.test.ts`.
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseEquations>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state and pushes fixture equations; the "renders empty state" test
 * intentionally seeds nothing. Documented in `container-axe.ts` JSDoc.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 2 fixture equations seeded; the shell's
 *      default slot renders the `<dl>` list,
 *   2. empty branch — no equations seeded; the shell renders the
 *      empty-state `<p>`,
 *   3. composed-into-`<main>` regression guard — confirms no
 *      `landmark-no-duplicate-main` violation when the consumer sits
 *      inside the page's `<main>` (the shell uses `<section
 *      aria-labelledby>`, not `<main>`).
 *
 * ## Schema differences from glossary/key-insights fixtures
 *
 * `EquationEntry` is registry-sourced per ADR 0060 — it extends
 * `RegistryBaseSchema` (`id`, `title`, optional `tags`/`version`) +
 * `tex` + `symbols[]` + optional `biography`. It carries NO `unit`
 * field (registry MDX is not chapter-keyed) and NO own `anchor`
 * (the `id` IS the canonical anchor). Fixtures supply the minimum
 * required surface: `id`, `title`, `tex`, `symbols`.
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  indexAccumulator,
  resetIndexAccumulator,
} from "../lib/pedagogy-index/accumulator.ts";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import CourseEquations from "./CourseEquations.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseEquations — axe-core a11y", () => {
  test("renders with equations — zero violations", async () => {
    indexAccumulator.addEquations([
      {
        id: "stefan-boltzmann",
        title: "Stefan–Boltzmann law",
        tex: "L = 4\\pi R^2 \\sigma T^4",
        symbols: ["L", "R", "\\sigma", "T"],
      },
      {
        id: "wien-displacement",
        title: "Wien displacement law",
        tex: "\\lambda_{peak} T = b",
        symbols: ["\\lambda_{peak}", "T", "b"],
      },
    ]);
    await renderAstroToBody(CourseEquations, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseEquations, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the shell's own axe test:
    // confirm that wrapping the consumer in the production `<main>` parent
    // does NOT produce a duplicate-main violation. The shell now emits
    // `<section aria-labelledby>`, so this composition is clean.
    indexAccumulator.addEquations([
      {
        id: "stefan-boltzmann",
        title: "Stefan–Boltzmann law",
        tex: "L = 4\\pi R^2 \\sigma T^4",
        symbols: ["L", "R", "\\sigma", "T"],
      },
    ]);
    await renderAstroToBody(CourseEquations, {
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
