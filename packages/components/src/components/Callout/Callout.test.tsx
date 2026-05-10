import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { SophieConfigProvider } from "../../runtime/SophieConfig.tsx";
import { Callout } from "./Callout.tsx";

function withProviders(node: React.ReactNode) {
  return (
    <SophieConfigProvider course='test-course' chapter='test-chapter'>
      <ProfileProvider profile='student'>{node}</ProfileProvider>
    </SophieConfigProvider>
  );
}

describe("<Callout>", () => {
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

  it("non-interactive variant has zero axe violations", async () => {
    const { container } = render(
      <Callout variant='warning' title='Watch out'>
        <p>Some warning prose.</p>
      </Callout>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("interactive variant renders a checkbox and toggles it", async () => {
    render(
      withProviders(
        <Callout variant='tip' id='tip-1' interactive>
          Take a moment to confirm you can re-derive the result.
        </Callout>
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

  it("interactive variant has zero axe violations", async () => {
    const { container } = render(
      withProviders(
        <Callout variant='info' id='ax-1' interactive>
          Body with checkbox follow-up.
        </Callout>
      )
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
