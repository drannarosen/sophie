import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { FillBlank } from "./FillBlank.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<FillBlank>", () => {
  it("renders as a <section> with R10 landmark + data-formative-anchor", () => {
    const { container } = render(
      withProfile(
        <FillBlank course='astr201' unit='m1-l2' id='fb-1'>
          <FillBlank.Prompt>
            The x-axis is <FillBlank.Slot id='x' correct='temperature' />.
          </FillBlank.Prompt>
        </FillBlank>
      )
    );
    const section = container.querySelector(
      '[data-pedagogy-role="fill-blank"]'
    );
    expect(section?.tagName).toBe("SECTION");
    expect(section?.getAttribute("aria-labelledby")).toBe("fb-1-label");
    expect(section?.getAttribute("data-formative-anchor")).toBe("fb-1");
  });

  it("renders an inline text input per slot", async () => {
    render(
      withProfile(
        <FillBlank course='c1' unit='u1' id='fb-2'>
          <FillBlank.Prompt>
            <FillBlank.Slot id='x' correct='temperature' /> vs{" "}
            <FillBlank.Slot id='y' correct='luminosity' />
          </FillBlank.Prompt>
        </FillBlank>
      )
    );
    await waitFor(() => {
      expect(screen.getByLabelText("blank x")).toBeInTheDocument();
      expect(screen.getByLabelText("blank y")).toBeInTheDocument();
    });
  });

  it("typing into a slot persists the value", async () => {
    render(
      withProfile(
        <FillBlank course='c1' unit='u1' id='fb-3'>
          <FillBlank.Prompt>
            <FillBlank.Slot id='x' correct='temperature' />
          </FillBlank.Prompt>
        </FillBlank>
      )
    );
    const input = await screen.findByLabelText("blank x");
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: "temp" } });
    await waitFor(() => {
      expect(input).toHaveValue("temp");
    });
  });

  it("throws when two slots share the same id", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          <FillBlank course='c1' unit='u1' id='fb-dup'>
            <FillBlank.Prompt>
              <FillBlank.Slot id='x' correct='a' />
              <FillBlank.Slot id='x' correct='b' />
            </FillBlank.Prompt>
          </FillBlank>
        )
      )
    ).toThrow(/duplicate slot id/);
    spy.mockRestore();
  });

  it("rejects missing `course`/`unit`/`id` props via the schema", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        withProfile(
          // @ts-expect-error — runtime-invalid; schema parse throws
          <FillBlank unit='u1' id='fb-bad'>
            <FillBlank.Prompt>
              <FillBlank.Slot id='x' correct='a' />
            </FillBlank.Prompt>
          </FillBlank>
        )
      )
    ).toThrow();
    spy.mockRestore();
  });

  it("has zero axe violations with prompt slots + Solution", async () => {
    const { container } = render(
      withProfile(
        <FillBlank course='astr201' unit='m1-l2' id='fb-axe'>
          <FillBlank.Prompt>
            <p>
              The HR diagram plots{" "}
              <FillBlank.Slot id='x' correct='temperature' /> against{" "}
              <FillBlank.Slot id='y' correct='luminosity' />.
            </p>
          </FillBlank.Prompt>
          <Solution course='astr201' unit='m1-l2' parentId='fb-axe'>
            <p>Temperature (x, reversed) vs. luminosity (y).</p>
          </Solution>
        </FillBlank>
      )
    );
    await screen.findByLabelText("blank x");
    await screen.findByRole("button", { name: "Show solution" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
