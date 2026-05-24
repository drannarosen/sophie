// @vitest-environment node
/**
 * axe-core a11y test for `<GlossarySpecContent>` (W4c Batch 7 Task
 * 7.3; ADR 0004 mandate). Third per-entry Spec content component;
 * follows the Task 7.1 (Equations) / Task 7.2 (Misconceptions)
 * template established in `EquationSpecContent.axe.test.ts`.
 *
 * ## Why the component split (option (a))
 *
 * Mirrors the Task 7.1 rationale verbatim: the smoke route at
 * `examples/smoke/src/pages/library/glossary/[slug].astro` is a
 * full Astro page (layout + `getStaticPaths` + integration
 * globals). Container API doesn't drive full-page Spec routes
 * (see `container-axe.ts` JSDoc §"What this helper does NOT
 * cover").
 *
 * The inner `<GlossarySpecContent entry referencingUnits>`
 * component is axe-testable via Container API (Batch 3b infra);
 * the route file is a thin layout-wiring shell. Full-page coverage
 * lands via Batch 3c's Playwright harness.
 *
 * ## Scenarios
 *
 *   1. complete definition (body + referencing units cross-refs) —
 *      zero violations,
 *   2. bare definition (no referencing units; "Defined in" still
 *      renders) — zero violations,
 *   3. composed-into-`<main>` regression guard.
 */

import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import GlossarySpecContent from "./GlossarySpecContent.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const completeDefinition = {
  term: "Standard candle",
  slug: "standard-candle",
  body: "<p>An astronomical object of known intrinsic brightness, used to measure cosmic distances.</p>",
  unit: "m3-l1-cosmic-distance-ladder",
  anchor: "definition-standard-candle",
};

const referencingUnitsForComplete = [
  "m3-l1-cosmic-distance-ladder",
  "m3-l2-hubble-law",
];

const bareDefinition = {
  term: "Parallax",
  slug: "parallax",
  body: "<p>The apparent shift of a nearby object against a distant background as the observer's vantage changes.</p>",
  unit: "m3-l1-cosmic-distance-ladder",
  anchor: "definition-parallax",
};

describe("GlossarySpecContent — axe-core a11y", () => {
  test("renders complete definition (body + cross-refs) — zero violations", async () => {
    await renderAstroToBody(GlossarySpecContent, {
      props: {
        entry: completeDefinition,
        referencingUnits: referencingUnitsForComplete,
      },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders bare definition (no referencing units; 'Defined in' still renders) — zero violations", async () => {
    await renderAstroToBody(GlossarySpecContent, {
      props: { entry: bareDefinition, referencingUnits: [] },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(GlossarySpecContent, {
      props: {
        entry: completeDefinition,
        referencingUnits: referencingUnitsForComplete,
      },
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
