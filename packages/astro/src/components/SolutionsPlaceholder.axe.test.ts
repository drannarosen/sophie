// @vitest-environment node
/**
 * axe-core a11y test for `<SolutionsPlaceholder>` (Task 7; ADR 0004 / R11
 * mandate). The placeholder is the gated branch of the `/solutions` route
 * (ADR 0096): it renders when a chapter's worked solutions exist but have
 * not yet passed their resolved reveal date.
 *
 * Container API + jest-axe via the shared `container-axe` helper (same
 * pattern as the `Course*` axe tests). The component is self-contained —
 * no layout composition, no module-singleton seeding — so it tests
 * directly without `beforeEach` state setup.
 *
 * Three scenarios:
 *   1. dated state — `date` set; "unlock on <date>" copy with a <time>
 *      element,
 *   2. unscheduled state — `date={null}`; the "not yet scheduled" copy,
 *   3. composed-into-`<main>` regression guard (R10) — the placeholder
 *      ships a labelled `<section aria-labelledby>` (NOT `<main>`), so
 *      wrapping it in the production `<main>` parent must NOT raise
 *      `landmark-no-duplicate-main`, and the region must keep its
 *      accessible name.
 */

import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import SolutionsPlaceholder from "./SolutionsPlaceholder.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SolutionsPlaceholder — axe-core a11y", () => {
  test("dated state — zero violations", async () => {
    await renderAstroToBody(SolutionsPlaceholder, {
      props: { date: "2027-02-20" },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("unscheduled state (date=null) — zero violations", async () => {
    await renderAstroToBody(SolutionsPlaceholder, {
      props: { date: null },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no duplicate-main, region keeps its name (R10)", async () => {
    await renderAstroToBody(SolutionsPlaceholder, {
      props: { date: "2027-02-20" },
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
    // R10 — the region's accessible name comes from the labelling heading.
    const region = document.querySelector(
      ".sophie-solutions-placeholder"
    ) as HTMLElement | null;
    expect(region?.tagName).toBe("SECTION");
    const labelledBy = region?.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy ?? "")?.textContent).toContain(
      "Solutions not yet available"
    );
  });
});
