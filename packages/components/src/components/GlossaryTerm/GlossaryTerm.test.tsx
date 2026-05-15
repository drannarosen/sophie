import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

// Mock the store BEFORE importing the component so vitest's
// auto-hoist intercepts the resolution. Returns a small fixture
// of definitions covering the tests below.
vi.mock("./definitions-store.ts", () => ({
  lookupDefinition: (slug: string) => {
    if (slug === "standard-candle") {
      return {
        term: "Standard candle",
        slug: "standard-candle",
        body: "<p>An object whose intrinsic luminosity is known.</p>",
        chapter: "spoiler-alerts",
        anchor: "standard-candle",
      };
    }
    if (slug === "parallax") {
      return {
        term: "Parallax",
        slug: "parallax",
        body: "<p>Apparent shift of a star against background.</p>",
        chapter: "spoiler-alerts",
        anchor: "parallax",
      };
    }
    return undefined;
  },
}));

import { GlossaryTerm } from "./GlossaryTerm.tsx";

describe("<GlossaryTerm>", () => {
  it("renders children inside an anchor when the term resolves", () => {
    render(<GlossaryTerm name='Standard candle'>standard candle</GlossaryTerm>);
    const link = screen.getByRole("link", { name: /standard candle/i });
    expect(link.tagName).toBe("A");
    expect(link).toHaveTextContent("standard candle");
  });

  it("links the trigger to /chapters/<chapter>#<anchor>", () => {
    render(<GlossaryTerm name='Standard candle'>candle</GlossaryTerm>);
    const link = screen.getByRole("link", { name: /candle/i });
    expect(link.getAttribute("href")).toBe(
      "/chapters/spoiler-alerts#standard-candle"
    );
  });

  it("resolves the name via slugify (handles case + whitespace)", () => {
    render(<GlossaryTerm name='standard CANDLE'>candle</GlossaryTerm>);
    const link = screen.getByRole("link", { name: /candle/i });
    expect(link.getAttribute("href")).toBe(
      "/chapters/spoiler-alerts#standard-candle"
    );
  });

  // HoverCard's open-on-hover/focus interaction model isn't
  // reliably testable in JSDOM (Radix listens for pointer events
  // that JSDOM doesn't fully synthesize). The popover-open path
  // is covered by examples/smoke/e2e/glossary-term.spec.ts in a
  // real browser. Here we verify the surface that matters for
  // unit-level confidence: trigger structure, accessibility, and
  // graceful-fallback behavior.

  it("renders bare children (no anchor, no popover) when the term is undefined", () => {
    render(<GlossaryTerm name='Unknown term'>unknown</GlossaryTerm>);
    // No anchor wrapping the children.
    expect(screen.queryByRole("link")).toBeNull();
    // But the prose text still renders.
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });

  it("warns in dev when a term is undefined", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<GlossaryTerm name='Mystery term'>?</GlossaryTerm>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/glossaryterm.*mystery term.*undefined/i)
    );
    warn.mockRestore();
  });

  it("is axe-clean (closed state)", async () => {
    const { container } = render(
      <GlossaryTerm name='Parallax'>parallax</GlossaryTerm>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("decorates the trigger with a presentational icon (aria-hidden)", () => {
    render(<GlossaryTerm name='Parallax'>parallax</GlossaryTerm>);
    const link = screen.getByRole("link", { name: /parallax/i });
    // Lucide icons render as SVGs with aria-hidden by default
    // when used as decoration; we apply size styling but no
    // accessible name (the anchor text is the name).
    const svg = link.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  // E2E hydration signal (followup #10). The trigger anchor flips
  // `data-react-hydrated="true"` after `useEffect` runs. Playwright
  // waits on this attribute before hovering, replacing the unreliable
  // `networkidle` wait. SSR pass should NOT carry the attribute.
  it("sets data-react-hydrated=true on the trigger after mount", async () => {
    render(<GlossaryTerm name='Parallax'>parallax</GlossaryTerm>);
    const link = screen.getByRole("link", { name: /parallax/i });
    await waitFor(() => {
      expect(link).toHaveAttribute("data-react-hydrated", "true");
    });
  });
});

describe("GlossaryTerm first-use footnote", () => {
  it("renders no footnote when data-first-use is absent", () => {
    render(<GlossaryTerm name='Parallax'>parallax</GlossaryTerm>);
    expect(screen.queryByTestId("glossary-footnote")).not.toBeInTheDocument();
  });

  it("renders inline footnote span when data-first-use='true'", () => {
    render(
      <GlossaryTerm name='Parallax' data-first-use='true'>
        parallax
      </GlossaryTerm>
    );
    const footnote = screen.getByTestId("glossary-footnote");
    expect(footnote).toBeInTheDocument();
    expect(footnote).toHaveClass("sophie-glossary-footnote");
    // Definition body comes from definitions-store lookup; pin that it
    // is non-empty for a known fixture term seeded by the mock above.
    expect(footnote.textContent ?? "").not.toBe("");
  });

  it("renders nothing extra when data-first-use is 'false' or unrecognised", () => {
    render(
      <GlossaryTerm name='Parallax' data-first-use='false'>
        parallax
      </GlossaryTerm>
    );
    expect(screen.queryByTestId("glossary-footnote")).not.toBeInTheDocument();
  });
});
