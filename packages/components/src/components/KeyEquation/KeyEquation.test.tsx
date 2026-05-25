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
    if (refId === "with-constants") {
      return {
        id: "with-constants",
        title: "Equation With Constants",
        tex: "F = m a",
        symbols: ["F", "m", "a"],
        constants: [{ symbol: "g", value: "9.81", unit: "m/s^2" }],
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

  it("renders constants strip from frontmatter when present", () => {
    render(<KeyEquation refId='with-constants' />);
    // Constants now render symbol + value + unit via KaTeX (<InlineTex>)
    // so plain-text matchers no longer see "g" or "9.81 m/s^2" — the
    // textContent is split across KaTeX-emitted spans. Assert on the
    // constants <dl> structure instead.
    const constantsList = screen.getByLabelText(
      "Constants for Equation With Constants"
    );
    expect(constantsList).toBeInTheDocument();
    // Symbol "g", value "9.81", and unit superscript appear in textContent
    // even though wrapped in KaTeX markup.
    expect(constantsList.textContent).toContain("g");
    expect(constantsList.textContent).toContain("9.81");
    // Unit rendered via KaTeX — confirms <InlineTex> path executed
    // (the regression test for the 2026-05-21 KeyEquation.tsx refactor
    // that swapped string interpolation for <InlineTex>).
    expect(constantsList.querySelector(".katex")).toBeInTheDocument();
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
