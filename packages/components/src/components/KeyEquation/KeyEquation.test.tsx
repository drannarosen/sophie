import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock the registry store BEFORE importing the component. Mirrors the
// EquationRef.test pattern; KeyEquation now resolves entry data via
// `lookupEquation(refId)` at render time.
vi.mock("../EquationRef/equations-store.ts", () => ({
  lookupEquation: (refId: string) => {
    if (refId === "wiens-law") {
      return {
        id: "wiens-law",
        title: "Wien's Law",
        tex: "\\lambda_{peak} = b T^{-1}",
        html: '<span class="katex">PRIMARY_HTML_MARKER</span>',
        speech: "lambda sub peak equals b times T to the negative 1 power",
        symbols: ["T", "\\lambda_{peak}"],
        biography: {
          observable: {
            body: "Peak wavelength of thermal emission.",
            epistemicRole: "observable",
          },
          assumptions: [
            {
              body: "LTE applies.",
              type: "thermal-equilibrium",
              epistemicRole: "assumption",
            },
          ],
          units: [],
          common_misuses: [
            {
              body: "Absorption-line spectra.",
              misconception: "wiens-law-absorption-spectra",
            },
          ],
          derivation_steps: [
            { body: "Start from Planck's law.", epistemicRole: "model" },
          ],
        },
      };
    }
    if (refId === "with-related") {
      return {
        id: "with-related",
        title: "Equation With Related",
        tex: "x = 1",
        html: '<span class="katex">x=1</span>',
        symbols: ["x"],
        related: [
          {
            refId: "stefan-boltzmann",
            kind: "see-also",
            description: "Companion thermal law.",
          },
        ],
      };
    }
    if (refId === "with-rearranged") {
      return {
        id: "with-rearranged",
        title: "Equation With Rearranged Forms",
        tex: "x = y + z",
        html: '<span class="katex">x=y+z</span>',
        symbols: ["x", "y", "z"],
        rearranged_forms: [
          {
            tex: "y = x - z",
            solves_for: "y",
            html: '<span class="katex">REARRANGED_HTML_MARKER</span>',
          },
        ],
      };
    }
    if (refId === "with-constants") {
      return {
        id: "with-constants",
        title: "Equation With Constants",
        tex: "F = m a",
        html: '<span class="katex">F=ma</span>',
        symbols: ["F", "m", "a"],
        constants: [
          {
            symbol: "g",
            value: "9.81",
            unit: "m/s^2",
            symbol_html: '<span class="katex">SYMBOL_HTML_MARKER</span>',
            value_html: '<span class="katex">VALUE_HTML_MARKER</span>',
            unit_html: '<span class="katex">UNIT_HTML_MARKER</span>',
          },
        ],
      };
    }
    return undefined;
  },
}));

import { KeyEquation } from "./KeyEquation.tsx";

