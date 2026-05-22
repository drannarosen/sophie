import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RetrievalCard } from "./RetrievalCard.tsx";

const baseProps = {
  bandToken: "retrieval" as const,
  triggerLabel: "Retrieval — equation: Stefan-Boltzmann",
  prompt: <>What is L if R doubles at fixed T?</>,
  answer: <>L goes up by 4x.</>,
};

describe("<RetrievalCard>", () => {
  it("renders a collapsed trigger by default", () => {
    render(<RetrievalCard {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /Retrieval — equation/ })
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("expands on trigger click and shows prompt + textarea + reveal button", () => {
    render(<RetrievalCard {...baseProps} />);

    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /Retrieval — equation/ })
      );
    });
    expect(screen.getByText(/What is L if R doubles/)).toBeVisible();
    expect(screen.getByRole("textbox")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Reveal answer/i })
    ).toBeVisible();
  });

  it("renders expanded by default when initialState='expanded'", () => {
    render(<RetrievalCard {...baseProps} initialState='expanded' />);
    expect(screen.getByRole("textbox")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Reveal answer/i })
    ).toBeVisible();
  });

  it("calls onReveal + shows answer + self-assess buttons after Reveal click", () => {
    const onReveal = vi.fn();
    render(
      <RetrievalCard
        {...baseProps}
        initialState='expanded'
        onReveal={onReveal}
      />
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Reveal answer/i }));
    });
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/L goes up by 4x/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Got it/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Partial/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Missed it/i })).toBeVisible();
  });

  it("calls onSelfAssess with the chosen rating", () => {
    const onSelfAssess = vi.fn();
    render(
      <RetrievalCard
        {...baseProps}
        initialState='revealed'
        onSelfAssess={onSelfAssess}
      />
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Partial/i }));
    });
    expect(onSelfAssess).toHaveBeenCalledWith("partial");
  });

  it("calls onResponseChange when the student types", () => {
    const onResponseChange = vi.fn();
    render(
      <RetrievalCard
        {...baseProps}
        initialState='expanded'
        onResponseChange={onResponseChange}
      />
    );
    const textarea = screen.getByRole("textbox");
    act(() => {
      fireEvent.change(textarea, { target: { value: "hi" } });
    });
    expect(onResponseChange).toHaveBeenLastCalledWith("hi");
  });

  it("textarea is aria-described by the prompt for screen-reader context", () => {
    render(<RetrievalCard {...baseProps} initialState='expanded' />);
    const textarea = screen.getByRole("textbox");
    const describedById = textarea.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();
    expect(document.getElementById(describedById ?? "")).toContainHTML(
      "What is L if R doubles"
    );
  });

  it("calls onExpand once per open-from-collapsed transition", () => {
    const onExpand = vi.fn();
    render(<RetrievalCard {...baseProps} onExpand={onExpand} />);

    const trigger = screen.getByRole("button", {
      name: /Retrieval — equation/,
    });
    act(() => {
      fireEvent.click(trigger);
    });
    expect(onExpand).toHaveBeenCalledTimes(1);
    // Collapse + re-expand → +1.
    act(() => {
      fireEvent.click(trigger);
    });
    act(() => {
      fireEvent.click(trigger);
    });
    expect(onExpand).toHaveBeenCalledTimes(2);
  });

  it("emits the bandToken's CSS variable on the card root", () => {
    const { container } = render(
      <RetrievalCard {...baseProps} bandToken='spaced' />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue("--card-band-color")).toMatch(
      /spaced-band/
    );
  });
});
