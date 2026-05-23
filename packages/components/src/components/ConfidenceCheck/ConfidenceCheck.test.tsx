import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { ConfidenceCheck } from "./ConfidenceCheck.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<ConfidenceCheck>", () => {
  it("renders the prompt and a 5-point Likert by default", () => {
    render(
      withProfile(
        <ConfidenceCheck
          course='c'
          unit='ch'
          id='cc-default'
          prompt='How sure are you?'
        />
      )
    );
    expect(screen.getByText("How sure are you?")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("respects scale=7 prop for a 7-point Likert", () => {
    render(
      withProfile(
        <ConfidenceCheck
          course='c'
          unit='ch'
          id='cc-7'
          prompt='How sure?'
          scale={7}
        />
      )
    );
    expect(screen.getAllByRole("radio")).toHaveLength(7);
  });

  it("starts with no option selected (no pre-bias)", async () => {
    render(
      withProfile(
        <ConfidenceCheck
          course='c'
          unit='ch'
          id='cc-initial'
          prompt='How sure?'
        />
      )
    );
    await waitFor(() => {
      const radios = screen.getAllByRole("radio");
      for (const r of radios) {
        expect(r).not.toBeChecked();
      }
    });
  });

  it("disables radios + sets aria-busy until useSelfAssessment hydrates", () => {
    render(
      withProfile(
        <ConfidenceCheck
          course='c'
          unit='ch'
          id='cc-loading'
          prompt='How sure?'
        />
      )
    );
    for (const r of screen.getAllByRole("radio")) {
      expect(r).toBeDisabled();
      expect(r).toHaveAttribute("aria-busy", "true");
    }
  });

  it("persists the chosen value across remount", async () => {
    const { unmount } = render(
      withProfile(
        <ConfidenceCheck
          course='c'
          unit='ch'
          id='cc-persist'
          prompt='How sure?'
        />
      )
    );
    const radios = await screen.findAllByRole("radio");
    await waitFor(() => expect(radios[2]).not.toBeDisabled());
    await act(async () => {
      radios[3]?.click();
    });
    expect(radios[3]).toBeChecked();
    unmount();

    render(
      withProfile(
        <ConfidenceCheck
          course='c'
          unit='ch'
          id='cc-persist'
          prompt='How sure?'
        />
      )
    );
    await waitFor(async () => {
      const reloaded = await screen.findAllByRole("radio");
      expect(reloaded[3]).toBeChecked();
    });
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <ConfidenceCheck
          course='c'
          unit='ch'
          id='cc-axe'
          prompt='How sure are you?'
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
