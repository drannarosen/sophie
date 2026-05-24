// @vitest-environment node
/**
 * axe-core a11y test for `<MisconceptionSpecContent>` (W4c Batch 7
 * Task 7.2; ADR 0004 mandate). Second per-entry Spec content
 * component; follows the Task 7.1 (Equations) template established
 * in `EquationSpecContent.axe.test.ts`.
 *
 * ## Why the component split (option (a))
 *
 * Mirrors the Task 7.1 rationale verbatim: the smoke route at
 * `examples/smoke/src/pages/library/misconceptions/[slug].astro` is
 * a full Astro page (layout + `getStaticPaths` + integration
 * globals). Container API doesn't drive full-page Spec routes (see
 * `container-axe.ts` JSDoc §"What this helper does NOT cover").
 *
 * The inner `<MisconceptionSpecContent misconception units>`
 * component is axe-testable via Container API (Batch 3b infra);
 * the route file is a thin layout-wiring shell. Full-page coverage
 * lands via Batch 3c's Playwright harness.
 *
 * ## Scenarios
 *
 *   1. complete misconception (label + body + cross-refs) — zero
 *      violations,
 *   2. bare misconception (no label — length-fallback exercised;
 *      no cross-refs) — zero violations,
 *   3. composed-into-`<main>` regression guard.
 */

import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import MisconceptionSpecContent from "./MisconceptionSpecContent.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const completeMisconception = {
  slug: "stars-are-on-fire",
  body: "<p>Stars are not on fire (no oxygen, no combustion). They shine because of nuclear fusion in their cores.</p>",
  unit: "m1-l2-what-is-a-star",
  anchor: "misconception-stars-on-fire",
  length: "long" as const,
  label: "Stars are on fire",
};

const unitsForComplete = ["m1-l2-what-is-a-star"];

const bareMisconception = {
  slug: "m2-l3-spectra-composition-misconception-color-equals-temperature",
  body: "<p>Color does not directly equal temperature — peak wavelength does.</p>",
  unit: "m2-l3-spectra-composition",
  anchor: "misconception-color-equals-temperature",
  length: "short" as const,
  // no label — exercises the length-aware "Misconception (brief)" fallback
};

describe("MisconceptionSpecContent — axe-core a11y", () => {
  test("renders complete misconception (label + body + cross-refs) — zero violations", async () => {
    await renderAstroToBody(MisconceptionSpecContent, {
      props: {
        misconception: completeMisconception,
        units: unitsForComplete,
      },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders bare misconception (no label, length-fallback used; no cross-refs) — zero violations", async () => {
    await renderAstroToBody(MisconceptionSpecContent, {
      props: { misconception: bareMisconception, units: [] },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(MisconceptionSpecContent, {
      props: {
        misconception: completeMisconception,
        units: unitsForComplete,
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
