import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Callout, InteractiveCallout } from "./Callout.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<Callout> (static)", () => {
  it("renders all four variants with correct accessible name", () => {
    const variants = ["info", "warning", "tip", "caution"] as const;
    for (const variant of variants) {
      const { unmount } = render(
        <Callout variant={variant}>Body content for {variant}.</Callout>
      );
      expect(screen.getByRole("note")).toBeInTheDocument();
      unmount();
    }
  });

  it("uses provided title as the accessible name", () => {
    render(<Callout title='Custom title'>Body</Callout>);
    expect(
      screen.getByRole("note", { name: "Custom title" })
    ).toBeInTheDocument();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <Callout variant='warning' title='Watch out'>
        <p>Some warning prose.</p>
      </Callout>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

describe("<InteractiveCallout>", () => {
  it("renders a checkbox and toggles it", async () => {
    render(
      withProfile(
        <InteractiveCallout
          course='test-course'
          chapter='test-chapter'
          id='tip-1'
          variant='tip'
        >
          Take a moment to confirm you can re-derive the result.
        </InteractiveCallout>
      )
    );
    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    await act(async () => {
      checkbox.click();
      await Promise.resolve();
    });
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <InteractiveCallout
          course='test-course'
          chapter='test-chapter'
          id='ax-1'
          variant='info'
        >
          Body with checkbox follow-up.
        </InteractiveCallout>
      )
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
