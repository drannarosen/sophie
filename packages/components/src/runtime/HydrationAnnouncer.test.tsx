import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HydrationAnnouncer } from "./HydrationAnnouncer.tsx";

describe("<HydrationAnnouncer>", () => {
  it("renders an aria-live polite region (visually hidden)", () => {
    render(<HydrationAnnouncer hydrated={false} label='Test ready' />);
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders empty while hydrated=false (no premature announcement)", () => {
    render(<HydrationAnnouncer hydrated={false} label='Test ready' />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("populates with the label once hydrated=true", () => {
    const { rerender } = render(
      <HydrationAnnouncer hydrated={false} label='Comprehension check ready' />
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    rerender(
      <HydrationAnnouncer hydrated={true} label='Comprehension check ready' />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Comprehension check ready"
    );
  });

  it("stays populated on subsequent hydrated transitions (no flicker)", () => {
    // If a component re-renders, hydrated stays true. The announcer
    // should not toggle text content on/off — that would spam the
    // live region with the same announcement.
    const { rerender } = render(
      <HydrationAnnouncer hydrated={true} label='Card ready' />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Card ready");
    rerender(<HydrationAnnouncer hydrated={true} label='Card ready' />);
    expect(screen.getByRole("status")).toHaveTextContent("Card ready");
  });
});
