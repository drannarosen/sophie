import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { renderToString } from "react-dom/server";
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
        unit: "spoiler-alerts",
        anchor: "standard-candle",
      };
    }
    if (slug === "parallax") {
      return {
        term: "Parallax",
        slug: "parallax",
        body: "<p>Apparent shift of a star against background.</p>",
        unit: "spoiler-alerts",
        anchor: "parallax",
      };
    }
    // Fixture with an author-emitted multi-block body — heading,
    // list, blockquote — for the stripWrappingParagraph block-tag
    // coverage regression test below. Bodies this shape are rare
    // but possible; the defense matters.
    if (slug === "block-rich") {
      return {
        term: "Block-rich",
        slug: "block-rich",
        body: "<p><h3>Heading inside</h3><ul><li>one</li><li>two</li></ul><blockquote>quoted</blockquote>tail text.</p>",
        unit: "spoiler-alerts",
        anchor: "block-rich",
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

  it("links the trigger to /units/<chapter>/reading#<anchor> (W2/D5 route shape)", () => {
    render(<GlossaryTerm name='Standard candle'>candle</GlossaryTerm>);
    const link = screen.getByRole("link", { name: /candle/i });
    expect(link.getAttribute("href")).toBe(
      "/units/spoiler-alerts/reading#standard-candle"
    );
  });

  it("resolves the name via slugify (handles case + whitespace)", () => {
    render(<GlossaryTerm name='standard CANDLE'>candle</GlossaryTerm>);
    const link = screen.getByRole("link", { name: /candle/i });
    expect(link.getAttribute("href")).toBe(
      "/units/spoiler-alerts/reading#standard-candle"
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

  // Hydration-gate regression (Phase 1.5 evidence, 2026-05-25). Packed-
  // copy consumers (e.g. astr201) populate the pedagogy store AFTER
  // island SSR — the SSR pass sees an empty store and emits the bare
  // fallback, while the client's first render sees the auto-hydrated
  // store and emits the full <a>+popover tree. Same component, two
  // tree shapes → React #418 hydration mismatch (×12 on astr201's
  // lecture-02 reading page). Gating render on `useHydrated()` forces
  // SSR + first client render to emit the same bare children
  // regardless of store state; the full tree appears only after the
  // mount-effect flips the gate. Defends the whole class.
  it("renders bare children at SSR even when the term resolves (useHydrated gate)", () => {
    const html = renderToString(
      <GlossaryTerm name='Parallax'>parallax</GlossaryTerm>
    );
    // SSR snapshot must not contain the post-hydration <a class="trigger">,
    // nor any Radix HoverCard wiring (Popper, etc.) — only the children.
    expect(html).not.toMatch(/<a\b/i);
    expect(html).not.toMatch(/data-radix/i);
    expect(html).toContain("parallax");
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

  /**
   * Regression test for the chapter-prose paragraph-split bug
   * (verify pass 2026-05-20): the footnote `<span>` lives INSIDE the
   * chapter's MDX `<p>`, so the injected definition body must not
   * contain a block-level `<p>` of its own. If it does, the browser
   * auto-closes the parent paragraph and hoists the inner `<p>` to
   * top level — splitting the surrounding sentence across multiple
   * paragraphs. Test asserts the footnote's innerHTML carries the
   * definition's text/inline content but DOES NOT contain a `<p>`
   * tag (it should be stripped from the body wrapper before injection).
   */
  it("strips wrapping <p> from the definition body so it stays inline-safe", () => {
    render(
      <GlossaryTerm name='Parallax' data-first-use='true'>
        parallax
      </GlossaryTerm>
    );
    const footnote = screen.getByTestId("glossary-footnote");
    // The body fixture is "<p>Apparent shift of a star...</p>".
    // After stripping, the visible text is preserved but no <p> tag
    // remains in the inline footnote span.
    expect(footnote.innerHTML).not.toMatch(/<p[\s>]/i);
    expect(footnote.textContent).toContain("Apparent shift");
  });

  /**
   * Defensive coverage for additional block-level tags inside a
   * one-paragraph-wrapped body — headings, lists, blockquotes, etc.
   * Same Bug 1 failure mode as the wrapping `<p>` test above: if any
   * block element survives into the inline footnote span, the
   * browser hoists it out of the parent chapter paragraph, splitting
   * the surrounding sentence.
   */
  it("strips nested block elements (h*, ul/ol/li, blockquote) from the footnote body", () => {
    render(
      <GlossaryTerm name='Block-rich' data-first-use='true'>
        block-rich
      </GlossaryTerm>
    );
    const footnote = screen.getByTestId("glossary-footnote");
    // No surviving block-level tags in the inline span. (Tag-only
    // pattern; we tolerate the unwrapped text content.)
    expect(footnote.innerHTML).not.toMatch(
      /<(p|div|section|article|figure|h[1-6]|ul|ol|li|blockquote|pre|table|hr)[\s>]/i
    );
    // Inner text survives the unwrap (heading text + list items +
    // blockquote text + tail).
    expect(footnote.textContent).toContain("Heading inside");
    expect(footnote.textContent).toContain("one");
    expect(footnote.textContent).toContain("two");
    expect(footnote.textContent).toContain("quoted");
    expect(footnote.textContent).toContain("tail text");
  });
});
