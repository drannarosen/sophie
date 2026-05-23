import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { LearningObjectivesPropsSchema } from "./LearningObjectives.schema.ts";
import { LearningObjectives } from "./LearningObjectives.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

function sampleObjectives() {
  return [
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
}

describe("<LearningObjectives>", () => {
  it("renders a <section> with the default heading", () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          unit='test-chapter'
          id='lo-1'
          objectives={sampleObjectives()}
        />
      )
    );
    expect(
      screen.getByRole("heading", { name: "Learning Objectives" })
    ).toBeInTheDocument();
  });

  it("renders each objective's verb + body", () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          unit='test-chapter'
          id='lo-2'
          objectives={sampleObjectives()}
        />
      )
    );
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText(/course thesis/)).toBeInTheDocument();
    expect(screen.getByText("Explain")).toBeInTheDocument();
    expect(screen.getByText(/finite speed of light/)).toBeInTheDocument();
  });

  it("renders a checkbox for each objective", async () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          unit='test-chapter'
          id='lo-checkboxes'
          objectives={sampleObjectives()}
        />
      )
    );
    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    for (const cb of checkboxes) {
      expect(cb).not.toBeChecked();
    }
  });

  it("toggles a single objective's checkbox and persists across remount", async () => {
    const { unmount } = render(
      withProfile(
        <LearningObjectives
          course='persist-course'
          unit='persist-chapter'
          id='lo-persist'
          objectives={sampleObjectives()}
        />
      )
    );
    // Wait for hydration so parent useInteractive is ready and a click
    // can't be silently overwritten by an in-flight IDB fetch.
    await waitFor(() => {
      const ul = screen.getByRole("list");
      expect(ul.getAttribute("aria-busy")).toBe("false");
    });
    const checkboxes = await screen.findAllByRole("checkbox");
    const first = checkboxes[0];
    const second = checkboxes[1];
    if (!first || !second) throw new Error("expected two checkboxes");
    await act(async () => {
      first.click();
    });
    await waitFor(() => {
      expect(first).toBeChecked();
    });
    expect(second).not.toBeChecked();
    unmount();

    render(
      withProfile(
        <LearningObjectives
          course='persist-course'
          unit='persist-chapter'
          id='lo-persist'
          objectives={sampleObjectives()}
        />
      )
    );
    await waitFor(async () => {
      const reloaded = (await screen.findAllByRole("checkbox"))[0];
      if (!reloaded) throw new Error("expected at least one checkbox");
      expect(reloaded).toBeChecked();
    });
  });

  it("uses a custom heading when the heading prop is provided", () => {
    render(
      withProfile(
        <LearningObjectives
          course='test-course'
          unit='test-chapter'
          id='lo-heading'
          heading='By the end of this lecture'
          objectives={sampleObjectives()}
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

  it("schema rejects missing course / chapter / id", () => {
    expect(
      LearningObjectivesPropsSchema.safeParse({
        unit: "c",
        id: "i",
        objectives: [],
      }).success
    ).toBe(false);
    expect(
      LearningObjectivesPropsSchema.safeParse({
        course: "c",
        id: "i",
        objectives: [],
      }).success
    ).toBe(false);
    expect(
      LearningObjectivesPropsSchema.safeParse({
        course: "c",
        unit: "c",
        objectives: [],
      }).success
    ).toBe(false);
  });

  it("schema accepts a complete callsite with objectives", () => {
    expect(
      LearningObjectivesPropsSchema.safeParse({
        course: "astr201",
        unit: "spoiler-alerts",
        id: "lo",
        objectives: [
          { id: "thesis", verb: "State", body: "the course thesis." },
        ],
      }).success
    ).toBe(true);
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <LearningObjectives
          course='test-course'
          unit='test-chapter'
          id='lo-axe'
          objectives={sampleObjectives()}
        />
      )
    );
    await screen.findAllByRole("checkbox");
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
