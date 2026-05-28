import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { MultiSelect } from "./MultiSelect.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<MultiSelect>", () => {
  it("renders as a <section> with R10 landmark + data-formative-anchor", () => {
    const { container } = render(
      withProfile(
        <MultiSelect course='astr201' unit='m1-l2' id='ms-1'>
          <MultiSelect.Prompt>Select all.</MultiSelect.Prompt>
          <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
          <MultiSelect.Choice>Jupiter</MultiSelect.Choice>
        </MultiSelect>
      )
    );
    const section = container.querySelector(
      '[data-pedagogy-role="multi-select"]'
    );
    expect(section?.tagName).toBe("SECTION");
    expect(section?.getAttribute("aria-labelledby")).toBe("ms-1-label");
    expect(section?.getAttribute("data-formative-anchor")).toBe("ms-1");
  });

  it("renders each choice as a checkbox once hydrated", async () => {
    render(
      withProfile(
        <MultiSelect course='c1' unit='u1' id='ms-2'>
          <MultiSelect.Prompt>Select all.</MultiSelect.Prompt>
          <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
          <MultiSelect.Choice>Jupiter</MultiSelect.Choice>
          <MultiSelect.Choice correct>Mars</MultiSelect.Choice>
        </MultiSelect>
      )
    );
    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    });
  });

  it("toggling a checkbox persists (becomes checked)", async () => {
    render(
      withProfile(
        <MultiSelect course='c1' unit='u1' id='ms-3'>
          <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
          <MultiSelect.Choice>Jupiter</MultiSelect.Choice>
        </MultiSelect>
      )
    );
    const mercury = await screen.findByRole("checkbox", { name: "Mercury" });
    await waitFor(() => {
      expect(mercury).not.toBeDisabled();
    });
    fireEvent.click(mercury);
    await waitFor(() => {
      expect(mercury).toHaveAttribute("data-state", "checked");
    });
  });

  it("marks correct choices with data-correct='true'", () => {
    const { container } = render(
      withProfile(
        <MultiSelect course='c1' unit='u1' id='ms-4'>
          <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
          <MultiSelect.Choice>Jupiter</MultiSelect.Choice>
          <MultiSelect.Choice correct>Mars</MultiSelect.Choice>
        </MultiSelect>
      )
    );
    expect(container.querySelectorAll('[data-correct="true"]')).toHaveLength(2);
  });

  it("throws when two choices slugify to the same value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          <MultiSelect course='c1' unit='u1' id='ms-dup'>
            <MultiSelect.Choice correct>Same Text</MultiSelect.Choice>
            <MultiSelect.Choice>Same Text</MultiSelect.Choice>
          </MultiSelect>
        )
      )
    ).toThrow(/duplicate choice slug/);
    spy.mockRestore();
  });

  it("rejects missing `course`/`unit`/`id` props via the schema", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          // @ts-expect-error — runtime-invalid; schema parse throws
          <MultiSelect unit='u1' id='ms-bad'>
            <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
          </MultiSelect>
        )
      )
    ).toThrow();
    spy.mockRestore();
  });

  it("has zero axe violations with prompt + choices + Solution", async () => {
    const { container } = render(
      withProfile(
        <MultiSelect course='astr201' unit='m1-l2' id='ms-axe'>
          <MultiSelect.Prompt>
            <p>Which of these are terrestrial planets?</p>
          </MultiSelect.Prompt>
          <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
          <MultiSelect.Choice>Jupiter</MultiSelect.Choice>
          <MultiSelect.Choice correct>Mars</MultiSelect.Choice>
          <Solution course='astr201' unit='m1-l2' parentId='ms-axe'>
            <p>Mercury and Mars are rocky.</p>
          </Solution>
        </MultiSelect>
      )
    );
    await screen.findByRole("checkbox", { name: "Mercury" });
    await screen.findByRole("button", { name: "Show solution" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
