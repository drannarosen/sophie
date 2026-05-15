import type { EntityType } from "@sophie/core/schema";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ResultList } from "./ResultList.tsx";
import type { SearchResult } from "./types.ts";

const r = (n: number, type: EntityType): SearchResult => ({
  url: `/chapters/c#a-${n}`,
  meta: { title: `result ${n}`, locator: "Ch · Mod" },
  excerpt: `excerpt ${n}`,
  filters: { type: [type] },
});

describe("<ResultList>", () => {
  it("renders empty state when results is empty", () => {
    render(
      <ResultList results={[]} highlightedIndex={0} onSelect={() => {}} />
    );
    expect(screen.getByText(/try typing/i)).toBeInTheDocument();
  });

  it("renders one option per result", () => {
    const results = [r(1, "term"), r(2, "equation"), r(3, "page")];
    render(
      <ResultList results={results} highlightedIndex={0} onSelect={() => {}} />
    );
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("uses aria-activedescendant to mark the highlighted row", () => {
    const results = [r(1, "term"), r(2, "equation")];
    render(
      <ResultList results={results} highlightedIndex={1} onSelect={() => {}} />
    );
    const list = screen.getByRole("listbox");
    const second = screen.getAllByRole("option")[1];
    if (!second) throw new Error("expected a second option");
    expect(list).toHaveAttribute("aria-activedescendant", second.id);
  });

  it("Enter on the document calls onSelect with the highlighted result", () => {
    const onSelect = vi.fn();
    const results = [r(1, "term"), r(2, "equation")];
    render(
      <ResultList results={results} highlightedIndex={1} onSelect={onSelect} />
    );
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(results[1]);
  });

  it("count announcer text matches result count", () => {
    const { rerender } = render(
      <ResultList
        results={[r(1, "term"), r(2, "equation")]}
        highlightedIndex={0}
        onSelect={() => {}}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("2 results");

    rerender(
      <ResultList results={[]} highlightedIndex={0} onSelect={() => {}} />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/no results/i);
  });

  it("axe-core: zero violations on populated state", async () => {
    const results = [r(1, "term"), r(2, "equation")];
    const { container } = render(
      <ResultList results={results} highlightedIndex={0} onSelect={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
