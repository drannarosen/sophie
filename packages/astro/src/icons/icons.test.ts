import { describe, expect, it } from "vitest";
import * as icons from "./index";

/**
 * Shape-smoke for the icon surface in `packages/astro/src/icons/`.
 *
 * Catches two regressions cheaply:
 *
 *  1. `lucide-static` ever changes its export shape (e.g. PascalCase
 *     becomes camelCase, or strings become objects). The chrome
 *     primitives consume these via Astro's `<Fragment set:html={...} />`
 *     pattern, which needs a string. A test fails BEFORE the build.
 *
 *  2. A bespoke icon accidentally ships malformed SVG (e.g. lost the
 *     outer `<svg>` wrapper during an edit). Without this, the
 *     malformed SVG would render as visible markup text in the
 *     toolbar — survivable but ugly.
 *
 * Not a behavioral test of how icons render; that lives in the
 * primitive components' Playwright e2e suites.
 */

describe("icons surface", () => {
  const expectedLucideReexports = ["Menu", "Sun", "Moon", "SunMoon", "X"];
  const expectedBespoke = [
    "ViewModeDefault",
    "ViewModeFocused",
    "ViewModeWide",
  ];

  for (const name of expectedLucideReexports) {
    it(`re-exports Lucide \`${name}\` as an SVG string`, () => {
      const value = (icons as Record<string, unknown>)[name];
      expect(typeof value).toBe("string");
      // `.trim()` because lucide-static pretty-prints with a leading
      // newline; we care about substantive shape, not whitespace.
      expect((value as string).trim()).toMatch(/^<svg/);
      expect(value as string).toContain('viewBox="0 0 24 24"');
    });
  }

  for (const name of expectedBespoke) {
    it(`exports bespoke \`${name}\` as a 24x24 SVG string`, () => {
      const value = (icons as Record<string, unknown>)[name];
      expect(typeof value).toBe("string");
      expect((value as string).trim()).toMatch(/^<svg/);
      expect(value as string).toContain('viewBox="0 0 24 24"');
      // Bespoke icons must match Lucide's stroke convention so they
      // sit flush with re-exported neighbors in the toolbar.
      expect(value as string).toContain('stroke="currentColor"');
      expect(value as string).toContain('stroke-width="2"');
      expect(value as string).toContain('fill="none"');
    });
  }
});
