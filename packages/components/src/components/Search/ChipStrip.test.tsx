import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ChipStrip } from "./ChipStrip.tsx";

describe("<ChipStrip>", () => {
  it("renders one tab per filter value plus 'all'", () => {
    render(<ChipStrip active='all' onChange={() => {}} />);
    const chips = screen.getAllByRole("tab");
    // 'all' + 7 entity types
    expect(chips).toHaveLength(8);
  });

  it("active chip has aria-selected=true", () => {
    render(<ChipStrip active='equation' onChange={() => {}} />);
    const active = screen.getByRole("tab", { name: /equations/i });
    expect(active).toHaveAttribute("aria-selected", "true");
  });

  it("clicking a chip calls onChange with its key", () => {
    const onChange = vi.fn();
    render(<ChipStrip active='all' onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /terms/i }));
    expect(onChange).toHaveBeenCalledWith("term");
  });

  it("Tab cycles chips, Enter toggles", () => {
    const onChange = vi.fn();
    render(<ChipStrip active='all' onChange={onChange} />);
    const chips = screen.getAllByRole("tab");
    const first = chips[0];
    const second = chips[1];
    if (!first || !second)
      throw new Error("expected at least two tabs in the strip");
    first.focus();
    // Move focus to the next chip via Tab, then press Enter to activate.
    fireEvent.keyDown(first, { key: "Tab" });
    second.focus();
    fireEvent.keyDown(second, { key: "Enter" });
    fireEvent.click(second);
    expect(onChange).toHaveBeenCalled();
  });

  it("axe-core: zero violations", async () => {
    const { container } = render(
      <ChipStrip active='equation' onChange={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
