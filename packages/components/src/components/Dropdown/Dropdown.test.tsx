import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Dropdown } from "./Dropdown.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<Dropdown> (chrome primitive)", () => {
  it("renders the single-item shorthand with one trigger", () => {
    render(
      withProfile(
        <Dropdown course='c1' unit='u1' id='dd-1' label='Deep Dive: Hydrogen'>
          The red glow comes from H-alpha at 656.3 nm.
        </Dropdown>
      )
    );
    expect(
      screen.getByRole("button", { name: "Deep Dive: Hydrogen" })
    ).toBeInTheDocument();
  });

  it("renders multi-item form with one trigger per <Dropdown.Item>", () => {
    render(
      withProfile(
        <Dropdown course='c1' unit='u1' id='dd-2'>
          <Dropdown.Item label='Spectra'>Spectra body.</Dropdown.Item>
          <Dropdown.Item label='Composition'>Composition body.</Dropdown.Item>
        </Dropdown>
      )
    );
    expect(screen.getByRole("button", { name: "Spectra" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Composition" })
    ).toBeInTheDocument();
  });

  it("starts collapsed when defaultOpen is omitted", () => {
    render(
      withProfile(
        <Dropdown course='c1' unit='u1' id='dd-3' label='Deep Dive'>
          body
        </Dropdown>
      )
    );
    const trigger = screen.getByRole("button", { name: "Deep Dive" });
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("respects defaultOpen on first render (single-item form)", async () => {
    render(
      withProfile(
        <Dropdown
          course='c1'
          unit='u1'
          id='dd-4'
          label='Deep Dive'
          defaultOpen={["deep-dive"]}
        >
          body
        </Dropdown>
      )
    );
    const trigger = screen.getByRole("button", { name: "Deep Dive" });
    await waitFor(() => {
      expect(trigger).toHaveAttribute("data-state", "open");
    });
  });

  it("clicking a trigger opens the item (single-mode default)", async () => {
    render(
      withProfile(
        <Dropdown course='c1' unit='u1' id='dd-5'>
          <Dropdown.Item label='A'>body a</Dropdown.Item>
          <Dropdown.Item label='B'>body b</Dropdown.Item>
        </Dropdown>
      )
    );
    const aTrigger = screen.getByRole("button", { name: "A" });
    // Wait for hydration so controlProps no longer disable the trigger.
    await waitFor(() => {
      expect(aTrigger).not.toBeDisabled();
    });
    fireEvent.click(aTrigger);
    await waitFor(() => {
      expect(aTrigger).toHaveAttribute("data-state", "open");
    });
  });

  it("single mode closes the previously-open item when another opens", async () => {
    render(
      withProfile(
        <Dropdown course='c1' unit='u1' id='dd-6' defaultOpen={["a"]}>
          <Dropdown.Item label='A'>body a</Dropdown.Item>
          <Dropdown.Item label='B'>body b</Dropdown.Item>
        </Dropdown>
      )
    );
    const aTrigger = screen.getByRole("button", { name: "A" });
    const bTrigger = screen.getByRole("button", { name: "B" });
    await waitFor(() => {
      expect(aTrigger).toHaveAttribute("data-state", "open");
    });
    await waitFor(() => {
      expect(bTrigger).not.toBeDisabled();
    });
    fireEvent.click(bTrigger);
    await waitFor(() => {
      expect(bTrigger).toHaveAttribute("data-state", "open");
    });
    expect(aTrigger).toHaveAttribute("data-state", "closed");
  });

  it("allowMultiple keeps multiple items open simultaneously", async () => {
    render(
      withProfile(
        <Dropdown
          course='c1'
          unit='u1'
          id='dd-7'
          allowMultiple
          defaultOpen={["a", "b"]}
        >
          <Dropdown.Item label='A'>body a</Dropdown.Item>
          <Dropdown.Item label='B'>body b</Dropdown.Item>
        </Dropdown>
      )
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "A" })).toHaveAttribute(
        "data-state",
        "open"
      );
    });
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute(
      "data-state",
      "open"
    );
  });

  it("throws when single-item shorthand mixes with <Dropdown.Item> children", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          <Dropdown course='c1' unit='u1' id='dd-8' label='Outer'>
            <Dropdown.Item label='Inner'>oops</Dropdown.Item>
          </Dropdown>
        )
      )
    ).toThrow(/cannot mix the `label` shorthand/);
    spy.mockRestore();
  });

  it("throws when two item labels slugify to the same value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          <Dropdown course='c1' unit='u1' id='dd-9'>
            <Dropdown.Item label='Line spectra'>a</Dropdown.Item>
            <Dropdown.Item label='Line!Spectra'>b</Dropdown.Item>
          </Dropdown>
        )
      )
    ).toThrow(/duplicate item slug "line-spectra"/);
    spy.mockRestore();
  });

  it("has zero axe violations (single-item, closed)", async () => {
    const { container } = render(
      withProfile(
        <Dropdown course='c1' unit='u1' id='dd-axe-1' label='Deep Dive'>
          <p>Body prose.</p>
        </Dropdown>
      )
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations (multi-item, two open)", async () => {
    const { container } = render(
      withProfile(
        <Dropdown
          course='c1'
          unit='u1'
          id='dd-axe-2'
          allowMultiple
          defaultOpen={["one", "two"]}
        >
          <Dropdown.Item label='One'>
            <p>One body.</p>
          </Dropdown.Item>
          <Dropdown.Item label='Two'>
            <p>Two body.</p>
          </Dropdown.Item>
        </Dropdown>
      )
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
