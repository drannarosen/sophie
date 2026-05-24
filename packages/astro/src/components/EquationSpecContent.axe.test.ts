// @vitest-environment node
/**
 * axe-core a11y test for `<EquationSpecContent>` (W4c Batch 7 Task 7.1;
 * ADR 0004 mandate). First per-entry Spec content component; established
 * pattern for Tasks 7.2-7.5 (Misconceptions/Glossary/Figures/KeyInsights
 * Spec routes).
 *
 * ## Why the component split (option (a))
 *
 * The smoke route at `examples/smoke/src/pages/library/equations/[id].astro`
 * is a full Astro page (layout + `getStaticPaths` + integration globals).
 * Container API doesn't drive full-page Spec routes (see
 * `container-axe.ts` JSDoc §"What this helper does NOT cover").
 *
 * Splitting the Spec into an inner `<EquationSpecContent equation citations>`
 * component lets axe-core test the content shape via Container API
 * (Batch 3b infra), with the route file as a thin layout-wiring shell.
 * Full-page axe coverage of Spec routes lands via Batch 3c's Playwright
 * harness; this component test guards the content-shape branches
 * (with-biography / without-biography / with-citations / without-citations).
 *
 * ## Scenarios
 *
 *   1. complete equation (biography + citations) — zero violations,
 *   2. equation without biography — defensive; ADR 0046 makes biography
 *      per-equation opt-in,
 *   3. composed-into-`<main>` regression guard.
 */

import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import EquationSpecContent from "./EquationSpecContent.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const completeEquation = {
  id: "stefan-boltzmann",
  title: "Stefan–Boltzmann law",
  tex: "L = 4\\pi R^2 \\sigma T^4",
  symbols: ["L", "R", "\\sigma", "T"],
  biography: {
    observable: {
      body: "Surface luminosity scales with the fourth power of effective temperature.",
      epistemicRole: "observable" as const,
    },
    assumptions: [
      {
        body: "Blackbody radiator (perfect absorber and emitter).",
        epistemicRole: "assumption" as const,
      },
    ],
    units: [
      { symbol: "L", unit: "erg s^{-1}" },
      { symbol: "T", unit: "K" },
    ],
    common_misuses: [],
    derivation_steps: [],
  },
};

const citationsForComplete = [
  {
    unit: "m2-l3-spectra-composition",
    refId: "stefan-boltzmann",
    anchor: "key-equation-stefan-boltzmann",
    number: 1,
  },
];

const bareEquation = {
  id: "wien-displacement",
  title: "Wien displacement law",
  tex: "\\lambda_{peak} T = b",
  symbols: ["\\lambda_{peak}", "T", "b"],
};

describe("EquationSpecContent — axe-core a11y", () => {
  test("renders complete equation (biography + citations) — zero violations", async () => {
    await renderAstroToBody(EquationSpecContent, {
      props: { equation: completeEquation, citations: citationsForComplete },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders equation without biography or citations — zero violations", async () => {
    await renderAstroToBody(EquationSpecContent, {
      props: { equation: bareEquation, citations: [] },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(EquationSpecContent, {
      props: { equation: completeEquation, citations: citationsForComplete },
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
