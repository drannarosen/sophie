import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Hint } from "../Hint/Hint.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { PracticeProblem } from "./PracticeProblem.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

/**
 * In MDX, the Sophie remark plugin injects `course`/`unit`/`parentId`
 * onto nested `<Solution>` and `<Hint>` children from the parent
 * `<PracticeProblem>`'s `course`/`unit`/`id`. These unit tests bypass
 * the plugin and pass those props explicitly to mirror what compiled
 * output looks like at render time.
 */
describe("<PracticeProblem>", () => {
  it("renders as a <section> with aria-labelledby pointing at the label heading", () => {
    const { container } = render(
      withProfile(
        <PracticeProblem course='astr201' unit='m1-l2' id='pp-1'>
          <p>Body.</p>
        </PracticeProblem>
      )
    );
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    const labelledBy = section?.getAttribute("aria-labelledby");
    expect(labelledBy).toBe("pp-1-label");
    const labelEl = container.querySelector("#pp-1-label");
    expect(labelEl).not.toBeNull();
    expect(labelEl?.textContent).toBe("Practice problem");
  });

  it("emits data-pedagogy-role='practice-problem' and data-formative-anchor", () => {
    const { container } = render(
      withProfile(
        <PracticeProblem course='c1' unit='u1' id='pp-2'>
          <p>Body.</p>
        </PracticeProblem>
      )
    );
    const section = container.querySelector(
      '[data-pedagogy-role="practice-problem"]'
    );
    expect(section).not.toBeNull();
    expect(section?.getAttribute("data-formative-anchor")).toBe("pp-2");
  });

  it("renders nested <Solution> when its plugin-injected props are present", async () => {
    render(
      withProfile(
        <PracticeProblem course='astr201' unit='m1-l2' id='pp-3'>
          <Solution course='astr201' unit='m1-l2' parentId='pp-3'>
            The answer.
          </Solution>
        </PracticeProblem>
      )
    );
    expect(
      await screen.findByRole("button", { name: "Show solution" })
    ).toBeInTheDocument();
  });

  it("renders nested <Hint> when its plugin-injected props are present", async () => {
    render(
      withProfile(
        <PracticeProblem course='astr201' unit='m1-l2' id='pp-4'>
          <Hint course='astr201' unit='m1-l2' parentId='pp-4' number={1}>
            Start here.
          </Hint>
        </PracticeProblem>
      )
    );
    expect(
      await screen.findByRole("button", { name: "Hint 1" })
    ).toBeInTheDocument();
  });

  it("renders <PracticeProblem.Prompt> compound child inside the section", () => {
    const { container } = render(
      withProfile(
        <PracticeProblem course='c1' unit='u1' id='pp-5'>
          <PracticeProblem.Prompt>
            <p>Compute T.</p>
          </PracticeProblem.Prompt>
        </PracticeProblem>
      )
    );
    expect(container.textContent).toContain("Compute T.");
  });

  it("rejects missing `course`/`unit`/`id` props via the schema", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          // @ts-expect-error — runtime-invalid; schema refine throws
          <PracticeProblem unit='u1' id='pp-bad'>
            <p>Body.</p>
          </PracticeProblem>
        )
      )
    ).toThrow();
    spy.mockRestore();
  });

  it("nested <Solution> with matching parentId toggles open on click", async () => {
    render(
      withProfile(
        <PracticeProblem course='astr201' unit='m1-l2' id='pp-toggle'>
          <Solution course='astr201' unit='m1-l2' parentId='pp-toggle'>
            The answer.
          </Solution>
        </PracticeProblem>
      )
    );
    const trigger = await screen.findByRole("button", {
      name: "Show solution",
    });
    await waitFor(() => {
      expect(trigger).not.toBeDisabled();
    });
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("data-state", "open");
    });
  });

  it("has zero axe violations with nested Solution + Hint + Prompt", async () => {
    const { container } = render(
      withProfile(
        <PracticeProblem course='astr201' unit='m1-l2' id='pp-axe'>
          <PracticeProblem.Prompt>
            <p>Compute T given a = 1 AU.</p>
          </PracticeProblem.Prompt>
          <Hint course='astr201' unit='m1-l2' parentId='pp-axe' number={1}>
            Apply Kepler's third law.
          </Hint>
          <Solution course='astr201' unit='m1-l2' parentId='pp-axe'>
            <p>T = 1 year.</p>
          </Solution>
        </PracticeProblem>
      )
    );
    await screen.findByRole("button", { name: "Show solution" });
    await screen.findByRole("button", { name: "Hint 1" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
