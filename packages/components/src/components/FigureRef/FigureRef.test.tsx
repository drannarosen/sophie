import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

// Mock the two stores BEFORE importing the component so vitest's
// auto-hoist intercepts the resolution. Fixture covers both the
// happy paths (registry + canonical resolve) and the miss path.
// Mirrors the EquationRef.test.tsx mocking pattern.
vi.mock("./figure-registry-store.ts", () => ({
  lookupFigureRegistry: (name: string) => {
    if (name === "cosmic-distance-ladder") {
      return {
        name: "cosmic-distance-ladder",
        src: "/images/cosmic-distance-ladder.svg",
        alt: "Schematic of the cosmic distance ladder.",
        caption: "The cosmic distance ladder.",
      };
    }
    if (name === "m51-optical-radio") {
      return {
        name: "m51-optical-radio",
        src: "/images/m51.png",
        alt: "Side-by-side optical and radio images of M51.",
        // No registry caption — exercises the registry.name fallback.
      };
    }
    if (name === "lonely-registry") {
      // Registry exists but no usage will be returned by the
      // canonical helper; exercises the partial-miss path.
      return {
        name: "lonely-registry",
        src: "/images/lonely.png",
        alt: "Lonely.",
      };
    }
    return undefined;
  },
}));

vi.mock("./figure-usages-store.ts", () => ({
  lookupCanonicalUsageByName: (name: string) => {
    if (name === "cosmic-distance-ladder") {
      return {
        name: "cosmic-distance-ladder",
        unit: "spoiler-alerts",
        anchor: "fig-cosmic-distance-ladder",
        number: 1,
        canonical: true,
      };
    }
    if (name === "m51-optical-radio") {
      return {
        name: "m51-optical-radio",
        unit: "galaxies",
        anchor: "fig-m51",
        number: 4,
        canonical: false,
        captionOverride: "Optical vs. radio — same galaxy.",
      };
    }
    return undefined;
  },
}));

import { FigureRef } from "./FigureRef.tsx";

describe("<FigureRef>", () => {
  // HoverCard's open-on-hover/focus interaction model isn't
  // reliably testable in JSDOM (Radix listens for pointer events
  // that JSDOM doesn't fully synthesize). The popover-open path
  // is covered by e2e in a real browser. Here we verify the
  // surface that matters for unit-level confidence: trigger
  // structure, render-mode branching, accessibility, and
  // graceful-fallback behavior. Matches the EquationRef.test.tsx
  // precedent.

  // T33 — trigger structure (HoverCard.Root → Trigger asChild → <a>).
  it("renders an anchor with href=/units/<unit>/reading#<anchor> when registry + canonical resolve (W2/D5 route shape)", () => {
    render(<FigureRef name='cosmic-distance-ladder' />);
    const link = screen.getByRole("link", { name: /fig\. 1/i });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(
      "/units/spoiler-alerts/reading#fig-cosmic-distance-ladder"
    );
  });

  it("decorates the trigger with a presentational ImageIcon (aria-hidden)", () => {
    render(<FigureRef name='cosmic-distance-ladder' />);
    const link = screen.getByRole("link", { name: /fig\. 1/i });
    const svg = link.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  // T34 — dual rendering mode.
  describe("dual rendering mode (decision #13)", () => {
    it("self-closing form renders link text 'Fig. <number>' from the canonical usage", () => {
      render(<FigureRef name='m51-optical-radio' />);
      const link = screen.getByRole("link", { name: /fig\. 4/i });
      expect(link).toHaveTextContent("Fig. 4");
    });

    it("children-form renders the provided text verbatim", () => {
      render(<FigureRef name='m51-optical-radio'>this comparison</FigureRef>);
      const link = screen.getByRole("link", { name: /this comparison/i });
      expect(link).toHaveTextContent("this comparison");
      // And NOT the default fallback text.
      expect(link).not.toHaveTextContent("Fig. 4");
    });
  });

  // T35 — miss fallback.
  describe("miss fallback (no matching entry)", () => {
    it("renders children as plain prose with no anchor and no popover when both stores miss", () => {
      render(<FigureRef name='nonexistent'>fake</FigureRef>);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("fake")).toBeInTheDocument();
    });

    it("renders bare prose when registry resolves but no canonical usage exists", () => {
      // 'lonely-registry' has a registry entry but the usages-store
      // mock returns undefined — partial-miss case.
      render(<FigureRef name='lonely-registry'>orphan</FigureRef>);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("orphan")).toBeInTheDocument();
    });

    it("warns in dev when registry or usages are missing", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<FigureRef name='nonexistent'>fake</FigureRef>);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/figureref.*nonexistent.*bare prose/i)
      );
      warn.mockRestore();
    });

    it("self-closing miss renders nothing visible (no children to fall back to)", () => {
      const { container } = render(<FigureRef name='nonexistent' />);
      expect(container.querySelector("a")).toBeNull();
    });
  });

  // T36 — axe-clean.
  describe("accessibility (T36)", () => {
    it("is axe-clean for the self-closing form", async () => {
      const { container } = render(<FigureRef name='cosmic-distance-ladder' />);
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it("is axe-clean for the children form", async () => {
      const { container } = render(
        <FigureRef name='m51-optical-radio'>M51 comparison</FigureRef>
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  // E2E hydration signal (followup #10). The trigger anchor flips
  // `data-react-hydrated="true"` after `useEffect` runs; Playwright
  // waits on this attribute before hovering, replacing the
  // unreliable `networkidle` wait.
  describe("hydration signal", () => {
    it("sets data-react-hydrated=true on the trigger after mount", async () => {
      render(<FigureRef name='cosmic-distance-ladder' />);
      const link = screen.getByRole("link");
      await waitFor(() => {
        expect(link).toHaveAttribute("data-react-hydrated", "true");
      });
    });
  });
});
