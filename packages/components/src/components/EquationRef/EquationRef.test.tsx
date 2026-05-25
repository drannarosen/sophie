import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock the store BEFORE importing the component so vitest's
// auto-hoist intercepts the resolution. Returns a small fixture
// of equations covering the tests below. Mirrors the
// GlossaryTerm.test.tsx mocking pattern.
vi.mock("./equations-store.ts", () => ({
  lookupEquation: (refId: string) => {
    if (refId === "inverse-square-law") {
      return {
        id: "inverse-square-law",
        title: "Inverse-Square Law",
        tex: "F = \\frac{L}{4\\pi d^2}",
        symbols: ["F", "L", "d"],
      };
    }
    if (refId === "wiens-law") {
      return {
        id: "wiens-law",
        title: "Wien's Law",
        tex: "\\lambda_{\\text{peak}} = b T^{-1}",
        symbols: ["T", "\\lambda_{\\text{peak}}"],
      };
    }
    return undefined;
  },
}));

import { EquationRef } from "./EquationRef.tsx";

describe("<EquationRef>", () => {
  // HoverCard's open-on-hover/focus interaction model isn't
  // reliably testable in JSDOM. The popover-open path is covered by
  // examples/smoke/e2e/eq-ref.spec.ts in a real browser. Here we
  // verify the surface that matters for unit-level confidence.

  it("renders an anchor with href=/equations/<id> when the refId resolves", () => {
    render(<EquationRef refId='inverse-square-law' />);
    const link = screen.getByRole("link", { name: /inverse-square law/i });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/equations/inverse-square-law");
  });

  it("decorates the trigger with a presentational Sigma icon (aria-hidden)", () => {
    render(<EquationRef refId='inverse-square-law' />);
    const link = screen.getByRole("link", { name: /inverse-square law/i });
    const svg = link.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  describe("dual rendering mode", () => {
    it("self-closing form renders the equation title from the registry entry", () => {
      render(<EquationRef refId='wiens-law' />);
      const link = screen.getByRole("link", { name: /wien's law/i });
      expect(link).toHaveTextContent("Wien's Law");
    });

    it("children-form renders the provided text verbatim", () => {
      render(<EquationRef refId='wiens-law'>Wien's law</EquationRef>);
      const link = screen.getByRole("link", { name: /wien's law/i });
      expect(link).toHaveTextContent("Wien's law");
    });
  });

  describe("miss fallback (no matching entry)", () => {
    it("renders children as plain prose with no anchor and no popover", () => {
      render(<EquationRef refId='nonexistent'>fake</EquationRef>);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("fake")).toBeInTheDocument();
    });

    it("warns in dev when no equation is found", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<EquationRef refId='nonexistent'>fake</EquationRef>);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/equationref.*nonexistent.*bare prose/i)
      );
      warn.mockRestore();
    });

    it("self-closing miss renders the refId as bare text (no anchor)", () => {
      const { container } = render(<EquationRef refId='nonexistent' />);
      expect(container.querySelector("a")).toBeNull();
      expect(container).toHaveTextContent("nonexistent");
    });
  });

  describe("accessibility", () => {
    it("is axe-clean for the self-closing form", async () => {
      const { container } = render(<EquationRef refId='inverse-square-law' />);
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it("is axe-clean for the children form", async () => {
      const { container } = render(
        <EquationRef refId='wiens-law'>Wien's law</EquationRef>
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe("hydration gate", () => {
    // Phase 1.5 class fix (2026-05-25). Same SSR-store-empty mismatch
    // as GlossaryTerm + KeyEquation: packed-copy consumers populate
    // the equation store AFTER island SSR. Without a gate, SSR emits
    // the bare fallback while client renders the full <a class="trigger">
    // → React #418. Gating render on `useHydrated()` defends the class.
    it("renders only the fallback at SSR even when refId resolves", () => {
      const html = renderToString(
        <EquationRef refId='inverse-square-law'>see the law</EquationRef>
      );
      expect(html).not.toMatch(/<a\b/i);
      expect(html).not.toMatch(/data-radix/i);
      expect(html).toContain("see the law");
    });

    it("self-closing form: SSR emits the refId as bare text (gate closed)", () => {
      const html = renderToString(<EquationRef refId='inverse-square-law' />);
      expect(html).not.toMatch(/<a\b/i);
      expect(html).toContain("inverse-square-law");
    });
  });

  describe("hydration signal", () => {
    it("sets data-react-hydrated=true on the trigger after mount", async () => {
      render(<EquationRef refId='inverse-square-law' />);
      const link = screen.getByRole("link");
      await waitFor(() => {
        expect(link).toHaveAttribute("data-react-hydrated", "true");
      });
    });
  });
});
