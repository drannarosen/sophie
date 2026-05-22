import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { __setUnits } from "../../runtime/units-store.ts";
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

  it("surfaces the target even when it isn't the prefix-LRU least (regression for 2026-05-22 audit)", async () => {
    // Seed in attempt-order: eq:older (oldest), eq:middle, eq:target (newest).
    // The OLD code (LRU over `eq:` prefix → max items → filter to exact
    // target) would have surfaced ["eq:older"] for max=1 and then dropped
    // eq:target via the exact-match filter, rendering the empty state
    // even though the student HAS attempted eq:target. The fix scopes
    // the LRU to the exact target before applying max.
    await seedAttempt("sr-test-regression", "ch1", "eq:older");
    await seedAttempt("sr-test-regression", "ch1", "eq:middle");
    await seedAttempt("sr-test-regression", "ch1", "eq:target");

    render(
      withProfile(
        <SpacedReview
          course='sr-test-regression'
          chapter='ch1'
          target='eq:target'
          max={1}
        />
      )
    );
    await waitFor(() =>
      expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(1)
    );
    expect(screen.getByText(/Review: equation: target/i)).toBeInTheDocument();
  });

  it("section-scope renders empty when no Units are populated (forward-compat)", () => {
    // Pre-W1 consumers don't populate unitStore; section-scope
    // resolves to an empty chapter list → multi-hook short-circuits →
    // empty state.
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

  describe("section-scope rendering (W1 graduation)", () => {
    afterEach(() => {
      __setUnits([]);
    });

    it("renders aggregated review items across chapters bound to a Section", async () => {
      // Populate the unitStore: two Units in the same Section, each
      // bound to a distinct chapter.
      __setUnits([
        {
          id: "u1",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: [],
          section_id: "stars",
          chapter: "ch-spectra",
        },
        {
          id: "u2",
          type: "lecture",
          title: "U2",
          order: 1,
          prereqs: [],
          section_id: "stars",
          chapter: "ch-evolution",
        },
      ]);
      // Seed practice attempts in BOTH chapters with distinct targets.
      await seedAttempt("sr-section-1", "ch-spectra", "topic:logs");
      await seedAttempt("sr-section-1", "ch-evolution", "topic:trig");

      render(
        withProfile(
          <SpacedReview
            course='sr-section-1'
            chapter='ch-spectra'
            section='stars'
            max={3}
          />
        )
      );
      // Expect both targets to appear in the merged review list.
      await waitFor(() =>
        expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(2)
      );
    });

    it("excludes attempts in chapters bound to OTHER Sections", async () => {
      __setUnits([
        {
          id: "u-stars",
          type: "lecture",
          title: "Stars U",
          order: 0,
          prereqs: [],
          section_id: "stars",
          chapter: "ch-spectra",
        },
        // Galaxies has a Unit too, but the SpacedReview points at "stars"
        // so galaxy attempts shouldn't surface.
        {
          id: "u-galaxies",
          type: "lecture",
          title: "Galaxies U",
          order: 0,
          prereqs: [],
          section_id: "galaxies",
          chapter: "ch-galaxies",
        },
      ]);
      await seedAttempt("sr-section-2", "ch-spectra", "topic:logs");
      await seedAttempt("sr-section-2", "ch-galaxies", "topic:redshift");

      render(
        withProfile(
          <SpacedReview
            course='sr-section-2'
            chapter='ch-spectra'
            section='stars'
            max={3}
          />
        )
      );
      await waitFor(() =>
        expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(1)
      );
      expect(screen.getByText(/Review:.*logs/i)).toBeInTheDocument();
    });

    it("honors max= in section-scope when more attempts would otherwise match", async () => {
      __setUnits([
        {
          id: "u1",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: [],
          section_id: "stars",
          chapter: "ch-a",
        },
        {
          id: "u2",
          type: "lecture",
          title: "U2",
          order: 1,
          prereqs: [],
          section_id: "stars",
          chapter: "ch-b",
        },
      ]);
      await seedAttempt("sr-section-3", "ch-a", "topic:logs");
      await seedAttempt("sr-section-3", "ch-a", "topic:trig");
      await seedAttempt("sr-section-3", "ch-b", "topic:exp");

      render(
        withProfile(
          <SpacedReview
            course='sr-section-3'
            chapter='ch-a'
            section='stars'
            max={2}
          />
        )
      );
      await waitFor(() =>
        expect(screen.queryAllByTestId("spaced-review-item")).toHaveLength(2)
      );
    });
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
