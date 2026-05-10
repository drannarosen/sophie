import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { ComprehensionGate } from "./ComprehensionGate.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<ComprehensionGate>", () => {
  it("renders the prompt and 3 radio options (got-it / revisit / stuck)", () => {
    render(
      withProfile(
        <ComprehensionGate
          course='c'
          chapter='ch'
          id='cg-default'
          prompt='How well do you understand this section?'
        />
      )
    );
    expect(
      screen.getByText("How well do you understand this section?")
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /got it/i })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /need to revisit/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /stuck/i })).toBeInTheDocument();
  });

  it("starts with no option selected", async () => {
    render(
      withProfile(
        <ComprehensionGate
          course='c'
          chapter='ch'
          id='cg-initial'
          prompt='How well?'
        />
      )
    );
    await waitFor(() => {
      for (const r of screen.getAllByRole("radio")) {
        expect(r).not.toBeChecked();
      }
    });
  });

  it("disables radios + sets aria-busy until hydration", () => {
    render(
      withProfile(
        <ComprehensionGate
          course='c'
          chapter='ch'
          id='cg-loading'
          prompt='How well?'
        />
      )
    );
    for (const r of screen.getAllByRole("radio")) {
      expect(r).toBeDisabled();
      expect(r).toHaveAttribute("aria-busy", "true");
    }
  });

  it("persists chosen value across remount", async () => {
    const { unmount } = render(
      withProfile(
        <ComprehensionGate
          course='c'
          chapter='ch'
          id='cg-persist'
          prompt='How well?'
        />
      )
    );
    const stuck = await screen.findByRole("radio", { name: /stuck/i });
    await waitFor(() => expect(stuck).not.toBeDisabled());
    await act(async () => {
      stuck.click();
    });
    expect(stuck).toBeChecked();
    unmount();

    render(
      withProfile(
        <ComprehensionGate
          course='c'
          chapter='ch'
          id='cg-persist'
          prompt='How well?'
        />
      )
    );
    await waitFor(async () =>
      expect(await screen.findByRole("radio", { name: /stuck/i })).toBeChecked()
    );
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <ComprehensionGate
          course='c'
          chapter='ch'
          id='cg-axe'
          prompt='How well?'
        />
      )
    );
    await waitFor(() =>
      expect(screen.getAllByRole("radio")[0]).not.toBeDisabled()
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
