import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Tab, Tabs } from "./Tabs.tsx";

describe("<Tabs> (chrome primitive)", () => {
  it("renders one trigger per <Tab> child", () => {
    render(
      <Tabs>
        <Tab label='Spectra'>spectra body</Tab>
        <Tab label='Composition'>composition body</Tab>
      </Tabs>
    );
    expect(screen.getByRole("tab", { name: "Spectra" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Composition" })
    ).toBeInTheDocument();
  });

  it("derives Radix value from slugified label (visible via trigger id suffix)", () => {
    render(
      <Tabs>
        <Tab label='Line spectra'>body</Tab>
      </Tabs>
    );
    const trigger = screen.getByRole("tab", { name: "Line spectra" });
    // Radix encodes the value into the trigger's id as
    // `radix-<scope>-trigger-<value>`. The value is the slug.
    expect(trigger.id).toMatch(/trigger-line-spectra$/);
  });

  it("opens the tab matching defaultLabel", () => {
    render(
      <Tabs defaultLabel='Composition'>
        <Tab label='Spectra'>spectra body</Tab>
        <Tab label='Composition'>composition body</Tab>
      </Tabs>
    );
    const compositionTab = screen.getByRole("tab", { name: "Composition" });
    expect(compositionTab.getAttribute("data-state")).toBe("active");
    expect(screen.getByText("composition body")).toBeVisible();
  });

  it("falls back to first tab when defaultLabel is omitted", () => {
    render(
      <Tabs>
        <Tab label='First'>first body</Tab>
        <Tab label='Second'>second body</Tab>
      </Tabs>
    );
    const firstTab = screen.getByRole("tab", { name: "First" });
    expect(firstTab.getAttribute("data-state")).toBe("active");
  });

  it("throws at render when two labels slugify to the same value", () => {
    // Suppress React's error-boundary console noise — the throw itself
    // is what the test asserts.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <Tabs>
          <Tab label='Line spectra'>a</Tab>
          <Tab label='Line!Spectra'>b</Tab>
        </Tabs>
      )
    ).toThrow(/duplicate tab slug "line-spectra"/);
    spy.mockRestore();
  });

  it("focusing a trigger activates its panel (Radix automatic activation)", () => {
    render(
      <Tabs>
        <Tab label='One'>panel one</Tab>
        <Tab label='Two'>panel two</Tab>
      </Tabs>
    );
    // Radix Tabs defaults to activationMode="automatic" — focusing a
    // trigger activates the corresponding panel. Click + keyboard
    // arrow nav both route through this focus path in real browsers;
    // in jsdom we exercise the focus path directly.
    const twoTab = screen.getByRole("tab", { name: "Two" });
    fireEvent.focus(twoTab);
    expect(twoTab).toHaveAttribute("data-state", "active");
  });

  it("emits one tablist with role-tab triggers for every <Tab>", () => {
    render(
      <Tabs>
        <Tab label='A'>panel a body</Tab>
        <Tab label='B'>panel b body</Tab>
        <Tab label='C'>panel c body</Tab>
      </Tabs>
    );
    // Radix renders one tablist; tabs not bound to the active value
    // are unmounted (mount-on-activate), so we assert via the tablist
    // contents.
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("applies the `id` prop to the root element", () => {
    const { container } = render(
      <Tabs id='my-tabs'>
        <Tab label='X'>body</Tab>
      </Tabs>
    );
    expect(container.firstElementChild?.id).toBe("my-tabs");
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <Tabs>
        <Tab label='Spectra'>
          <p>Line spectra arise from quantized atomic transitions.</p>
        </Tab>
        <Tab label='Composition'>
          <p>Absorption-line strength encodes elemental abundance.</p>
        </Tab>
      </Tabs>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
