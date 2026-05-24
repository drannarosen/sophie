// @vitest-environment node
/**
 * axe-core a11y test for `<ModelSpecContent>` (W4c Batch 8
 * Task 8.2; ADR 0004 mandate). Second of three OMIFlow Spec content
 * components (Tasks 8.1-8.3); mirrors Task 8.1 (Observable) with role
 * substitution per ADR 0058 §4. OMIFlows share the "no inline-ref
 * kind" shape.
 *
 * ## Why the component split (option (a))
 *
 * Mirrors the Task 7.1-7.5 + 8.1 rationale: the smoke route at
 * `examples/smoke/src/pages/library/models/[slug].astro` is a
 * full Astro page (layout + `getStaticPaths` + integration globals).
 * Container API doesn't drive full-page Spec routes (see
 * `container-axe.ts` JSDoc §"What this helper does NOT cover").
 *
 * The inner `<ModelSpecContent entry>` component is axe-testable
 * via Container API (Batch 3b infra); the route file is a thin
 * layout-wiring shell. Full-page coverage lands via Batch 3c's
 * Playwright harness.
 *
 * ## Scenarios
 *
 *   1. complete model (slot title + concept + body) — zero
 *      violations,
 *   2. bare model (empty slot title — exercises the "Model"
 *      heading fallback; no concept) — zero violations,
 *   3. composed-into-`<main>` regression guard.
 */

import type { OMIFlowEntry } from "@sophie/core/schema";
import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import ModelSpecContent from "./ModelSpecContent.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const completeOMIFlow: OMIFlowEntry = {
  unit: "m2-l3-spectra-composition",
  anchor: "omi-kirchhoff-third-law",
  concept: "kirchhoff-third-law-stellar-structure",
  observable: {
    title: "Dark lines at specific wavelengths in a star's spectrum",
    body: "<p>Photographs show narrow absorption lines.</p>",
  },
  model: {
    title: "Kirchhoff's third law",
    body: "<p>Atoms absorb at characteristic wavelengths.</p>",
  },
  inference: {
    title: "The star is a two-layer object",
    body: "<p>Hot interior, cooler atmosphere.</p>",
  },
  sourceOrder: ["observable", "model", "inference"],
};

// Empty model slot title — exercises the "Model" fallback
// heading path. No `concept`, so the concept block is omitted.
const bareOMIFlow: OMIFlowEntry = {
  unit: "foundations-spoiler-alerts",
  anchor: "omi-1",
  observable: {
    title: "Periodic brightness variations",
    body: "<p>Periodic brightness variations in distant stars.</p>",
  },
  model: {
    title: "",
    body: "<p>Opacity changes drive radial pulsation.</p>",
  },
  inference: {
    title: "Period encodes intrinsic luminosity",
    body: "<p>Apparent brightness gives distance.</p>",
  },
  sourceOrder: ["observable", "model", "inference"],
};

describe("ModelSpecContent — axe-core a11y", () => {
  test("renders a complete model (with title) — zero violations", async () => {
    await renderAstroToBody(ModelSpecContent, {
      props: { entry: completeOMIFlow },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders bare model (empty title, fallback used) — zero violations", async () => {
    await renderAstroToBody(ModelSpecContent, {
      props: { entry: bareOMIFlow },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(ModelSpecContent, {
      props: { entry: completeOMIFlow },
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
