import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Predict } from "./Predict.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

const samplePrompts = [
  { id: "colors", label: "What do the different colors represent?" },
  { id: "darks", label: "What are the dark regions?" },
];

describe("<Predict>", () => {
  it("renders the default heading and the description prose", () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='render-default'
          description='Look at the image. Before reading on, jot down:'
          prompts={samplePrompts}
        />
      )
    );
    expect(
      screen.getByRole("heading", { name: "Prediction Moment" })
    ).toBeInTheDocument();
    expect(screen.getByText(/jot down/)).toBeInTheDocument();
  });

  it("renders each prompt's label as a textarea label", () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='render-prompts'
          prompts={samplePrompts}
        />
      )
    );
    for (const p of samplePrompts) {
      expect(
        screen.getByRole("textbox", { name: p.label })
      ).toBeInTheDocument();
    }
  });

  it("each prompt's textarea is disabled + aria-busy until useInteractive hydrates", () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='render-loading'
          prompts={samplePrompts}
        />
      )
    );
    for (const p of samplePrompts) {
      const textbox = screen.getByRole("textbox", { name: p.label });
      expect(textbox).toBeDisabled();
      expect(textbox).toHaveAttribute("aria-busy", "true");
    }
  });

  it("persists each prompt's answer across remount, keyed by prompt.id", async () => {
    const { unmount } = render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='persist-1'
          prompts={samplePrompts}
        />
      )
    );
    const colorsBox = screen.getByRole("textbox", {
      name: "What do the different colors represent?",
    });
    await waitFor(() => expect(colorsBox).not.toBeDisabled());
    await act(async () => {
      // Use fireEvent-style native dispatch via testing-library happy path.
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(colorsBox, "atomic emission");
      colorsBox.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(colorsBox).toHaveValue("atomic emission");
    unmount();

    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='persist-1'
          prompts={samplePrompts}
        />
      )
    );
    const reloaded = screen.getByRole("textbox", {
      name: "What do the different colors represent?",
    });
    await waitFor(() => expect(reloaded).not.toBeDisabled());
    await waitFor(() => expect(reloaded).toHaveValue("atomic emission"));
  });

  it("renders the closing prose when provided", () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='closing'
          prompts={samplePrompts}
          closing="There's no wrong answer."
        />
      )
    );
    expect(screen.getByText(/no wrong answer/)).toBeInTheDocument();
  });

  it("does not render a Reveal button when no children are provided", () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='no-reveal'
          prompts={samplePrompts}
        />
      )
    );
    expect(
      screen.queryByRole("button", { name: /reveal/i })
    ).not.toBeInTheDocument();
  });

  it("renders a Reveal button (initially disabled) when children are provided", async () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='reveal-disabled'
          prompts={samplePrompts}
        >
          <p>Here is the canonical explanation.</p>
        </Predict>
      )
    );
    const button = screen.getByRole("button", { name: /reveal/i });
    expect(button).toBeDisabled();
    // Children content not yet shown.
    expect(screen.queryByText(/canonical explanation/)).not.toBeInTheDocument();
  });

  it("enables the Reveal button only when ALL prompts have non-empty content", async () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='reveal-gate'
          prompts={samplePrompts}
        >
          <p>The reveal.</p>
        </Predict>
      )
    );
    const colorsBox = screen.getByRole("textbox", {
      name: "What do the different colors represent?",
    }) as HTMLTextAreaElement;
    const darksBox = screen.getByRole("textbox", {
      name: "What are the dark regions?",
    }) as HTMLTextAreaElement;
    await waitFor(() => expect(colorsBox).not.toBeDisabled());

    const setNative = (el: HTMLTextAreaElement, val: string) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };

    await act(async () => setNative(colorsBox, "guess one"));
    // Only one filled — button still disabled.
    expect(screen.getByRole("button", { name: /reveal/i })).toBeDisabled();

    await act(async () => setNative(darksBox, "guess two"));
    expect(screen.getByRole("button", { name: /reveal/i })).not.toBeDisabled();
  });

  it("clicking Reveal renders the children content and persists the revealed state", async () => {
    const { unmount } = render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='reveal-click'
          prompts={[{ id: "single", label: "One question?" }]}
        >
          <p>The reveal text.</p>
        </Predict>
      )
    );
    const box = screen.getByRole("textbox", { name: "One question?" });
    await waitFor(() => expect(box).not.toBeDisabled());
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(box, "answer");
      box.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const button = screen.getByRole("button", { name: /reveal/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await act(async () => {
      button.click();
    });
    expect(screen.getByText(/reveal text/)).toBeInTheDocument();

    // Persists across remount.
    unmount();
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='reveal-click'
          prompts={[{ id: "single", label: "One question?" }]}
        >
          <p>The reveal text.</p>
        </Predict>
      )
    );
    await waitFor(() =>
      expect(screen.getByText(/reveal text/)).toBeInTheDocument()
    );
  });

  it("moves focus into the revealed content when Reveal is clicked (WCAG 2.4.3)", async () => {
    render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='reveal-focus'
          prompts={[{ id: "single", label: "One question?" }]}
        >
          <p>The reveal text.</p>
        </Predict>
      )
    );
    // Fill the prompt so the Reveal button can enable.
    const box = screen.getByRole("textbox", { name: "One question?" });
    await waitFor(() => expect(box).not.toBeDisabled());
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(box, "answer");
      box.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const button = screen.getByRole("button", { name: /reveal/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    // Sanity: focus is on the button before the click (focus follows the
    // most recent interaction; the textarea was last touched, not the
    // button, but we don't depend on this — we depend on focus NOT
    // staying wherever it was after the click).
    await act(async () => {
      button.click();
    });
    // After reveal, the content paragraph is rendered. Focus MUST move
    // into that subtree (either to a focusable child, or to the
    // tabIndex=-1 container itself), not stay on the now-disabled
    // button. Screen-reader users get an announcement of the focused
    // element; without this jump, they get nothing.
    const paragraph = screen.getByText(/reveal text/);
    const revealedContainer = paragraph.parentElement;
    expect(revealedContainer).not.toBeNull();
    expect(document.activeElement).not.toBe(button);
    if (revealedContainer) {
      expect(
        revealedContainer === document.activeElement ||
          revealedContainer.contains(document.activeElement)
      ).toBe(true);
    }
  });

  it("has zero axe violations in reflection-only mode", async () => {
    const { container } = render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='axe-reflection'
          description='Jot down your guesses:'
          prompts={samplePrompts}
          closing='No wrong answer.'
        />
      )
    );
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", {
          name: "What do the different colors represent?",
        })
      ).not.toBeDisabled()
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations in reveal mode (with children)", async () => {
    const { container } = render(
      withProfile(
        <Predict
          course='predict-course'
          chapter='predict-chapter'
          id='axe-reveal'
          prompts={samplePrompts}
        >
          <p>Reveal content.</p>
        </Predict>
      )
    );
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", {
          name: "What do the different colors represent?",
        })
      ).not.toBeDisabled()
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
