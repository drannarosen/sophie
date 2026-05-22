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
import { RetrievalPrompt } from "../RetrievalPrompt/RetrievalPrompt.tsx";
import { SpacedReview } from "./SpacedReview.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

/**
 * Helper: seed one practice_attempt by mounting a RetrievalPrompt and
 * driving it through expand → reveal → self-assess. Returns once the
 * attempt is committed (visible in the hook's `attempts`).
 */
async function seedAttempt(
  course: string,
  chapter: string,
  target: string
): Promise<void> {
  const { unmount } = render(
    withProfile(
      <RetrievalPrompt course={course} chapter={chapter} target={target}>
        <RetrievalPrompt.Prompt>Q?</RetrievalPrompt.Prompt>
        <RetrievalPrompt.Answer>A.</RetrievalPrompt.Answer>
      </RetrievalPrompt>
    )
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Retrieval —/ })).toBeEnabled()
  );
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /Retrieval —/ }));
  });
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /Reveal answer/i }));
  });
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /Got it/i }));
  });
  unmount();
}

describe("<SpacedReview>", () => {
  it("renders the default empty-state placeholder when no attempts match scope", () => {
    render(
      withProfile(
        <SpacedReview
          course='sr-test-1'
          chapter='ch1'
          target='topic:never-attempted'
        />
      )
    );
    expect(
      screen.getByText(/No items due for review yet/i)
    ).toBeInTheDocument();
  });

  it("renders authored <SpacedReview.Empty> when provided + no items", () => {
    render(
      withProfile(
        <SpacedReview
          course='sr-test-2'
          chapter='ch1'
          target='topic:nothing-here-yet'
        >
          <SpacedReview.Empty>Practice ahead on logarithms?</SpacedReview.Empty>
        </SpacedReview>
      )
    );
    expect(screen.getByText(/Practice ahead/)).toBeInTheDocument();
    // Default placeholder should not also render.
    expect(
      screen.queryByText(/No items due for review yet/i)
    ).not.toBeInTheDocument();
  });

  it("surfaces a target after at least one attempt has been recorded for it", async () => {
    await seedAttempt("sr-test-3", "ch1", "eq:stefan-boltzmann");

    // Now mount SpacedReview pointed at the same target.
    render(
      withProfile(
        <SpacedReview
          course='sr-test-3'
          chapter='ch1'
          target='eq:stefan-boltzmann'
        />
      )
    );
    await waitFor(() =>
      expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(1)
    );
    expect(
      screen.getByText(/Review: equation: stefan-boltzmann/i)
    ).toBeInTheDocument();
  });

  it("respects max=1 even when more attempts would otherwise match", async () => {
    await seedAttempt("sr-test-4", "ch1", "eq:saha");
    await seedAttempt("sr-test-4", "ch1", "eq:saha-2");

    render(
      withProfile(
        <SpacedReview
          course='sr-test-4'
          chapter='ch1'
          target='eq:saha'
          max={1}
        />
      )
    );
    await waitFor(() =>
      expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(1)
    );
  });

  it("section-scope returns no items in Wedge B1 (pedagogy-index lookup stubbed)", () => {
    render(
      withProfile(
        <SpacedReview
          course='sr-test-5'
          chapter='ch1'
          section='m1-foundations'
        />
      )
    );
    expect(
      screen.getByText(/No items due for review yet/i)
    ).toBeInTheDocument();
  });

  it("has zero axe violations in empty state", async () => {
    const { container } = render(
      withProfile(
        <SpacedReview
          course='sr-test-axe-1'
          chapter='ch1'
          target='topic:logs'
        />
      )
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations with one due item", async () => {
    await seedAttempt("sr-test-axe-2", "ch1", "eq:gauss");
    const { container } = render(
      withProfile(
        <SpacedReview course='sr-test-axe-2' chapter='ch1' target='eq:gauss' />
      )
    );
    await waitFor(() =>
      expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(1)
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
