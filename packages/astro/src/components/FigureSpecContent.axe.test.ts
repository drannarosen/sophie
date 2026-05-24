// @vitest-environment node
/**
 * axe-core a11y test for `<FigureSpecContent>` (W4c Batch 7 Task
 * 7.4; ADR 0004 mandate). Fourth per-entry Spec content component;
 * follows the Task 7.1 (Equations) / Task 7.2 (Misconceptions) /
 * Task 7.3 (Glossary) template established in
 * `EquationSpecContent.axe.test.ts`.
 *
 * ## Why the component split (option (a))
 *
 * Mirrors the Task 7.1 rationale verbatim: the smoke route at
 * `examples/smoke/src/pages/library/figures/[name].astro` is a
 * full Astro page (layout + `getStaticPaths` + integration
 * globals). Container API doesn't drive full-page Spec routes
 * (see `container-axe.ts` JSDoc §"What this helper does NOT
 * cover").
 *
 * The inner `<FigureSpecContent entry usages referencingUnits>`
 * component is axe-testable via Container API (Batch 3b infra);
 * the route file is a thin layout-wiring shell. Full-page coverage
 * lands via Batch 3c's Playwright harness.
 *
 * ## Two-tier model
 *
 * Figures have a two-tier shape (`FigureRegistryEntry` +
 * `FigureUsageEntry`); the registry is the consumer-app source-of-
 * truth (owns name/src/alt/caption/credit/width/height), and the
 * extractor emits per-callsite usage entries (name/unit/anchor/
 * number/canonical/captionOverride/chapterNumber). The Spec page
 * renders the registry data + lists ALL usages of this name (every
 * Unit that calls `<Figure name="X">`, with the per-callsite Fig.
 * number + canonical flag).
 *
 * ## Scenarios
 *
 *   1. registry entry with usages + cross-refs — zero violations
 *      (covers credit + caption + canonical badge + Fig number +
 *      multi-unit "Used in" + "Referenced in" cross-refs),
 *   2. registered-but-unused (zero usages, zero cross-refs) — zero
 *      violations (edge case: figure in registry but no Unit calls
 *      it; route must still render without crashing),
 *   3. composed-into-`<main>` regression guard.
 */

import type {
  FigureRegistryEntry,
  FigureUsageEntry,
} from "@sophie/core/schema";
import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import FigureSpecContent from "./FigureSpecContent.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const completeEntry: FigureRegistryEntry = {
  name: "absorption-emission-elements",
  src: "/figures/absorption-emission-spectra-jwst.png",
  alt: "Absorption and emission spectra for four elements showing matching line patterns.",
  caption:
    "**What to notice:** Each element has a unique spectral fingerprint.",
  credit: "JWST/STScI",
};

const completeUsages: FigureUsageEntry[] = [
  {
    name: "absorption-emission-elements",
    unit: "m2-l3-spectra-and-composition",
    anchor: "fig-emission-absorption",
    number: 2,
    canonical: true,
    chapterNumber: 3,
  },
  {
    name: "absorption-emission-elements",
    unit: "m4-l1-stellar-classification",
    anchor: "fig-classification-spectra",
    number: 1,
    canonical: false,
    captionOverride:
      "**Recap:** Reuse of the same figure to anchor stellar classification.",
  },
];

const completeReferencingUnits = ["m4-l2-stellar-populations"];

const unusedEntry: FigureRegistryEntry = {
  name: "lonely-figure",
  src: "/figures/lonely.png",
  alt: "A figure registered in content/figures.ts but never called by any Unit.",
};

describe("FigureSpecContent — axe-core a11y", () => {
  test("renders complete entry (registry + usages + cross-refs) — zero violations", async () => {
    await renderAstroToBody(FigureSpecContent, {
      props: {
        entry: completeEntry,
        usages: completeUsages,
        referencingUnits: completeReferencingUnits,
      },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders registered-but-unused entry (zero usages, zero cross-refs) — zero violations", async () => {
    await renderAstroToBody(FigureSpecContent, {
      props: { entry: unusedEntry, usages: [], referencingUnits: [] },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(FigureSpecContent, {
      props: {
        entry: completeEntry,
        usages: completeUsages,
        referencingUnits: completeReferencingUnits,
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
