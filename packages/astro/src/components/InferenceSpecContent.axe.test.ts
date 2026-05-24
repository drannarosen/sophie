// @vitest-environment node
/**
 * axe-core a11y test for `<InferenceSpecContent>` (W4c Batch 8
 * Task 8.3; ADR 0004 mandate). Third of three OMIFlow Spec content
 * components (Tasks 8.1-8.3); mirrors Tasks 8.1 (Observable) + 8.2
 * (Model) with role substitution per ADR 0058 §4. OMIFlows share the
 * "no inline-ref kind" shape.
 *
 * ## Why the component split (option (a))
 *
 * Mirrors the Task 7.1-7.5 + 8.1-8.2 rationale: the smoke route at
 * `examples/smoke/src/pages/library/inferences/[slug].astro` is a
 * full Astro page (layout + `getStaticPaths` + integration globals).
 * Container API doesn't drive full-page Spec routes (see
 * `container-axe.ts` JSDoc §"What this helper does NOT cover").
 *
 * The inner `<InferenceSpecContent entry>` component is axe-testable
 * via Container API (Batch 3b infra); the route file is a thin
 * layout-wiring shell. Full-page coverage lands via Batch 3c's
 * Playwright harness.
 *
 * ## Scenarios
 *
 *   1. complete inference (slot title + concept + body) — zero
 *      violations,
 *   2. bare inference (empty slot title — exercises the "Inference"
 *      heading fallback; no concept) — zero violations,
 *   3. composed-into-`<main>` regression guard.
 */

import type { OMIFlowEntry } from "@sophie/core/schema";
import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import InferenceSpecContent from "./InferenceSpecContent.astro";

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

// Empty inference slot title — exercises the "Inference" fallback
// heading path. No `concept`, so the concept block is omitted.
const bareOMIFlow: OMIFlowEntry = {
  unit: "foundations-spoiler-alerts",
  anchor: "omi-1",
  observable: {
    title: "Periodic brightness variations",
    body: "<p>Periodic brightness variations in distant stars.</p>",
  },
  model: {
    title: "Opacity-driven radial pulsation",
    body: "<p>Opacity changes drive radial pulsation.</p>",
  },
  inference: {
    title: "",
    body: "<p>Apparent brightness gives distance.</p>",
  },
  sourceOrder: ["observable", "model", "inference"],
};

describe("InferenceSpecContent — axe-core a11y", () => {
  test("renders a complete inference (with title) — zero violations", async () => {
    await renderAstroToBody(InferenceSpecContent, {
      props: { entry: completeOMIFlow },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders bare inference (empty title, fallback used) — zero violations", async () => {
    await renderAstroToBody(InferenceSpecContent, {
      props: { entry: bareOMIFlow },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(InferenceSpecContent, {
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
