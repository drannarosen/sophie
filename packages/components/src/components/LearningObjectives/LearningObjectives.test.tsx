import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import type { Objective } from "./LearningObjectives.schema.ts";
import { LearningObjectives } from "./LearningObjectives.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

const sampleObjectives: Objective[] = [
  {
    id: "thesis",
    verb: "State",
    body: "the course thesis in one sentence: pretty pictures → measurements → models → inferences",
  },
  {
    id: "fls",
    verb: "Explain",
    body: "why the finite speed of light makes astronomy a 'lookback time' science",
  },
];

describe("<LearningObjectives>", () => {
  it("renders the default 'Learning Objectives' heading and each objective's verb + body", () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          chapter='test-chapter'
          id='lo-1'
          objectives={sampleObjectives}
        />
      )
    );
    expect(
      screen.getByRole("heading", { name: "Learning Objectives" })
    ).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText(/course thesis/)).toBeInTheDocument();
    expect(screen.getByText("Explain")).toBeInTheDocument();
    expect(screen.getByText(/finite speed of light/)).toBeInTheDocument();
  });

  it("renders one checkbox per objective, all initially unchecked", async () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          chapter='test-chapter'
          id='lo-checkboxes'
          objectives={sampleObjectives}
        />
      )
    );
    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes).toHaveLength(sampleObjectives.length);
    for (const cb of checkboxes) {
      expect(cb).not.toBeChecked();
    }
  });

  it("disables each checkbox while its useInteractive is loading from IndexedDB", () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          chapter='test-chapter'
          id='lo-loading'
          objectives={sampleObjectives}
        />
      )
    );
    // Synchronous assertion: at first render, all useInteractive hooks
    // are in "loading" status and their checkboxes must be disabled +
    // aria-busy. This guarantees a click in that window can't be
    // silently overwritten by the IDB fetch's setLocalValue(initial).
    for (const cb of screen.getAllByRole("checkbox")) {
      expect(cb).toBeDisabled();
      expect(cb).toHaveAttribute("aria-busy", "true");
    }
  });

  it("toggles a single objective's checkbox without affecting siblings", async () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          chapter='test-chapter'
          id='lo-toggle'
          objectives={sampleObjectives}
        />
      )
    );
    const checkboxes = await screen.findAllByRole("checkbox");
    const first = checkboxes[0];
    const second = checkboxes[1];
    if (!first || !second) throw new Error("expected two checkboxes");
    // Wait for hydration: checkboxes are disabled until useInteractive
    // transitions from loading → ready. Once enabled, a click can't be
    // overwritten by an in-flight IDB fetch.
    await waitFor(() => expect(first).not.toBeDisabled());
    await act(async () => {
      first.click();
    });
    expect(first).toBeChecked();
    expect(second).not.toBeChecked();
  });

  it("persists each objective's checked state across remount, keyed by objective.id", async () => {
    const { unmount } = render(
      withProfile(
        <LearningObjectives
          course='persist-course'
          chapter='persist-chapter'
          id='lo-persist'
          objectives={sampleObjectives}
        />
      )
    );
    const first = (await screen.findAllByRole("checkbox"))[0];
    if (!first) throw new Error("expected at least one checkbox");
    await waitFor(() => expect(first).not.toBeDisabled());
    await act(async () => {
      first.click();
    });
    expect(first).toBeChecked();
    unmount();

    render(
      withProfile(
        <LearningObjectives
          course='persist-course'
          chapter='persist-chapter'
          id='lo-persist'
          objectives={sampleObjectives}
        />
      )
    );
    await waitFor(async () => {
      const reloaded = (await screen.findAllByRole("checkbox"))[0];
      if (!reloaded) throw new Error("expected at least one checkbox");
      expect(reloaded).not.toBeDisabled();
      expect(reloaded).toBeChecked();
    });
  });

  it("uses a custom heading when the heading prop is provided", () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          chapter='test-chapter'
          id='lo-heading'
          objectives={sampleObjectives}
          heading='By the end of this lecture'
        />
      )
    );
    expect(
      screen.getByRole("heading", { name: "By the end of this lecture" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Learning Objectives" })
    ).not.toBeInTheDocument();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <LearningObjectives
          course='test-course'
          chapter='test-chapter'
          id='lo-axe'
          objectives={sampleObjectives}
        />
      )
    );
    // Wait for hydration so checkboxes have their final aria state.
    await screen.findAllByRole("checkbox");
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
