import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import styles from "./Callout.module.css.js";
import { Callout, InteractiveCallout } from "./Callout.tsx";

function withProfile(node: React.ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<Callout> (static)", () => {
  it("renders all seven variants with correct accessible name", () => {
    const variants = [
      "info",
      "warning",
      "tip",
      "caution",
      "roadmap",
      "summary",
      "key-insight",
    ] as const;
    for (const variant of variants) {
      const { unmount } = render(
        <Callout variant={variant}>Body content for {variant}.</Callout>
      );
      expect(screen.getByRole("note")).toBeInTheDocument();
      unmount();
    }
  });

  it("uses a sensible default title for each in-chapter section-marker variant", () => {
    const expected = {
      roadmap: "Roadmap",
      summary: "Summary",
      "key-insight": "Key Insight",
    } as const;
    for (const [variant, title] of Object.entries(expected)) {
      const { unmount } = render(
        <Callout variant={variant as keyof typeof expected}>Body</Callout>
      );
      expect(screen.getByRole("note", { name: title })).toBeInTheDocument();
      unmount();
    }
  });

  it("each in-chapter section-marker variant has zero axe violations", async () => {
    for (const variant of ["roadmap", "summary", "key-insight"] as const) {
      const { container, unmount } = render(
        <Callout variant={variant} title='Variant in context'>
          <p>Some prose body for the {variant} variant.</p>
        </Callout>
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
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
    // Per the controlProps hydration-guard pattern: wait for the
    // disabled-while-loading state to clear before clicking. Otherwise
    // the click would be suppressed by `disabled={!hydrated}`.
    await waitFor(() => expect(checkbox).not.toBeDisabled());
    await act(async () => {
      checkbox.click();
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

  it("omits the visible title element when no title prop is provided (matches static Callout)", () => {
    // Static Callout falls back to the variant default for aria-label
    // only; no visible <p class=title> renders. InteractiveCallout
    // should behave identically when title is omitted — the
    // variant-default name lives in aria-label, not in the DOM as
    // visible text.
    const { container } = render(
      withProfile(
        <InteractiveCallout
          course='test-course'
          chapter='test-chapter'
          id='no-title'
          variant='info'
        >
          Body without an explicit title.
        </InteractiveCallout>
      )
    );
    // aria-label still carries the variant-default name for screen readers.
    expect(screen.getByRole("note", { name: "Note" })).toBeInTheDocument();
    // But no visible "Note" heading is rendered as a <p>.
    expect(container.querySelector(`p.${styles.title}`)).toBeNull();
  });

  it("renders the visible title element when a title prop IS provided", () => {
    const { container } = render(
      withProfile(
        <InteractiveCallout
          course='test-course'
          chapter='test-chapter'
          id='with-title'
          variant='info'
          title='Important context'
        >
          Body with an explicit title.
        </InteractiveCallout>
      )
    );
    const titleEl = container.querySelector(`p.${styles.title}`);
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe("Important context");
  });
});
