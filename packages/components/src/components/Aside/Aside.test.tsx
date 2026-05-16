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
  "misconception",
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

  const KINDS_WITH_MARKER = [
    "note",
    "digression",
    "key-insight",
    "misconception",
  ] as const;

  it.each(
    KINDS_WITH_MARKER
  )("renders kind '%s' with its small-caps marker label", (kind) => {
    const labelByKind: Record<(typeof KINDS_WITH_MARKER)[number], string> = {
      note: "Note",
      digression: "Digression",
      "key-insight": "Key insight",
      misconception: "Misconception",
    };
    render(<Aside kind={kind}>body</Aside>);
    expect(screen.getByText(labelByKind[kind])).toBeInTheDocument();
    expect(
      document.querySelector(`[data-aside-kind="${kind}"]`)
    ).not.toBeNull();
  });

  it("renders the bolded title (not a 'Definition' marker) for kind='definition'", () => {
    // Tier-3 dissolution: the defined term IS the variant label.
    // No "DEFINITION" small-caps marker is rendered.
    render(
      <Aside kind='definition' title='Parallax'>
        body content
      </Aside>
    );
    expect(screen.getByText("Parallax")).toBeInTheDocument();
    expect(screen.queryByText("Definition")).not.toBeInTheDocument();
  });

  it("renders both small-caps marker and bolded title for non-definition kinds with a title", () => {
    render(
      <Aside kind='note' title='Why this matters'>
        body content
      </Aside>
    );
    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getByText("Why this matters")).toBeInTheDocument();
  });

  it("omits the title element when no title prop is provided (non-definition)", () => {
    const { container } = render(<Aside kind='note'>body</Aside>);
    const summary = container.querySelector("summary");
    expect(summary).not.toBeNull();
    // Only one direct child span (the marker), no title span.
    const spans = summary?.querySelectorAll("span");
    expect(spans?.length).toBe(1);
  });

  it("does not apply per-variant accent CSS classes (dissolution drops accent color)", () => {
    // Tier-3 dissolution uses a uniform muted left rule across all
    // variants; variant signal lives in the marker text alone. The
    // pre-rebuild CSS used `.note`, `.definition`, etc. classes to
    // override `border-left-color` per kind. This regression guard
    // ensures those classes are not re-introduced on the root.
    for (const kind of KINDS) {
      const { container, unmount } = render(
        <Aside kind={kind} title='T'>
          body
        </Aside>
      );
      const details = container.querySelector("details");
      expect(details).not.toBeNull();
      const classes = details ? Array.from(details.classList) : [];
      // No class name should match any of the kind slugs verbatim
      // (the CSS-modules hashed name takes the form `_kind_<hash>`).
      for (const k of KINDS) {
        expect(classes).not.toContain(k);
      }
      unmount();
    }
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

  it("auto-derives the DOM id from the title for kind='definition'", () => {
    render(
      <Aside kind='definition' title='Standard candle'>
        body
      </Aside>
    );
    const details = document.querySelector("details");
    expect(details?.id).toBe("standard-candle");
  });

  it("honors an explicit `id` prop overriding the auto-derived slug", () => {
    render(
      <Aside kind='definition' title='Standard candle' id='custom-anchor'>
        body
      </Aside>
    );
    const details = document.querySelector("details");
    expect(details?.id).toBe("custom-anchor");
  });

  it("omits the DOM id for kinds other than 'definition' unless explicitly provided", () => {
    render(
      <Aside kind='note' title='A note'>
        body
      </Aside>
    );
    const details = document.querySelector("details");
    expect(details?.hasAttribute("id")).toBe(false);
  });

  it("honors an explicit `id` even for non-definition kinds", () => {
    render(
      <Aside kind='key-insight' id='my-insight'>
        body
      </Aside>
    );
    const details = document.querySelector("details");
    expect(details?.id).toBe("my-insight");
  });
});
