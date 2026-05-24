// @vitest-environment node
/**
 * axe-core a11y test for `<KeyInsightSpecContent>` (W4c Batch 7
 * Task 7.5; ADR 0004 mandate). Fifth and final per-entry Spec
 * content component; follows the Task 7.2 (Misconceptions) template
 * — KeyInsights share the "no inline-ref kind" shape.
 *
 * ## Why the component split (option (a))
 *
 * Mirrors the Task 7.1 rationale verbatim: the smoke route at
 * `examples/smoke/src/pages/library/key-insights/[slug].astro` is
 * a full Astro page (layout + `getStaticPaths` + integration
 * globals). Container API doesn't drive full-page Spec routes (see
 * `container-axe.ts` JSDoc §"What this helper does NOT cover").
 *
 * The inner `<KeyInsightSpecContent entry units>` component is
 * axe-testable via Container API (Batch 3b infra); the route file
 * is a thin layout-wiring shell. Full-page coverage lands via
 * Batch 3c's Playwright harness.
 *
 * ## Scenarios
 *
 *   1. complete KeyInsight (title + body + cross-refs) — zero
 *      violations,
 *   2. bare KeyInsight (no title — fallback "Key insight" + slug
 *      derived from `${unit}-${anchor}` exercises the no-title
 *      slug-fallback path; no cross-refs) — zero violations,
 *   3. composed-into-`<main>` regression guard.
 */

import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import KeyInsightSpecContent from "./KeyInsightSpecContent.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const completeKeyInsight = {
  slug: "four-knobs-one-spectrum",
  title: "Four knobs, one spectrum",
  body: "<p>Temperature, density, composition, and motion together set every feature of a stellar spectrum.</p>",
  unit: "m2-l3-spectra-composition",
  anchor: "key-insight-four-knobs",
};

const unitsForComplete = ["m2-l3-spectra-composition"];

// No title — exercises the "Key insight" fallback heading path AND
// the `${unit}-${anchor}` slug-fallback path (extractor populates
// `slug` from `${unit}-${anchor}` when `title` is absent, per W4c D4).
const bareKeyInsight = {
  slug: "foundations-spoiler-alerts-key-insight-color-physics",
  body: "<p>Color isn't decoration — it's encoded physics. Specific wavelengths = specific atoms = specific conditions.</p>",
  unit: "foundations-spoiler-alerts",
  anchor: "key-insight-color-physics",
  // no title — exercises the "Key insight" fallback heading + the
  // `${unit}-${anchor}` slug-fallback path
};

describe("KeyInsightSpecContent — axe-core a11y", () => {
  test("renders complete KeyInsight (title + body + cross-refs) — zero violations", async () => {
    await renderAstroToBody(KeyInsightSpecContent, {
      props: {
        entry: completeKeyInsight,
        units: unitsForComplete,
      },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders bare KeyInsight (no title; slug-fallback path; no cross-refs) — zero violations", async () => {
    await renderAstroToBody(KeyInsightSpecContent, {
      props: { entry: bareKeyInsight, units: [] },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(KeyInsightSpecContent, {
      props: {
        entry: completeKeyInsight,
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
