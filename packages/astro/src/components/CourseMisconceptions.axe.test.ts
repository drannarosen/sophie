// @vitest-environment node
/**
 * axe-core a11y test for `<CourseMisconceptions>` (W4c Batch 4 Task 4.4;
 * ADR 0004 mandate). Fourth of 5 Course* refactors that wrap content in
 * `<LibraryCollectionShell>` (W4c design D2) + emit
 * `data-section`/`data-unit`/`data-anchor` for Tier-2 filter
 * forward-compat (W4c design D8). Mirrors `CourseGlossary.axe.test.ts`,
 * `CourseKeyInsights.axe.test.ts`, and `CourseEquations.axe.test.ts`.
 *
 * ## Singleton-seeding pattern
 *
 * `<CourseMisconceptions>` reads `indexAccumulator.asPedagogyIndex()` at
 * module-init via its frontmatter, so the accumulator must be seeded
 * BEFORE `renderAstroToBody` is called. `beforeEach` resets the global
 * state and pushes fixture misconceptions; the "renders empty state"
 * test intentionally seeds nothing. Documented in `container-axe.ts`
 * JSDoc.
 *
 * Three scenarios cover the consumer's branches:
 *   1. content branch — 2 fixture misconceptions seeded (mix of `short`
 *      + `long` to exercise the length-modifier class on both `<dt>`
 *      and `<dd>`); the shell's default slot renders the `<dl>` list,
 *   2. empty branch — no misconceptions seeded; the shell renders the
 *      empty-state `<p>`,
 *   3. composed-into-`<main>` regression guard — confirms no
 *      `landmark-no-duplicate-main` violation when the consumer sits
 *      inside the page's `<main>` (the shell uses `<section
 *      aria-labelledby>`, not `<main>`).
 *
 * ## Fixture choices vs glossary/key-insights
 *
 * `MisconceptionEntry` carries a `length: "short" | "long"`
 * discriminator (Aside vs Callout source primitive) that drives the
 * `--short`/`--long` modifier class on both `<dt>` and `<dd>`. The
 * content-branch fixture exercises BOTH variants so the length-modifier
 * code path is covered. `label` is intentionally omitted from BOTH
 * fixtures to exercise the default-label-by-length fallback (short →
 * "Misconception (brief)"; long → "Misconception"). `slug` is required
 * per W4c Batch 1b (derived at extraction; supplied directly in
 * fixtures).
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  indexAccumulator,
  resetIndexAccumulator,
} from "../lib/pedagogy-index/accumulator.ts";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import CourseMisconceptions from "./CourseMisconceptions.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

beforeEach(() => {
  resetIndexAccumulator();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CourseMisconceptions — axe-core a11y", () => {
  test("renders with misconceptions — zero violations", async () => {
    indexAccumulator.addMisconceptions("u", "reading", [
      {
        body: "<p>Hotter stars are not necessarily more luminous.</p>",
        unit: "ch-stellar-properties",
        anchor: "hot-equals-luminous",
        length: "short",
        slug: "misc-hot-equals-luminous",
      },
      {
        body: "<p>The Sun is not yellow; its peak emission is in the green.</p>",
        unit: "ch-stellar-properties",
        anchor: "sun-is-yellow",
        length: "long",
        slug: "misc-sun-is-yellow",
      },
    ]);
    await renderAstroToBody(CourseMisconceptions, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty state — zero violations", async () => {
    await renderAstroToBody(CourseMisconceptions, { props: {} });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard mirroring the shell's own axe test:
    // confirm that wrapping the consumer in the production `<main>` parent
    // does NOT produce a duplicate-main violation. The shell now emits
    // `<section aria-labelledby>`, so this composition is clean.
    indexAccumulator.addMisconceptions("u", "reading", [
      {
        body: "<p>Hotter stars are not necessarily more luminous.</p>",
        unit: "ch-stellar-properties",
        anchor: "hot-equals-luminous",
        length: "short",
        slug: "misc-hot-equals-luminous",
      },
    ]);
    await renderAstroToBody(CourseMisconceptions, {
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
