import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { MCQ } from "./MCQ.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

/**
 * Tests pass `course`/`unit`/`id` directly; in MDX the remark plugin
 * injects `course`/`unit`/`parentId` onto nested `<Solution>` /
 * `<Hint>` children from the parent's `course`/`unit`/`id`.
 */
describe("<MCQ>", () => {
  it("renders as a <section> with R10 landmark + data-formative-anchor", () => {
    const { container } = render(
      withProfile(
        <MCQ course='astr201' unit='m1-l2' id='mcq-1'>
          <MCQ.Prompt>Pick one.</MCQ.Prompt>
          <MCQ.Choice>Alpha</MCQ.Choice>
          <MCQ.Choice correct>Beta</MCQ.Choice>
        </MCQ>
      )
    );
    const section = container.querySelector('[data-pedagogy-role="mcq"]');
    expect(section?.tagName).toBe("SECTION");
    expect(section?.getAttribute("aria-labelledby")).toBe("mcq-1-label");
    expect(section?.getAttribute("data-formative-anchor")).toBe("mcq-1");
  });

  it("renders each choice as a radio once hydrated", async () => {
    render(
      withProfile(
        <MCQ course='c1' unit='u1' id='mcq-2'>
          <MCQ.Prompt>Pick one.</MCQ.Prompt>
          <MCQ.Choice>Alpha</MCQ.Choice>
          <MCQ.Choice correct>Beta</MCQ.Choice>
          <MCQ.Choice>Gamma</MCQ.Choice>
        </MCQ>
      )
    );
    await waitFor(() => {
      expect(screen.getAllByRole("radio")).toHaveLength(3);
    });
  });

  it("selecting a choice persists (radio becomes checked)", async () => {
    render(
      withProfile(
        <MCQ course='c1' unit='u1' id='mcq-3'>
          <MCQ.Prompt>Pick one.</MCQ.Prompt>
          <MCQ.Choice>Alpha</MCQ.Choice>
          <MCQ.Choice correct>Beta</MCQ.Choice>
        </MCQ>
      )
    );
    const beta = await screen.findByRole("radio", { name: "Beta" });
    await waitFor(() => {
      expect(beta).not.toBeDisabled();
    });
    fireEvent.click(beta);
    await waitFor(() => {
      expect(beta).toHaveAttribute("data-state", "checked");
    });
  });

  it("marks the correct choice with data-correct='true'", async () => {
    render(
      withProfile(
        <MCQ course='c1' unit='u1' id='mcq-4'>
          <MCQ.Prompt>Pick one.</MCQ.Prompt>
          <MCQ.Choice>Alpha</MCQ.Choice>
          <MCQ.Choice correct>Beta</MCQ.Choice>
        </MCQ>
      )
    );
    const beta = await screen.findByRole("radio", { name: "Beta" });
    expect(beta).toHaveAttribute("data-correct", "true");
    const alpha = screen.getByRole("radio", { name: "Alpha" });
    expect(alpha).not.toHaveAttribute("data-correct");
  });

  it("throws when two choices slugify to the same value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          <MCQ course='c1' unit='u1' id='mcq-dup'>
            <MCQ.Choice>Same Text</MCQ.Choice>
            <MCQ.Choice correct>Same Text</MCQ.Choice>
          </MCQ>
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
          <MCQ unit='u1' id='mcq-bad'>
            <MCQ.Choice correct>Alpha</MCQ.Choice>
          </MCQ>
        )
      )
    ).toThrow();
    spy.mockRestore();
  });

  it("has zero axe violations with prompt + choices + Solution", async () => {
    const { container } = render(
      withProfile(
        <MCQ course='astr201' unit='m1-l2' id='mcq-axe'>
          <MCQ.Prompt>
            <p>Which process powers a main-sequence star?</p>
          </MCQ.Prompt>
          <MCQ.Choice>Gravitational contraction</MCQ.Choice>
          <MCQ.Choice correct>Hydrogen fusion</MCQ.Choice>
          <MCQ.Choice>Chemical burning</MCQ.Choice>
          <Solution course='astr201' unit='m1-l2' parentId='mcq-axe'>
            <p>Hydrogen fusion in the core.</p>
          </Solution>
        </MCQ>
      )
    );
    await screen.findByRole("radio", { name: "Hydrogen fusion" });
    await screen.findByRole("button", { name: "Show solution" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
