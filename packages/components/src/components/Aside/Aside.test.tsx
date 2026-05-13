import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import type { AsideKind } from "./Aside.schema.ts";
import { Aside } from "./Aside.tsx";

const KINDS: readonly AsideKind[] = [
  "note",
  "definition",
  "digression",
  "key-insight",
];

describe("<Aside>", () => {
  it("renders as a <details> element (native disclosure semantics)", () => {
    render(<Aside>body content</Aside>);
    const details = document.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.tagName).toBe("DETAILS");
  });

  it("defaults kind to 'note' when no kind prop is provided", () => {
    render(<Aside>body</Aside>);
    const details = document.querySelector("details");
    expect(details?.getAttribute("data-aside-kind")).toBe("note");
    expect(screen.getByText("Note")).toBeInTheDocument();
  });

  it.each(KINDS)("renders kind '%s' with its labeled marker", (kind) => {
    const labelByKind: Record<AsideKind, string> = {
      note: "Note",
      definition: "Definition",
      digression: "Digression",
      "key-insight": "Key insight",
    };
    render(<Aside kind={kind}>body</Aside>);
    expect(screen.getByText(labelByKind[kind])).toBeInTheDocument();
    expect(
      document.querySelector(`[data-aside-kind="${kind}"]`)
    ).not.toBeNull();
  });

  it("renders title alongside the kind marker when provided", () => {
    render(
      <Aside kind='definition' title='Parallax'>
        body content
      </Aside>
    );
    expect(screen.getByText("Definition")).toBeInTheDocument();
    expect(screen.getByText("Parallax")).toBeInTheDocument();
  });

  it("omits the title element when no title prop is provided", () => {
    const { container } = render(<Aside kind='note'>body</Aside>);
    // The kind marker is always present; the title span specifically
    // should not appear.
    const summary = container.querySelector("summary");
    expect(summary).not.toBeNull();
    // Only one direct child span (the marker), no title span.
    const spans = summary?.querySelectorAll("span");
    expect(spans?.length).toBe(1);
  });

  it("applies the stable `sophie-aside` class for chrome CSS targeting", () => {
    render(<Aside>body</Aside>);
    const details = document.querySelector("details");
    expect(details?.classList.contains("sophie-aside")).toBe(true);
  });

  it("renders body content inside a body container", () => {
    render(
      <Aside>
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
      </Aside>
    );
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("renders collapsed by default (no `open` attribute)", () => {
    render(<Aside>body</Aside>);
    const details = document.querySelector("details");
    // The component itself doesn't set `open` — the positioning
    // script in @sophie/astro sets it imperatively when entering
    // docked mode. Inline-fallback mode keeps it collapsed.
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("carries the `data-sophie-aside` positioning hook", () => {
    render(<Aside>body</Aside>);
    expect(document.querySelector("[data-sophie-aside]")).not.toBeNull();
  });

  it.each(KINDS)("is axe-clean as kind '%s'", async (kind) => {
    const { container } = render(
      <Aside kind={kind} title='Sample title'>
        <p>Body content of the aside.</p>
      </Aside>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
