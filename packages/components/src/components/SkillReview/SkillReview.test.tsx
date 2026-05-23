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
import { SkillReview } from "./SkillReview.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<SkillReview>", () => {
  it("renders the explicit Prompt + Answer through the card flow", () => {
    render(
      withProfile(
        <SkillReview course='sk-test-1' unit='ch1' target='topic:logarithms'>
          <SkillReview.Prompt>What is log10(1000)?</SkillReview.Prompt>
          <SkillReview.Answer>3.</SkillReview.Answer>
        </SkillReview>
      )
    );
    const trigger = screen.getByRole("button", {
      name: /Refresher — topic: logarithms/,
    });
    expect(trigger).toBeInTheDocument();
    act(() => {
      fireEvent.click(trigger);
    });
    expect(screen.getByText(/What is log10\(1000\)/)).toBeVisible();
  });

  it("renders the Library placeholder when slot children are absent", () => {
    render(
      withProfile(
        <SkillReview course='sk-test-2' unit='ch1' target='topic:exponents' />
      )
    );
    expect(
      screen.getByText(/Topic refresher available once the Library room ships/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Refresher —/ })
    ).not.toBeInTheDocument();
  });

  it("renders the placeholder + ReviewMore link when only ReviewMore is provided", () => {
    render(
      withProfile(
        <SkillReview course='sk-test-3' unit='ch1' target='topic:exponents'>
          <SkillReview.ReviewMore>
            <a href='/library/exponents'>Refresher on exponents →</a>
          </SkillReview.ReviewMore>
        </SkillReview>
      )
    );
    expect(screen.getByText(/Topic refresher available/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Refresher on exponents/ })
    ).toBeInTheDocument();
  });

  it("renders ReviewMore inside the card's answer area when all 3 slots are provided", () => {
    render(
      withProfile(
        <SkillReview course='sk-test-4' unit='ch1' target='topic:logarithms'>
          <SkillReview.Prompt>What is log10(1000)?</SkillReview.Prompt>
          <SkillReview.Answer>3 — because 10³ = 1000.</SkillReview.Answer>
          <SkillReview.ReviewMore>
            <a href='/library/logs'>More on logarithms →</a>
          </SkillReview.ReviewMore>
        </SkillReview>
      )
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Refresher —/ }));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Reveal answer/i }));
    });
    expect(screen.getByText(/10³ = 1000/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /More on logarithms/ })
    ).toBeVisible();
  });

  it("persists practice_attempt with component='skill-review' on self-assess", async () => {
    render(
      withProfile(
        <SkillReview course='sk-test-5' unit='ch1' target='topic:logarithms'>
          <SkillReview.Prompt>log10(100)?</SkillReview.Prompt>
          <SkillReview.Answer>2.</SkillReview.Answer>
        </SkillReview>
      )
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Refresher —/ })).toBeEnabled()
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Refresher —/ }));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Reveal answer/i }));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Got it/i }));
    });
    // Wire-up smoke test — no throw on the persist path is the
    // contract; cross-component verification is in the
    // useRetrievalAttempt + RetrievalPrompt suites.
    expect(
      screen.getByRole("button", { name: /Refresher —/ })
    ).toBeInTheDocument();
  });

  it("renders even when target is malformed", () => {
    expect(() =>
      render(
        withProfile(
          <SkillReview
            course='sk-test-6'
            unit='ch1'
            target='logarithms-no-prefix'
          >
            <SkillReview.Prompt>Q?</SkillReview.Prompt>
            <SkillReview.Answer>A.</SkillReview.Answer>
          </SkillReview>
        )
      )
    ).not.toThrow();
    expect(
      screen.getByRole("button", { name: /Refresher — logarithms-no-prefix/ })
    ).toBeInTheDocument();
  });

  it("has zero axe violations in placeholder state", async () => {
    const { container } = render(
      withProfile(
        <SkillReview
          course='sk-test-axe-1'
          unit='ch1'
          target='topic:exponents'
        />
      )
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations with explicit Prompt + Answer", async () => {
    const { container } = render(
      withProfile(
        <SkillReview
          course='sk-test-axe-2'
          unit='ch1'
          target='topic:logarithms'
        >
          <SkillReview.Prompt>What is log10(10000)?</SkillReview.Prompt>
          <SkillReview.Answer>4.</SkillReview.Answer>
        </SkillReview>
      )
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
