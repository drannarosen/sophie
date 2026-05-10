import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Reflection } from "./Reflection.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<Reflection>", () => {
  it("renders the prompt and a labelled textarea", () => {
    render(
      withProfile(
        <Reflection
          course='c'
          chapter='ch'
          id='ref-default'
          prompt='What was confusing?'
        />
      )
    );
    expect(
      screen.getByRole("textbox", { name: "What was confusing?" })
    ).toBeInTheDocument();
  });

  it("uses the placeholder when provided", () => {
    render(
      withProfile(
        <Reflection
          course='c'
          chapter='ch'
          id='ref-placeholder'
          prompt='Notes'
          placeholder='Type freely...'
        />
      )
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute(
      "placeholder",
      "Type freely..."
    );
  });

  it("disables textarea + sets aria-busy until hydration", () => {
    render(
      withProfile(
        <Reflection course='c' chapter='ch' id='ref-loading' prompt='Reflect' />
      )
    );
    const tx = screen.getByRole("textbox", { name: "Reflect" });
    expect(tx).toBeDisabled();
    expect(tx).toHaveAttribute("aria-busy", "true");
  });

  it("persists the textarea value across remount", async () => {
    const { unmount } = render(
      withProfile(
        <Reflection course='c' chapter='ch' id='ref-persist' prompt='Reflect' />
      )
    );
    const tx = screen.getByRole("textbox", {
      name: "Reflect",
    }) as HTMLTextAreaElement;
    await waitFor(() => expect(tx).not.toBeDisabled());
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(tx, "I learned about emission spectra");
      tx.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(tx).toHaveValue("I learned about emission spectra");
    unmount();

    render(
      withProfile(
        <Reflection course='c' chapter='ch' id='ref-persist' prompt='Reflect' />
      )
    );
    const reloaded = screen.getByRole("textbox", { name: "Reflect" });
    await waitFor(() => expect(reloaded).not.toBeDisabled());
    await waitFor(() =>
      expect(reloaded).toHaveValue("I learned about emission spectra")
    );
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <Reflection
          course='c'
          chapter='ch'
          id='ref-axe'
          prompt='Reflect on this section'
        />
      )
    );
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Reflect on this section" })
      ).not.toBeDisabled()
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
