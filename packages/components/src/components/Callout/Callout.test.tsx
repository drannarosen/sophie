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
  it("renders all variants with correct accessible name", () => {
    const variants = [
      "info",
      "warning",
      "tip",
      "caution",
      "roadmap",
      "summary",
      "key-insight",
      "misconception",
      "deep-dive",
      "the-more-you-know",
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
      "key-insight": "Key insight",
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

  it("renders a visible title bar with the variant-default label when no title prop is provided (PR-5)", () => {
    // Per visual-polish-target.md the title bar is core anatomy and
    // renders on every callout. Variant-default fills the visible
    // title bar (and the aria-label) when no `title` prop is set.
    const { container } = render(<Callout variant='warning'>Body</Callout>);
    const titleEl = container.querySelector(`.${styles.title}`);
    expect(titleEl?.textContent).toBe("Warning");
  });

  it("renders a Lucide icon inside the title bar (PR-5)", () => {
    // Each variant maps to a Lucide icon (per ADR 0039). The icon
    // sits left of the title text inside <header class=titleBar>.
    const { container } = render(<Callout variant='tip'>Body</Callout>);
    const iconEl = container.querySelector(`.${styles.titleBar} svg`);
    expect(iconEl).not.toBeNull();
    expect(iconEl?.getAttribute("aria-hidden")).toBe("true");
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

  it("renders the optional `id` prop on the root DOM element (PR-C3 T12)", () => {
    // Per PR-C3 decision #8: Callout gains an optional `id?: string`
    // prop symmetric with Aside.id?. When provided, the value must
    // land on the root <aside> so hash-anchors target the callout.
    const { container } = render(
      <Callout variant='misconception' id='x'>
        Body content.
      </Callout>
    );
    const root = container.querySelector("aside");
    expect(root?.id).toBe("x");
  });

  it("omits the id attribute when no `id` prop is provided", () => {
    const { container } = render(<Callout>Body.</Callout>);
    const root = container.querySelector("aside");
    expect(root?.hasAttribute("id")).toBe(false);
  });

  // ─── Session 9 P3: collapsible depth + enrichment variants ───

  it("renders deep-dive with the 'Deep Dive: ' title prefix when title is provided", () => {
    render(
      <Callout variant='deep-dive' title='How the distance ladder works'>
        depth body
      </Callout>
    );
    expect(
      screen.getByRole("note", {
        name: "Deep Dive: How the distance ladder works",
      })
    ).toBeInTheDocument();
  });

  it("renders the-more-you-know with the 'The More You Know: ' prefix when title is provided", () => {
    render(
      <Callout variant='the-more-you-know' title="Hubble's redshift puzzle">
        enrichment body
      </Callout>
    );
    expect(
      screen.getByRole("note", {
        name: "The More You Know: Hubble's redshift puzzle",
      })
    ).toBeInTheDocument();
  });

  it("falls back to the variant default label when no title is provided", () => {
    const { unmount } = render(<Callout variant='deep-dive'>body</Callout>);
    expect(screen.getByRole("note", { name: "Deep Dive" })).toBeInTheDocument();
    unmount();
    render(<Callout variant='the-more-you-know'>body</Callout>);
    expect(
      screen.getByRole("note", { name: "The More You Know" })
    ).toBeInTheDocument();
  });

  it("wraps deep-dive content in a native <details> disclosure (default-collapsed)", () => {
    const { container } = render(
      <Callout variant='deep-dive' title='Derivation'>
        body
      </Callout>
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    // Native HTML semantics: <details> without the `open` attribute is
    // collapsed by default.
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("wraps the-more-you-know content in a native <details> disclosure (default-collapsed)", () => {
    const { container } = render(
      <Callout variant='the-more-you-know' title='Context'>
        body
      </Callout>
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("does NOT wrap non-collapsible variants in <details>", () => {
    const { container } = render(
      <Callout variant='info' title='Just a note'>
        body
      </Callout>
    );
    expect(container.querySelector("details")).toBeNull();
  });

  // Per 2026-05-19 architecture audit P1 #1: the collapsible branch
  // previously set `aria-label={visibleTitle}` on the outer <aside>
  // AND rendered the same title inside <summary>, causing NVDA/JAWS
  // to read the title twice (once on landmark navigation, once when
  // the summary gains focus). Fix: use aria-labelledby pointing at
  // the summary's title span — screen readers de-duplicate when both
  // references resolve to the same content.
  it("collapsible variants link aria-labelledby to the summary title (no duplicate aria-label)", () => {
    const { container } = render(
      <Callout variant='deep-dive' title='Hydrogen line'>
        body
      </Callout>
    );
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    // Outer <aside> must NOT carry aria-label (would double-announce
    // alongside the summary text).
    expect(aside?.hasAttribute("aria-label")).toBe(false);
    // Outer <aside> must carry aria-labelledby pointing at a real id.
    const labelledBy = aside?.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    if (labelledBy) {
      const target = container.querySelector(`#${labelledBy}`);
      expect(target).not.toBeNull();
      expect(target?.textContent).toBe("Deep Dive: Hydrogen line");
    }
  });

  it("non-collapsible variants keep aria-label (no inner summary to take over)", () => {
    const { container } = render(
      <Callout variant='info' title='Just a note'>
        body
      </Callout>
    );
    const aside = container.querySelector("aside");
    expect(aside?.getAttribute("aria-label")).toBe("Just a note");
  });

  it("collapsible variants pass axe (native <details> brings a11y for free)", async () => {
    for (const variant of ["deep-dive", "the-more-you-know"] as const) {
      const { container, unmount } = render(
        <Callout variant={variant} title='Title in context'>
          <p>Body content for the {variant} variant.</p>
        </Callout>
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
      unmount();
    }
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

  it("renders a visible title bar with the variant-default label when no title prop is provided", () => {
    // Per the visual-polish-target (Workstream 3 PR-5 rebuild): the
    // title bar is core anatomy and renders for every callout. When no
    // explicit `title` prop is passed, the variant-default name
    // ("Note" for info, etc.) fills both the visible title bar AND the
    // aria-label. Replaces the prior behavior where default-titled
    // callouts had no visible title element.
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
    // The variant-default ("Note") is also visible in the title bar.
    const titleEl = container.querySelector(`.${styles.title}`);
    expect(titleEl?.textContent).toBe("Note");
  });

  it("renders the required `id` prop on the root <aside> (hash-anchor parity with static Callout)", () => {
    const { container } = render(
      withProfile(
        <InteractiveCallout
          course='test-course'
          chapter='test-chapter'
          id='my-anchor'
          variant='info'
        >
          <p>body</p>
        </InteractiveCallout>
      )
    );
    const root = container.querySelector("aside");
    expect(root?.id).toBe("my-anchor");
  });

  it("renders the explicit title in the visible title bar when title prop IS provided", () => {
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
    const titleEl = container.querySelector(`.${styles.title}`);
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe("Important context");
  });
});