describe("<KeyEquation> (ADR 0060 registry-shaped)", () => {
  it("renders the registry entry's title as the section landmark name", () => {
    render(<KeyEquation refId='wiens-law' />);
    const region = screen.getByRole("region", { name: "Wien's Law" });
    expect(region).toBeInTheDocument();
  });

  it("sets the outer DOM id to the registry entry id (hash-anchor support)", () => {
    const { container } = render(<KeyEquation refId='wiens-law' />);
    expect(container.querySelector("#wiens-law")).not.toBeNull();
  });

  it("renders biography Observable / Assumption / CommonMisuse cards from the registry entry", () => {
    render(<KeyEquation refId='wiens-law' />);
    expect(screen.getByText(/Observable\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Assumption \(thermal-equilibrium\)\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/Common misuse\./)).toBeInTheDocument();
  });

  it("renders the derivation accordion COLLAPSED by default", () => {
    const { container } = render(<KeyEquation refId='wiens-law' />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("renders the derivation accordion EXPANDED when showDerivation is true", () => {
    const { container } = render(
      <KeyEquation refId='wiens-law' showDerivation />
    );
    const details = container.querySelector("details");
    expect(details?.hasAttribute("open")).toBe(true);
  });

  it("renders related-equations footer by default", () => {
    render(<KeyEquation refId='with-related' />);
    expect(screen.getByText(/Related:/)).toBeInTheDocument();
    expect(screen.getByText("stefan-boltzmann")).toBeInTheDocument();
  });

  it("suppresses related-equations footer when hideRelated is set", () => {
    render(<KeyEquation refId='with-related' hideRelated />);
    expect(screen.queryByText(/Related:/)).not.toBeInTheDocument();
  });

  it("renders the primary equation from the build-time prerendered html (ADR 0090)", () => {
    const { container } = render(<KeyEquation refId='wiens-law' />);
    // The component consumes `entry.html` (prerendered at build by
    // renderMath) verbatim — it does not re-render from `entry.tex`
    // at runtime. The unique marker proves the html prop is the source.
    expect(container.innerHTML).toContain("PRIMARY_HTML_MARKER");
  });

  it("labels the primary equation with build-time SRE speech (ADR 0089)", () => {
    render(<KeyEquation refId='wiens-law' />);
    // The container holding the prerendered html (output:"html", no inner
    // <math>) gets role="math" + the build-computed speech as its
    // accessible name — a screen reader reads the expression instead of
    // the aria-hidden .katex-html glyphs.
    const mathEl = screen.getByRole("math", {
      name: "lambda sub peak equals b times T to the negative 1 power",
    });
    expect(mathEl).toBeInTheDocument();
    expect(mathEl.innerHTML).toContain("PRIMARY_HTML_MARKER");
  });

  it("omits role=math/aria-label when the entry carries no speech", () => {
    // `with-related` mock has html but no speech.
    render(<KeyEquation refId='with-related' />);
    expect(screen.queryByRole("math")).not.toBeInTheDocument();
  });

  it("renders rearranged forms from each form's prerendered html (ADR 0090)", () => {
    const { container } = render(<KeyEquation refId='with-rearranged' />);
    expect(screen.getByText(/Rearranged forms/)).toBeInTheDocument();
    expect(container.innerHTML).toContain("REARRANGED_HTML_MARKER");
  });

  it("renders constants from prerendered symbol/value/unit html (ADR 0090)", () => {
    const { container } = render(<KeyEquation refId='with-constants' />);
    const constantsList = screen.getByLabelText(
      "Constants for Equation With Constants"
    );
    expect(constantsList).toBeInTheDocument();
    // Symbol, value, and unit each render their own build-time
    // prerendered html (renderMath) — not a runtime katex call.
    expect(container.innerHTML).toContain("SYMBOL_HTML_MARKER");
    expect(container.innerHTML).toContain("VALUE_HTML_MARKER");
    expect(container.innerHTML).toContain("UNIT_HTML_MARKER");
  });

  it("renders chapter framing prose at the top when children are provided", () => {
    render(
      <KeyEquation refId='wiens-law'>
        <p>Chapter-specific framing prose for this equation.</p>
      </KeyEquation>
    );
    expect(
      screen.getByText("Chapter-specific framing prose for this equation.")
    ).toBeInTheDocument();
  });

  it("miss fallback: renders framing prose only when refId doesn't resolve", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <KeyEquation refId='nonexistent'>
        <p>fallback content</p>
      </KeyEquation>
    );
    expect(screen.getByText("fallback content")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/keyequation.*nonexistent/i)
    );
    warn.mockRestore();
  });

  // Hydration-gate regression (Phase 1.5 evidence, 2026-05-25). Same
  // class of bug as GlossaryTerm: packed-copy consumers (e.g. astr201)
  // populate the equation store AFTER island SSR. SSR sees empty store
  // → bare <astro-slot>framing prose</astro-slot>; client first render
  // sees the script-tag-auto-hydrated store → full <section> card.
  // Same component, two tree shapes → React #418 (×3 on astr201's
  // lecture-02 reading page). Gating render on `useHydrated()` forces
  // SSR + first client render to emit only the framing prose
  // regardless of store state; the full card appears post-mount.
  it("renders only framing prose at SSR even when refId resolves (useHydrated gate)", () => {
    const html = renderToString(
      <KeyEquation refId='wiens-law'>
        <p>SSR framing prose for the equation.</p>
      </KeyEquation>
    );
    // SSR snapshot must not contain the post-hydration <section> card
    // or its <header>/<dl>/<details> sub-machinery — only the children.
    expect(html).not.toMatch(/<section\b/i);
    expect(html).not.toMatch(/<header\b/i);
    expect(html).not.toMatch(/<details\b/i);
    expect(html).toContain("SSR framing prose for the equation.");
  });

  it("is axe-clean for the full Wien's-law render", async () => {
    const { container } = render(<KeyEquation refId='wiens-law' />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
