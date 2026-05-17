import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, test } from "vitest";
import { ParameterCursor } from "./ParameterCursor.tsx";
import { ParameterSlider } from "./ParameterSlider.tsx";
import { useParameterStore } from "./store.ts";

function registerT(
  overrides: Partial<{ step: number | "log"; default: number }> = {}
) {
  useParameterStore.getState().register({
    name: "T",
    min: 1000,
    max: 50000,
    default: overrides.default ?? 5772,
    unit: "K",
    step: overrides.step,
  });
}

describe("<ParameterSlider>", () => {
  beforeEach(() => {
    useParameterStore.setState({ parameters: {}, values: {} });
  });

  test("renders nothing when the named cursor is not registered", () => {
    const { container } = render(
      <ParameterSlider name='ghost' label='Ghost' />
    );
    expect(container.textContent).toBe("");
  });

  test("renders the label and current value with the cursor's unit", () => {
    registerT();
    render(<ParameterSlider name='T' label='Temperature' />);
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText(/5772/)).toBeInTheDocument();
    expect(screen.getByText(/K/)).toBeInTheDocument();
  });

  test("the slider has aria attributes matching the cursor's range and value", () => {
    registerT();
    render(<ParameterSlider name='T' label='Temperature' />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "1000");
    expect(slider).toHaveAttribute("aria-valuemax", "50000");
    expect(slider).toHaveAttribute("aria-valuenow", "5772");
  });

  test("keyboard arrow keys move the slider and update the store (linear step)", () => {
    // Radix Slider snaps the displayed value to the step grid; pick a
    // step-aligned default so the step-by-step increments are direct.
    registerT({ step: 100, default: 5800 });
    render(<ParameterSlider name='T' label='Temperature' />);
    const slider = screen.getByRole("slider");
    slider.focus();
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(useParameterStore.getState().values.T).toBe(5900);
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(useParameterStore.getState().values.T).toBe(5700);
  });

  test("custom format prop overrides the default value readout", () => {
    registerT();
    render(
      <ParameterSlider
        name='T'
        label='Temperature'
        format={(v) => `${(v / 1000).toFixed(1)} kK`}
      />
    );
    expect(screen.getByText("5.8 kK")).toBeInTheDocument();
  });

  test("ariaLabel falls back to label if not provided", () => {
    registerT();
    render(<ParameterSlider name='T' label='Temperature' />);
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-label",
      "Temperature"
    );
  });

  test("ariaLabel can override the label for screen readers", () => {
    registerT();
    render(
      <ParameterSlider
        name='T'
        label='T'
        ariaLabel='Blackbody effective temperature in kelvin'
      />
    );
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-label",
      "Blackbody effective temperature in kelvin"
    );
  });

  test("integrates with <ParameterCursor> via the store (registration -> slider sees range)", () => {
    render(
      <>
        <ParameterCursor
          name='T'
          min={2500}
          max={10000}
          default={5000}
          unit='K'
        />
        <ParameterSlider name='T' label='Temperature' />
      </>
    );
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "2500");
    expect(slider).toHaveAttribute("aria-valuemax", "10000");
    expect(slider).toHaveAttribute("aria-valuenow", "5000");
  });

  test("axe-core: no accessibility violations", async () => {
    registerT();
    const { container } = render(
      <ParameterSlider name='T' label='Temperature' />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("log-stepped slider exposes log-space step but reports cursor-space value to AT", () => {
    registerT({ step: "log" });
    render(<ParameterSlider name='T' label='Temperature' />);
    const slider = screen.getByRole("slider");
    // aria-valuenow stays in user-facing (cursor) units regardless of
    // the slider's internal log-space mapping.
    expect(slider).toHaveAttribute("aria-valuenow", "5772");
    expect(slider).toHaveAttribute("aria-valuemin", "1000");
    expect(slider).toHaveAttribute("aria-valuemax", "50000");
  });
});
