import type { Biography } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BiographySummary } from "./EquationRef.biography-summary.tsx";

const emptyBiography: Biography = {
  assumptions: [],
  units: [],
  common_misuses: [],
  derivation_steps: [],
};

describe("<BiographySummary>", () => {
  it("renders nothing when biography is undefined (per-equation opt-in)", () => {
    const { container } = render(<BiographySummary biography={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when biography is fully empty (no assumptions, no misuses, no typed assumption)", () => {
    const { container } = render(
      <BiographySummary biography={emptyBiography} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("singularizes 'assumption' (1) vs 'assumptions' (>1)", () => {
    const { rerender } = render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [{ body: "x", epistemicRole: "assumption" }],
        }}
      />
    );
    expect(screen.getByText("1 assumption")).toBeInTheDocument();

    rerender(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [
            { body: "x", epistemicRole: "assumption" },
            { body: "y", epistemicRole: "assumption" },
          ],
        }}
      />
    );
    expect(screen.getByText("2 assumptions")).toBeInTheDocument();
  });

  it("singularizes 'misuse' (1) vs 'misuses' (>1)", () => {
    const { rerender } = render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          common_misuses: [{ body: "x" }],
        }}
      />
    );
    expect(screen.getByText("1 misuse")).toBeInTheDocument();

    rerender(
      <BiographySummary
        biography={{
          ...emptyBiography,
          common_misuses: [{ body: "x" }, { body: "y" }, { body: "z" }],
        }}
      />
    );
    expect(screen.getByText("3 misuses")).toBeInTheDocument();
  });

  it("joins assumption + misuse counts with · separator", () => {
    render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [
            { body: "a", epistemicRole: "assumption" },
            { body: "b", epistemicRole: "assumption" },
          ],
          common_misuses: [{ body: "x" }],
        }}
      />
    );
    expect(screen.getByText("2 assumptions · 1 misuse")).toBeInTheDocument();
  });

  it("renders 'valid in: <type>' from the first typed assumption", () => {
    render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [
            {
              body: "x",
              type: "thermal-equilibrium",
              epistemicRole: "assumption",
            },
          ],
        }}
      />
    );
    expect(screen.getByText(/valid in:/)).toBeInTheDocument();
    expect(screen.getByText("thermal-equilibrium")).toBeInTheDocument();
  });

  it("skips 'valid in:' when no assumption has a `type` slot filled", () => {
    render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [
            { body: "x", epistemicRole: "assumption" },
            { body: "y", epistemicRole: "assumption" },
          ],
        }}
      />
    );
    expect(screen.queryByText(/valid in:/)).not.toBeInTheDocument();
    expect(screen.getByText("2 assumptions")).toBeInTheDocument();
  });

  it("uses the FIRST assumption that has a type, not an arbitrary one", () => {
    render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [
            // No type — should be skipped
            { body: "x", epistemicRole: "assumption" },
            // First typed → used
            { body: "y", type: "blackbody", epistemicRole: "assumption" },
            // Later typed → not used
            {
              body: "z",
              type: "thermal-equilibrium",
              epistemicRole: "assumption",
            },
          ],
        }}
      />
    );
    expect(screen.getByText("blackbody")).toBeInTheDocument();
    expect(screen.queryByText("thermal-equilibrium")).not.toBeInTheDocument();
  });

  it("renders only 'valid in:' when there's a typed assumption but no other counts (e.g. one untyped is omitted from count? no — assumptions count includes typed too)", () => {
    // Single typed assumption: count surfaces as "1 assumption" AND
    // the type renders as "valid in: <type>" — both signals stay because
    // the count tells you HOW MANY and the type tells you WHICH.
    render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [
            {
              body: "x",
              type: "thermal-equilibrium",
              epistemicRole: "assumption",
            },
          ],
        }}
      />
    );
    expect(screen.getByText("1 assumption")).toBeInTheDocument();
    expect(screen.getByText(/valid in:/)).toBeInTheDocument();
  });

  it("exposes data-sophie-equation-biography for E2E hooks", () => {
    const { container } = render(
      <BiographySummary
        biography={{
          ...emptyBiography,
          assumptions: [{ body: "x", epistemicRole: "assumption" }],
        }}
      />
    );
    expect(
      container.querySelector("[data-sophie-equation-biography]")
    ).not.toBeNull();
  });
});
