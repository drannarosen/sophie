import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { InteractiveCheckbox } from "./InteractiveCheckbox.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<InteractiveCheckbox>", () => {
  it("renders a checkbox + label with the children as the visible label", () => {
    render(
      withProfile(
        <InteractiveCheckbox
          course='ic-course'
          unit='ic-chapter'
          id='ic-render'
        >
          Mark as understood
        </InteractiveCheckbox>
      )
    );
    expect(
      screen.getByRole("checkbox", { name: "Mark as understood" })
    ).toBeInTheDocument();
  });

  it("is disabled + aria-busy until useInteractive hydrates from IndexedDB", () => {
    render(
      withProfile(
        <InteractiveCheckbox
          course='ic-course'
          unit='ic-chapter'
          id='ic-loading'
        >
          Loading guard
        </InteractiveCheckbox>
      )
    );
    const cb = screen.getByRole("checkbox");
    expect(cb).toBeDisabled();
    expect(cb).toHaveAttribute("aria-busy", "true");
  });

  it("toggles checked state when clicked after hydration", async () => {
    render(
      withProfile(
        <InteractiveCheckbox
          course='ic-course'
          unit='ic-chapter'
          id='ic-toggle'
        >
          Toggle me
        </InteractiveCheckbox>
      )
    );
    const cb = screen.getByRole("checkbox");
    await waitFor(() => expect(cb).not.toBeDisabled());
    expect(cb).not.toBeChecked();
    await act(async () => {
      cb.click();
    });
    expect(cb).toBeChecked();
  });

  it("persists checked state across remount, keyed by id", async () => {
    const { unmount } = render(
      withProfile(
        <InteractiveCheckbox
          course='ic-persist-course'
          unit='ic-persist-chapter'
          id='ic-persist'
        >
          Persistence
        </InteractiveCheckbox>
      )
    );
    const cb = screen.getByRole("checkbox");
    await waitFor(() => expect(cb).not.toBeDisabled());
    await act(async () => {
      cb.click();
    });
    expect(cb).toBeChecked();
    unmount();

    render(
      withProfile(
        <InteractiveCheckbox
          course='ic-persist-course'
          unit='ic-persist-chapter'
          id='ic-persist'
        >
          Persistence
        </InteractiveCheckbox>
      )
    );
    const cb2 = screen.getByRole("checkbox");
    await waitFor(() => expect(cb2).not.toBeDisabled());
    expect(cb2).toBeChecked();
  });

  it("respects an explicit `initial` prop", () => {
    render(
      withProfile(
        <InteractiveCheckbox
          course='ic-course'
          unit='ic-chapter'
          id='ic-initial'
          initial={true}
        >
          Pre-checked
        </InteractiveCheckbox>
      )
    );
    const cb = screen.getByRole("checkbox");
    // Initial render reflects the `initial` prop before IDB hydrates.
    expect(cb).toBeChecked();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <InteractiveCheckbox course='ic-course' unit='ic-chapter' id='ic-axe'>
          Accessible by default
        </InteractiveCheckbox>
      )
    );
    await waitFor(() =>
      expect(screen.getByRole("checkbox")).not.toBeDisabled()
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
