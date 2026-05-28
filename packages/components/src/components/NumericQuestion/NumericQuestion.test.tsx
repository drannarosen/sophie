import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { NumericQuestion } from "./NumericQuestion.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<NumericQuestion>", () => {
  it("renders as a <section> with R10 landmark + data-formative-anchor", () => {
    const { container } = render(
      withProfile(
        <NumericQuestion course='astr201' unit='m1-l2' id='nq-1'>
          <NumericQuestion.Prompt>Compute T.</NumericQuestion.Prompt>
          <NumericQuestion.Answer
            value={8}
            tolerance={0.1}
            toleranceKind='relative'
            unit='yr'
          />
        </NumericQuestion>
      )
    );
    const section = container.querySelector(
      '[data-pedagogy-role="numeric-question"]'
    );
    expect(section?.tagName).toBe("SECTION");
    expect(section?.getAttribute("aria-labelledby")).toBe("nq-1-label");
    expect(section?.getAttribute("data-formative-anchor")).toBe("nq-1");
  });

  it("renders a single text input and nothing for <NumericQuestion.Answer>", () => {
    render(
      withProfile(
        <NumericQuestion course='c1' unit='u1' id='nq-2'>
          <NumericQuestion.Prompt>Compute T.</NumericQuestion.Prompt>
          <NumericQuestion.Answer
            value={8}
            tolerance={0}
            toleranceKind='absolute'
          />
        </NumericQuestion>
      )
    );
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(1);
    // The Answer child renders nothing — its value is not in the DOM.
    expect(screen.queryByText("8")).toBeNull();
  });

  it("typing into the input persists the value", async () => {
    render(
      withProfile(
        <NumericQuestion course='c1' unit='u1' id='nq-3'>
          <NumericQuestion.Answer
            value={8}
            tolerance={0}
            toleranceKind='absolute'
          />
        </NumericQuestion>
      )
    );
    const input = await screen.findByRole("textbox", { name: "Your answer" });
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: "8 yr" } });
    await waitFor(() => {
      expect(input).toHaveValue("8 yr");
    });
  });

  it("rejects missing `course`/`unit`/`id` props via the schema", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          // @ts-expect-error — runtime-invalid; schema parse throws
          <NumericQuestion unit='u1' id='nq-bad'>
            <NumericQuestion.Answer
              value={1}
              tolerance={0}
              toleranceKind='absolute'
            />
          </NumericQuestion>
        )
      )
    ).toThrow();
    spy.mockRestore();
  });

  it("has zero axe violations with prompt + answer + Solution", async () => {
    const { container } = render(
      withProfile(
        <NumericQuestion course='astr201' unit='m1-l2' id='nq-axe'>
          <NumericQuestion.Prompt>
            <p>Compute the orbital period T of a planet at a = 4 AU.</p>
          </NumericQuestion.Prompt>
          <NumericQuestion.Answer
            value={8}
            tolerance={0.1}
            toleranceKind='relative'
            unit='yr'
          />
          <Solution course='astr201' unit='m1-l2' parentId='nq-axe'>
            <p>T = 4^(3/2) = 8 years.</p>
          </Solution>
        </NumericQuestion>
      )
    );
    await screen.findByRole("textbox", { name: "Your answer" });
    await screen.findByRole("button", { name: "Show solution" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
