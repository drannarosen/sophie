import { fireEvent, render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, test } from "vitest";
import { useParameterStore } from "../../interactive/store.ts";
import { BlackbodyExplorer } from "./BlackbodyExplorer.tsx";

describe("<BlackbodyExplorer>", () => {
  beforeEach(() => {
    useParameterStore.setState({ parameters: {}, values: {} });
  });

  test("mounts with default Sun-like initial state and renders all four role-tagged sections", () => {
    render(<BlackbodyExplorer id='story' />);

    // Slider control
    expect(screen.getByRole("slider")).toBeInTheDocument();

    // Each role surfaces as a region with data-epistemic-role
    expect(
      document.querySelector('[data-epistemic-role="model"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-epistemic-role="observable"]')
    ).not.toBeNull();
    expect(
      document.querySelectorAll('[data-epistemic-role="inference"]').length
    ).toBeGreaterThanOrEqual(1);
    expect(
      document.querySelector('[data-epistemic-role="approximation"]')
    ).not.toBeNull();
  });

  test("inference readouts display Sun values at T=5772 K", () => {
    render(<BlackbodyExplorer id='sun' initialTemperatureK={5772} />);

    // Wien peak: 502 nm
    expect(screen.getByTestId("wien-peak-readout").textContent).toMatch(/502/);
    // Spectral classification: G2
    expect(screen.getByTestId("classification-readout").textContent).toMatch(
      /G2/
    );
    // Stefan-Boltzmann flux: ~6.3e10 (scientific notation, any reasonable format)
    expect(screen.getByTestId("flux-readout").textContent).toMatch(
      /6\.[23]\d?.*10/
    );
  });

  test("readouts update when the slider value changes (via store)", () => {
    const { rerender } = render(<BlackbodyExplorer id='probe' />);
    // Find the cursor's actual store key (section-scoped) and bump it
    const params = useParameterStore.getState().parameters;
    const tKey = Object.keys(params).find((k) => k.endsWith(":T") || k === "T");
    expect(tKey).toBeDefined();
    if (!tKey) return;

    useParameterStore.getState().setValue(tKey, 10000);
    rerender(<BlackbodyExplorer id='probe' />);

    expect(screen.getByTestId("classification-readout").textContent).toMatch(
      /^B|^A/
    );
  });

  test("solar-anchor button resets T to 5772 K", () => {
    render(<BlackbodyExplorer id='reset' initialTemperatureK={20000} />);
    // Confirm pre-reset: classification is B (T=20000)
    expect(screen.getByTestId("classification-readout").textContent).toMatch(
      /B\d/
    );
    // Click reset
    fireEvent.click(screen.getByRole("button", { name: /reset to.*sun/i }));
    expect(screen.getByTestId("classification-readout").textContent).toMatch(
      /G2/
    );
  });

  test("approximation toggle shows/hides the Rayleigh-Jeans overlay", () => {
    render(<BlackbodyExplorer id='approx' showApproximations={true} />);
    const rjToggle = screen.getByRole("checkbox", { name: /rayleigh.?jeans/i });
    expect(rjToggle).not.toBeChecked();
    fireEvent.click(rjToggle);
    expect(rjToggle).toBeChecked();
    // Validity-domain hint should surface when the overlay is on
    expect(screen.getByText(/long wavelength|λ.*≫/i)).toBeInTheDocument();
  });

  test("can hide the approximations entirely via prop", () => {
    render(<BlackbodyExplorer id='no-approx' showApproximations={false} />);
    expect(
      screen.queryByRole("checkbox", { name: /rayleigh.?jeans/i })
    ).toBeNull();
  });

  test("color swatch renders with a chromaticity reflecting current T", () => {
    // The swatch sets a CSS custom property `--swatch-color` rather than
    // the resolved background-color directly, so style-modules can theme
    // around it. Check the variable rather than the resolved property
    // (jsdom doesn't apply CSS rules anyway).
    render(<BlackbodyExplorer id='color' initialTemperatureK={3000} />);
    const swatch = screen.getByTestId("color-swatch");
    expect(swatch.style.getPropertyValue("--swatch-color")).toMatch(/rgb\(/);
  });

  test("axe-core: no accessibility violations on a fully-rendered figure", async () => {
    const { container } = render(<BlackbodyExplorer id='a11y' />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("epistemic-role data attributes are exactly the four expected values", () => {
    render(<BlackbodyExplorer id='roles' />);
    const roles = Array.from(
      document.querySelectorAll("[data-epistemic-role]")
    ).map((el) => el.getAttribute("data-epistemic-role"));
    const unique = new Set(roles);
    expect(unique).toEqual(
      new Set(["model", "observable", "inference", "approximation"])
    );
  });

  test("multiple instances on the same page have independent cursors", () => {
    // BlackbodyExplorer renders its own <section id={id}>, so the
    // consumer doesn't need to wrap it — the explorer is self-scoping.
    render(
      <>
        <BlackbodyExplorer id='bb-A' initialTemperatureK={3000} />
        <BlackbodyExplorer id='bb-B' initialTemperatureK={20000} />
      </>
    );
    const params = useParameterStore.getState().parameters;
    expect(params["bb-A:T"]).toBeDefined();
    expect(params["bb-B:T"]).toBeDefined();

    const sectionA = document.getElementById("bb-A") as HTMLElement;
    const sectionB = document.getElementById("bb-B") as HTMLElement;
    expect(
      within(sectionA).getByTestId("classification-readout").textContent
    ).toMatch(/^M\d/);
    expect(
      within(sectionB).getByTestId("classification-readout").textContent
    ).toMatch(/^B\d/);
  });
});
