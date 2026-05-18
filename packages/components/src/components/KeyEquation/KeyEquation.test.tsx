import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
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
    expect(screen.getByText("g")).toBeInTheDocument();
    expect(screen.getByText(/9\.81 m\/s\^2/)).toBeInTheDocument();
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

  it("is axe-clean for the full Wien's-law render", async () => {
    const { container } = render(<KeyEquation refId='wiens-law' />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
