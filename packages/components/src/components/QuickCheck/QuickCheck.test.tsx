import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Hint } from "../Hint/Hint.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { QuickCheck } from "./QuickCheck.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

/**
 * In MDX, the Sophie remark plugin injects `course`/`unit`/`parentId`
 * onto nested `<Solution>` / `<Hint>` children from the parent
 * `<QuickCheck>`'s `course`/`unit`/`id`. These unit tests bypass the
 * plugin and pass those props explicitly to mirror compiled output.
 */
describe("<QuickCheck>", () => {
  it("renders as a <section> with aria-labelledby pointing at the label heading", () => {
    const { container } = render(
      withProfile(
        <QuickCheck course='astr201' unit='m1-l2' id='qc-1'>
          <p>Body.</p>
        </QuickCheck>
      )
    );
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.getAttribute("aria-labelledby")).toBe("qc-1-label");
    const labelEl = container.querySelector("#qc-1-label");
    expect(labelEl?.textContent).toBe("Quick check");
  });

  it("emits data-pedagogy-role='quickcheck' and data-formative-anchor", () => {
    const { container } = render(
      withProfile(
        <QuickCheck course='c1' unit='u1' id='qc-2'>
          <p>Body.</p>
        </QuickCheck>
      )
    );
    const section = container.querySelector(
      '[data-pedagogy-role="quickcheck"]'
    );
    expect(section?.getAttribute("data-formative-anchor")).toBe("qc-2");
  });

  it("renders <QuickCheck.Prompt> compound child inside the section", () => {
    const { container } = render(
      withProfile(
        <QuickCheck course='c1' unit='u1' id='qc-3'>
          <QuickCheck.Prompt>
            <p>Why do nearer stars show larger parallax?</p>
          </QuickCheck.Prompt>
        </QuickCheck>
      )
    );
    expect(container.textContent).toContain("larger parallax");
  });

  it("renders nested <Solution> when its plugin-injected props are present", async () => {
    render(
      withProfile(
        <QuickCheck course='astr201' unit='m1-l2' id='qc-4'>
          <Solution course='astr201' unit='m1-l2' parentId='qc-4'>
            The answer.
          </Solution>
        </QuickCheck>
      )
    );
    expect(
      await screen.findByRole("button", { name: "Show solution" })
    ).toBeInTheDocument();
  });

  it("rejects missing `course`/`unit`/`id` props via the schema", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          // @ts-expect-error — runtime-invalid; schema parse throws
          <QuickCheck unit='u1' id='qc-bad'>
            <p>Body.</p>
          </QuickCheck>
        )
      )
    ).toThrow();
    spy.mockRestore();
  });

  it("has zero axe violations with nested Solution + Hint + Prompt", async () => {
    const { container } = render(
      withProfile(
        <QuickCheck course='astr201' unit='m1-l2' id='qc-axe'>
          <QuickCheck.Prompt>
            <p>Why do nearer stars show larger parallax?</p>
          </QuickCheck.Prompt>
          <Hint course='astr201' unit='m1-l2' parentId='qc-axe' number={1}>
            Think about the angle subtended.
          </Hint>
          <Solution course='astr201' unit='m1-l2' parentId='qc-axe'>
            <p>Closer objects subtend a larger angle.</p>
          </Solution>
        </QuickCheck>
      )
    );
    await screen.findByRole("button", { name: "Show solution" });
    await screen.findByRole("button", { name: "Hint 1" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
