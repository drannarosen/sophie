import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Hint } from "./Hint.tsx";

/**
 * `<Hint>` requires explicit `course`/`unit`/`parentId` props per the
 * compile-time-threading design (see Hint.schema.ts). The Sophie
 * remark plugin injects these from the wrapping formative parent at
 * MDX compile. Tests pass them directly.
 */
const ns = { course: "astr201", unit: "m1-l2" };

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<Hint>", () => {
  it("renders the default 'Hint 1' trigger label for number=1", async () => {
    render(
      withProfile(
        <Hint {...ns} parentId='hint-1' number={1}>
          Apply Kepler's third law.
        </Hint>
      )
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Hint 1" })
      ).toBeInTheDocument();
    });
  });

  it("uses the number in the default label (number=2 → 'Hint 2')", async () => {
    render(
      withProfile(
        <Hint {...ns} parentId='hint-num-2' number={2}>
          Square both sides.
        </Hint>
      )
    );
    expect(
      await screen.findByRole("button", { name: "Hint 2" })
    ).toBeInTheDocument();
  });

  it("clicking the trigger expands and reveals the body", async () => {
    render(
      withProfile(
        <Hint {...ns} parentId='hint-click' number={1}>
          Apply Kepler's third law.
        </Hint>
      )
    );
    const trigger = await screen.findByRole("button", { name: "Hint 1" });
    await waitFor(() => {
      expect(trigger).not.toBeDisabled();
    });
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("data-state", "open");
    });
  });

  it("custom `label` prop overrides the default", async () => {
    render(
      withProfile(
        <Hint {...ns} parentId='hint-custom' number={1} label='First nudge'>
          Body.
        </Hint>
      )
    );
    expect(
      await screen.findByRole("button", { name: "First nudge" })
    ).toBeInTheDocument();
  });

  it("two sibling <Hint number={1}/<Hint number={2}> render independently", async () => {
    render(
      withProfile(
        <>
          <Hint {...ns} parentId='hint-sibling' number={1}>
            Step 1.
          </Hint>
          <Hint {...ns} parentId='hint-sibling' number={2}>
            Step 2.
          </Hint>
        </>
      )
    );
    const h1 = await screen.findByRole("button", { name: "Hint 1" });
    const h2 = await screen.findByRole("button", { name: "Hint 2" });
    // Each Hint's useInteractive hook hydrates independently; sibling
    // hydration can briefly re-disable the other trigger as React
    // re-renders. Retry the click inside waitFor so we land it once
    // the trigger is stably enabled.
    await waitFor(() => {
      if (h1.hasAttribute("disabled")) {
        throw new Error("h1 still hydrating");
      }
      fireEvent.click(h1);
      expect(h1).toHaveAttribute("data-state", "open");
    });
    // h2 stays closed — independent persistence keys.
    expect(h2).toHaveAttribute("data-state", "closed");
  });

  it("renders standalone (no provider wrapper) — props are the sole source of namespace", async () => {
    // Guards against any future re-introduction of a context lookup
    // that would re-couple `<Hint>` to a wrapping provider. The
    // compile-time-threading design means props alone suffice.
    render(
      <Hint course='c1' unit='u1' parentId='standalone' number={1}>
        body
      </Hint>
    );
    expect(
      await screen.findByRole("button", { name: "Hint 1" })
    ).toBeInTheDocument();
  });

  it("emits the sophie-reveal class on the root for print-mode auto-expand", () => {
    const { container } = render(
      withProfile(
        <Hint {...ns} parentId='hint-class' number={1}>
          body
        </Hint>
      )
    );
    expect(container.querySelector(".sophie-reveal")).not.toBeNull();
  });

  it("emits data-pedagogy-role='hint' on the root", () => {
    const { container } = render(
      withProfile(
        <Hint {...ns} parentId='hint-role' number={1}>
          body
        </Hint>
      )
    );
    expect(
      container.querySelector('[data-pedagogy-role="hint"]')
    ).not.toBeNull();
  });

  it("has zero axe violations (closed)", async () => {
    const { container } = render(
      withProfile(
        <Hint {...ns} parentId='hint-axe-closed' number={1}>
          body
        </Hint>
      )
    );
    await screen.findByRole("button", { name: "Hint 1" });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations (open)", async () => {
    const { container } = render(
      withProfile(
        <Hint {...ns} parentId='hint-axe-open' number={1}>
          <p>Body prose.</p>
        </Hint>
      )
    );
    const trigger = await screen.findByRole("button", { name: "Hint 1" });
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
