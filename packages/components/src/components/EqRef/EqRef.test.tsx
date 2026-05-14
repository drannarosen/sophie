import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

// Mock the store BEFORE importing the component so vitest's
// auto-hoist intercepts the resolution. Returns a small fixture
// of equations covering the tests below. Mirrors the
// GlossaryTerm.test.tsx mocking pattern.
vi.mock("./equations-store.ts", () => ({
  lookupEquation: (slug: string) => {
    if (slug === "inverse-square-law") {
      return {
        slug: "inverse-square-law",
        title: "Inverse-Square Law",
        number: 1,
        tex: "F = \\frac{L}{4\\pi d^2}",
        body: "<p>Flux falls off as the inverse square of the distance.</p>",
        chapter: "spoiler-alerts",
        anchor: "inverse-square-law",
      };
    }
    if (slug === "wiens-law") {
      return {
        slug: "wiens-law",
        title: "Wien's Law",
        number: 2,
        tex: "\\lambda_{\\text{peak}} = b T^{-1}",
        body: "<p>Peak wavelength of blackbody emission scales inversely with temperature.</p>",
        chapter: "spoiler-alerts",
        anchor: "wiens-law",
      };
    }
    return undefined;
  },
}));

import { EqRef } from "./EqRef.tsx";

describe("<EqRef>", () => {
  // HoverCard's open-on-hover/focus interaction model isn't
  // reliably testable in JSDOM (Radix listens for pointer events
  // that JSDOM doesn't fully synthesize). The popover-open path
  // is covered by examples/smoke/e2e/eq-ref.spec.ts in a real
  // browser. Here we verify the surface that matters for
  // unit-level confidence: trigger structure, render-mode
  // branching, accessibility, and graceful-fallback behavior.
  // Matches the GlossaryTerm.test.tsx precedent.

  // T16 — trigger structure (HoverCard.Root → Trigger asChild → <a>).
  it("renders an anchor with href=/chapters/<chapter>#<anchor> when the slug resolves", () => {
    render(<EqRef slug='inverse-square-law' />);
    const link = screen.getByRole("link", { name: /eq\. 1/i });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(
      "/chapters/spoiler-alerts#inverse-square-law"
    );
  });

  it("decorates the trigger with a presentational Sigma icon (aria-hidden)", () => {
    render(<EqRef slug='inverse-square-law' />);
    const link = screen.getByRole("link", { name: /eq\. 1/i });
    const svg = link.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  // T17 — dual rendering mode.
  describe("dual rendering mode (decision #13)", () => {
    it("self-closing form renders link text 'Eq. <number>' from the index entry", () => {
      render(<EqRef slug='wiens-law' />);
      const link = screen.getByRole("link", { name: /eq\. 2/i });
      expect(link).toHaveTextContent("Eq. 2");
    });

    it("children-form renders the provided text verbatim", () => {
      render(<EqRef slug='wiens-law'>Wien's law</EqRef>);
      // Use exact-match text matcher so we don't accidentally
      // pick up "Eq. 2" from the popover content.
      const link = screen.getByRole("link", { name: /wien's law/i });
      expect(link).toHaveTextContent("Wien's law");
      // And NOT the default fallback text.
      expect(link).not.toHaveTextContent("Eq. 2");
    });
  });

  // T18 — miss fallback.
  describe("miss fallback (no matching entry)", () => {
    it("renders children as plain prose with no anchor and no popover", () => {
      render(<EqRef slug='nonexistent'>fake</EqRef>);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("fake")).toBeInTheDocument();
    });

    it("warns in dev when no equation is found", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<EqRef slug='nonexistent'>fake</EqRef>);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/eqref.*nonexistent.*bare prose/i)
      );
      warn.mockRestore();
    });

    it("self-closing miss renders nothing visible (no children to fall back to)", () => {
      const { container } = render(<EqRef slug='nonexistent' />);
      expect(container.querySelector("a")).toBeNull();
    });
  });

  // T19 — axe-clean.
  describe("accessibility (T19)", () => {
    it("is axe-clean for the self-closing form", async () => {
      const { container } = render(<EqRef slug='inverse-square-law' />);
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it("is axe-clean for the children form", async () => {
      const { container } = render(<EqRef slug='wiens-law'>Wien's law</EqRef>);
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });
});
