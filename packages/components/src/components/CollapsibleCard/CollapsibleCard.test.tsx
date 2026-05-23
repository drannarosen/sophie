import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { CollapsibleCard } from "./CollapsibleCard.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<CollapsibleCard>", () => {
  it("renders the title as a disclosure trigger and is collapsed by default", () => {
    render(
      withProfile(
        <CollapsibleCard
          course='cc-course'
          unit='cc-chapter'
          id='cc-default-closed'
          title='Deep Dive: Hydrogen'
        >
          The red glow comes from H-alpha at 656.3 nm.
        </CollapsibleCard>
      )
    );

    // Trigger is a button whose accessible name is the title.
    const trigger = screen.getByRole("button", {
      name: "Deep Dive: Hydrogen",
    });
    expect(trigger).toBeInTheDocument();

    // Body content is collapsed: not visible (display:none via Radix).
    // queryByText returns the node if it exists in the DOM tree; we check
    // visibility via aria-expanded on the trigger and Radix's data-state.
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("data-state", "closed");
  });

  it("respects defaultOpen=true on first render", async () => {
    render(
      withProfile(
        <CollapsibleCard
          course='cc-course'
          unit='cc-chapter'
          id='cc-default-open'
          title='Open by default'
          defaultOpen
        >
          Body content
        </CollapsibleCard>
      )
    );

    // Wait for hydration: useInteractive's first render sets disabled
    // (controlProps), then resolves and sets `open` to defaultOpen.
    await waitFor(() => {
      const trigger = screen.getByRole("button", { name: "Open by default" });
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(trigger).toHaveAttribute("data-state", "open");
    });
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("opens on trigger click and toggles closed on second click", async () => {
    render(
      withProfile(
        <CollapsibleCard
          course='cc-course'
          unit='cc-chapter'
          id='cc-toggle'
          title='Click me'
        >
          Hidden body
        </CollapsibleCard>
      )
    );
    const trigger = screen.getByRole("button", { name: "Click me" });

    // Wait for hydration so controlProps.disabled goes false.
    await waitFor(() => {
      expect(trigger).not.toBeDisabled();
    });

    await act(async () => {
      trigger.click();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("data-state", "open");

    await act(async () => {
      trigger.click();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("data-state", "closed");
  });

  it("spreads controlProps: trigger is disabled + aria-busy pre-hydration", () => {
    render(
      withProfile(
        <CollapsibleCard
          course='cc-course'
          unit='cc-chapter'
          id='cc-loading'
          title='Loading guard'
        >
          Body
        </CollapsibleCard>
      )
    );
    const trigger = screen.getByRole("button", { name: "Loading guard" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("aria-busy", "true");
  });

  it("persists open state across remount, keyed by id", async () => {
    const { unmount } = render(
      withProfile(
        <CollapsibleCard
          course='cc-persist-course'
          unit='cc-persist-chapter'
          id='cc-persist'
          title='Persistence'
        >
          Body
        </CollapsibleCard>
      )
    );
    const trigger = screen.getByRole("button", { name: "Persistence" });
    await waitFor(() => expect(trigger).not.toBeDisabled());
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      trigger.click();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    unmount();

    render(
      withProfile(
        <CollapsibleCard
          course='cc-persist-course'
          unit='cc-persist-chapter'
          id='cc-persist'
          title='Persistence'
        >
          Body
        </CollapsibleCard>
      )
    );
    const remounted = screen.getByRole("button", { name: "Persistence" });
    await waitFor(() => {
      expect(remounted).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("isolates state between cards with different ids (no cross-talk)", async () => {
    render(
      withProfile(
        <>
          <CollapsibleCard
            course='cc-iso'
            unit='cc-iso'
            id='card-a'
            title='Card A'
          >
            A body
          </CollapsibleCard>
          <CollapsibleCard
            course='cc-iso'
            unit='cc-iso'
            id='card-b'
            title='Card B'
          >
            B body
          </CollapsibleCard>
        </>
      )
    );
    const a = screen.getByRole("button", { name: "Card A" });
    const b = screen.getByRole("button", { name: "Card B" });
    await waitFor(() => {
      expect(a).not.toBeDisabled();
      expect(b).not.toBeDisabled();
    });

    await act(async () => {
      a.click();
    });
    expect(a).toHaveAttribute("aria-expanded", "true");
    expect(b).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when Escape is pressed while the card is open (ARIA APG disclosure)", async () => {
    // ARIA Authoring Practices Guide recommends Escape closing a
    // disclosure widget. Radix Collapsible doesn't bind this by default;
    // CollapsibleCard wires it explicitly via an onKeyDown handler.
    render(
      withProfile(
        <CollapsibleCard
          course='cc-escape'
          unit='cc-escape'
          id='cc-escape-1'
          title='Esc closes me'
          defaultOpen
        >
          Body content
        </CollapsibleCard>
      )
    );
    const trigger = screen.getByRole("button", { name: "Esc closes me" });
    await waitFor(() => expect(trigger).not.toBeDisabled());
    // Sanity: trigger reports open state before Escape.
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    );
    await act(async () => {
      fireEvent.keyDown(trigger, { key: "Escape" });
    });
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("ignores Escape when the card is already closed (no spurious state change)", async () => {
    render(
      withProfile(
        <CollapsibleCard
          course='cc-escape-noop'
          unit='cc-escape-noop'
          id='cc-escape-noop-1'
          title='Closed already'
        >
          Body content
        </CollapsibleCard>
      )
    );
    const trigger = screen.getByRole("button", { name: "Closed already" });
    await waitFor(() => expect(trigger).not.toBeDisabled());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await act(async () => {
      fireEvent.keyDown(trigger, { key: "Escape" });
    });
    // Still closed; no state change attempted.
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("has no axe-core accessibility violations (closed and open states)", async () => {
    const { container, rerender } = render(
      withProfile(
        <CollapsibleCard
          course='cc-axe'
          unit='cc-axe'
          id='cc-axe-closed'
          title='Axe check'
        >
          Body content
        </CollapsibleCard>
      )
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Axe check" })
      ).not.toBeDisabled();
    });
    expect((await axe(container)).violations).toEqual([]);

    rerender(
      withProfile(
        <CollapsibleCard
          course='cc-axe'
          unit='cc-axe'
          id='cc-axe-open'
          title='Axe check open'
          defaultOpen
        >
          Body content
        </CollapsibleCard>
      )
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Axe check open" })
      ).toHaveAttribute("aria-expanded", "true");
    });
    expect((await axe(container)).violations).toEqual([]);
  });
});
