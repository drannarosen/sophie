import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ResultCard } from "./ResultCard.tsx";
import type { SearchResult } from "./types.ts";

const baseFixture = {
  url: "/chapters/measuring-the-sky#term-luminosity",
  meta: {
    title: "luminosity",
    locator: "Measuring the sky · Foundations",
  },
  excerpt: "Total radiant power emitted by a body.",
  filters: { type: ["term"] as const },
};

describe("<ResultCard>", () => {
  it("renders type label and title for a term", () => {
    render(<ResultCard result={baseFixture as SearchResult} />);
    expect(screen.getByText("luminosity")).toBeInTheDocument();
    expect(screen.getByText(/term/i)).toBeInTheDocument();
  });

  it("renders the build-time prerendered html rich tail for equation results (ADR 0090)", () => {
    const equation: SearchResult = {
      ...baseFixture,
      meta: {
        ...baseFixture.meta,
        title: "Stefan-Boltzmann luminosity",
        tex: "L = 4\\pi R^2 \\sigma T^4",
        html: '<span class="katex">PRERENDERED_RESULT_MARKER</span>',
        slug: "stefan-boltzmann-luminosity",
        number: "12",
      },
      filters: { type: ["equation"] },
    };
    const { container } = render(<ResultCard result={equation} />);
    // The card renders `result.meta.html` (prerendered by renderMath at
    // build), not a runtime katex call. The unique marker proves the
    // html field is the source.
    expect(container.innerHTML).toContain("PRERENDERED_RESULT_MARKER");
  });

  it("renders length indicator for misconception results", () => {
    const misc: SearchResult = {
      ...baseFixture,
      meta: {
        ...baseFixture.meta,
        title: "Brighter ≠ hotter",
        length: "short",
        label: "Brighter ≠ hotter",
      },
      filters: { type: ["misconception"] },
    };
    render(<ResultCard result={misc} />);
    const badge = screen.getByText(/short note/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/length/i)
    );
  });

  it("renders locator (chapter · module)", () => {
    render(<ResultCard result={baseFixture as SearchResult} />);
    expect(
      screen.getByText("Measuring the sky · Foundations")
    ).toBeInTheDocument();
  });

  it("axe-core: zero a11y violations", async () => {
    // <ResultCard> renders <li role="option">; axe-core's
    // aria-required-parent rule mandates a listbox/group ancestor.
    // Wrap to mirror the production composition (<ResultList> owns
    // the role="listbox" container).
    // The <div role="listbox"> wrapper mirrors what <ResultList>
    // owns in production; testing <ResultCard> in isolation requires
    // it so axe-core's aria-required-parent rule is satisfied.
    const { container } = render(
      <div role='listbox' aria-label='Search results' tabIndex={0}>
        <ResultCard result={baseFixture as SearchResult} />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
