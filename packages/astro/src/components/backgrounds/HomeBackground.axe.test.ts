// @vitest-environment node
/**
 * axe-core a11y + no-JS-fallback test for `<HomeBackground>` (ADR 0097
 * #4/#5; ADR 0004 axe mandate). Chrome, role-less (ADR 0058).
 *
 * The Container API renders real SSR markup but does NOT execute the
 * bundled `<script>` — which is exactly the no-JS condition we want to
 * assert: the `.sky` CSS nebula-mesh ground and the (empty) `<canvas>`
 * are present in static markup, so the home is never a black void before
 * (or without) script. The starfield render loop itself is browser-only
 * and is covered at the smoke e2e layer (Task 7).
 *
 * a11y surface: the canvas is decorative → `aria-hidden`; the component
 * introduces no landmarks and no violations whether mounted alone or
 * composed inside a page `<main>`.
 */

import { afterEach, describe, expect, test } from "vitest";
import {
  renderAstroToBody,
  setupAxeDom,
} from "../../test-utils/container-axe.ts";
import HomeBackground from "./HomeBackground.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("HomeBackground — axe-core a11y + no-JS fallback", () => {
  test("default (no theme) renders the .sky fallback + aria-hidden canvas — zero violations", async () => {
    const html = await renderAstroToBody(HomeBackground, { props: {} });
    // No-JS fallback: the CSS nebula-mesh ground is present in static markup.
    expect(html).toContain("sophie-home-bg__sky");
    // The decorative canvas is aria-hidden.
    expect(html).toMatch(/<canvas[^>]*aria-hidden=["']?true/);
    expect(html).toContain('id="starfield"');
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("unknown theme id falls back to starfield — same markup, zero violations", async () => {
    const html = await renderAstroToBody(HomeBackground, {
      props: { theme: "does-not-exist" },
    });
    expect(html).toContain("sophie-home-bg__sky");
    expect(html).toContain('id="starfield"');
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark/duplicate-main violation", async () => {
    const results = (await renderAstroToBody(HomeBackground, {
      props: {},
      wrap: (inner) => `<main class="sophie-content">${inner}</main>`,
    }).then(() => axe(document.body))) as {
      violations: Array<{ id: string }>;
    };
    expect(results).toHaveNoViolations();
    expect(
      results.violations.find((v) => v.id === "landmark-no-duplicate-main")
    ).toBeUndefined();
  });
});
