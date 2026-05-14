import { fireEvent, render, screen } from "@testing-library/react";
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

  it("opens the popover on trigger click and shows the definition body", () => {
    render(<GlossaryTerm name='Standard candle'>candle</GlossaryTerm>);
    // Popover closed initially — content not in DOM yet.
    expect(
      screen.queryByText("An object whose intrinsic luminosity is known.")
    ).toBeNull();

    const link = screen.getByRole("link", { name: /candle/i });
    fireEvent.click(link);

    // Popover content now in DOM with the rendered body HTML.
    expect(
      screen.getByText(/an object whose intrinsic luminosity/i)
    ).toBeInTheDocument();
  });

  it("popover header shows the canonical term", () => {
    render(<GlossaryTerm name='Standard candle'>candle</GlossaryTerm>);
    fireEvent.click(screen.getByRole("link", { name: /candle/i }));
    // The canonical term ("Standard candle" capitalized) appears
    // in the popover header, regardless of the inline prose
    // (which says "candle").
    const popover = document.querySelector("[data-sophie-glossary-popover]");
    expect(popover).not.toBeNull();
    expect(popover?.textContent).toContain("Standard candle");
  });

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

  it("is axe-clean (open popover state)", async () => {
    const { container } = render(
      <GlossaryTerm name='Parallax'>parallax</GlossaryTerm>
    );
    fireEvent.click(screen.getByRole("link", { name: /parallax/i }));
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
});
