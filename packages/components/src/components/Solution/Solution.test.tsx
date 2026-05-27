import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "./Solution.tsx";

/**
 * `<Solution>` requires explicit `course`/`unit`/`parentId` props per the
 * compile-time-threading design (see Solution.schema.ts). The Sophie
 * remark plugin injects these from the wrapping formative parent when
 * MDX compiles. Tests pass them directly — there is no provider to
 * wrap with.
 */
const ns = { course: "astr201", unit: "m1-l2" };

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<Solution>", () => {
  it("renders the default 'Show solution' trigger label", async () => {
    render(
      withProfile(
        <Solution {...ns} parentId='sol-1'>
          The answer is 42.
        </Solution>
      )
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Show solution" })
      ).toBeInTheDocument();
    });
  });

  it("clicking the trigger expands and flips the label to 'Hide solution'", async () => {
    render(
      withProfile(
        <Solution {...ns} parentId='sol-2'>
          The answer is 42.
        </Solution>
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
      expect(
        screen.getByRole("button", { name: "Hide solution" })
      ).toHaveAttribute("data-state", "open");
    });
  });

  it("custom `label` prop overrides both states", async () => {
    render(
      withProfile(
        <Solution {...ns} parentId='sol-3' label='View answer'>
          The answer is 42.
        </Solution>
      )
    );
    const trigger = await screen.findByRole("button", { name: "View answer" });
    await waitFor(() => {
      expect(trigger).not.toBeDisabled();
    });
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("data-state", "open");
    });
    // Custom label stays put across state transitions.
    expect(trigger).toHaveTextContent("View answer");
  });

  it("renders KaTeX-like math children without stripping them", async () => {
    const { container } = render(
      withProfile(
        <Solution {...ns} parentId='sol-4'>
          <span className='katex'>E = mc^2</span>
        </Solution>
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
      expect(container.querySelector(".katex")).not.toBeNull();
    });
  });

  it("renders standalone (no provider wrapper) — props are the sole source of namespace", async () => {
    // The compile-time-threading design means `<Solution>` has no
    // context dependency: given valid props, it renders regardless of
    // ancestor wrappers. This guards against any future re-introduction
    // of a context lookup that would re-couple the components.
    render(
      <Solution course='c1' unit='u1' parentId='standalone'>
        body
      </Solution>
    );
    expect(
      await screen.findByRole("button", { name: "Show solution" })
    ).toBeInTheDocument();
  });

  it("emits the sophie-reveal class on the root for print-mode auto-expand", () => {
    const { container } = render(
      withProfile(
        <Solution {...ns} parentId='sol-5'>
          body
        </Solution>
      )
    );
    expect(container.querySelector(".sophie-reveal")).not.toBeNull();
  });

  it("emits data-pedagogy-role='solution' on the root", () => {
    const { container } = render(
      withProfile(
        <Solution {...ns} parentId='sol-6'>
          body
        </Solution>
      )
    );
    expect(
      container.querySelector('[data-pedagogy-role="solution"]')
    ).not.toBeNull();
  });

  it("has zero axe violations (closed)", async () => {
    const { container } = render(
      withProfile(
        <Solution {...ns} parentId='sol-7'>
          body
        </Solution>
      )
    );
    await screen.findByRole("button", { name: "Show solution" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations (open)", async () => {
    const { container } = render(
      withProfile(
        <Solution {...ns} parentId='sol-8'>
          <p>Body prose.</p>
        </Solution>
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
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
