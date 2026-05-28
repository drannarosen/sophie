import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabsController } from "./TabsController.tsx";

/**
 * `<TabsController>` is a null-render behavior island over the STATIC
 * ARIA-tabs DOM that `sophieCompoundExpandRemarkPlugin` emits at
 * MDX-compile time (Task 6). React never renders the buttons + panels —
 * so these tests hand-write that static DOM as a fixture (the exact
 * shape the transform produces: `<div data-sophie-tabs
 * data-tabs-id="${id}">` → `<div role="tablist">` of `<button
 * role="tab">` triggers + sibling `<div role="tabpanel">` panels with
 * `aria-controls` / `aria-labelledby` / `aria-selected` / `tabindex` /
 * `hidden` already set as the transform would set them on first render)
 * and mount the controller alongside it. The controller wires click +
 * keyboard activation onto the existing buttons.
 *
 * R11: this is a null-render side-effect island with no component-owned
 * DOM to scan, so it's excluded from the axe-on-render gate
 * (`scripts/lint-axe-render.ts`) — mirrors `MCQController` /
 * `MultiSelectController` / `FillBlankController` / `ParameterCursor`.
 */

const ID = "tabs-controller-test";

/**
 * Hand-written static fixture matching the transform's emitted shape:
 * three tabs (`a`, `b`, `c`); tab `a` is the default — `aria-selected
 * = "true"`, `tabindex="0"`, panel visible; the others are
 * `aria-selected="false"`, `tabindex="-1"`, panel `hidden`.
 */
function TabsFixture() {
  return (
    <div data-sophie-tabs='' data-tabs-id={ID}>
      <div role='tablist' aria-label='Tabs'>
        <button
          type='button'
          role='tab'
          id={`${ID}-tab-a`}
          aria-controls={`${ID}-panel-a`}
          aria-selected='true'
          tabIndex={0}
        >
          A
        </button>
        <button
          type='button'
          role='tab'
          id={`${ID}-tab-b`}
          aria-controls={`${ID}-panel-b`}
          aria-selected='false'
          tabIndex={-1}
        >
          B
        </button>
        <button
          type='button'
          role='tab'
          id={`${ID}-tab-c`}
          aria-controls={`${ID}-panel-c`}
          aria-selected='false'
          tabIndex={-1}
        >
          C
        </button>
      </div>
      <div role='tabpanel' id={`${ID}-panel-a`} aria-labelledby={`${ID}-tab-a`}>
        Body A
      </div>
      <div
        role='tabpanel'
        id={`${ID}-panel-b`}
        aria-labelledby={`${ID}-tab-b`}
        hidden
      >
        Body B
      </div>
      <div
        role='tabpanel'
        id={`${ID}-panel-c`}
        aria-labelledby={`${ID}-tab-c`}
        hidden
      >
        Body C
      </div>
      <TabsController id={ID} />
    </div>
  );
}

/**
 * Variant fixture where tab `b` is the default (mirrors a transform
 * output with `defaultLabel="B"`). Used to strengthen the no-flash
 * assertion: a controller that incorrectly forced selection to index 0
 * on mount would pass against `TabsFixture` but fail here.
 */
function TabsFixtureDefaultB() {
  return (
    <div data-sophie-tabs='' data-tabs-id={ID}>
      <div role='tablist' aria-label='Tabs'>
        <button
          type='button'
          role='tab'
          id={`${ID}-tab-a`}
          aria-controls={`${ID}-panel-a`}
          aria-selected='false'
          tabIndex={-1}
        >
          A
        </button>
        <button
          type='button'
          role='tab'
          id={`${ID}-tab-b`}
          aria-controls={`${ID}-panel-b`}
          aria-selected='true'
          tabIndex={0}
        >
          B
        </button>
        <button
          type='button'
          role='tab'
          id={`${ID}-tab-c`}
          aria-controls={`${ID}-panel-c`}
          aria-selected='false'
          tabIndex={-1}
        >
          C
        </button>
      </div>
      <div
        role='tabpanel'
        id={`${ID}-panel-a`}
        aria-labelledby={`${ID}-tab-a`}
        hidden
      >
        Body A
      </div>
      <div role='tabpanel' id={`${ID}-panel-b`} aria-labelledby={`${ID}-tab-b`}>
        Body B
      </div>
      <div
        role='tabpanel'
        id={`${ID}-panel-c`}
        aria-labelledby={`${ID}-tab-c`}
        hidden
      >
        Body C
      </div>
      <TabsController id={ID} />
    </div>
  );
}

function tab(container: HTMLElement, slug: "a" | "b" | "c"): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>(`#${ID}-tab-${slug}`);
  if (!el) throw new Error(`tab #${ID}-tab-${slug} not found`);
  return el;
}

function panel(container: HTMLElement, slug: "a" | "b" | "c"): HTMLElement {
  const el = container.querySelector<HTMLElement>(`#${ID}-panel-${slug}`);
  if (!el) throw new Error(`panel #${ID}-panel-${slug} not found`);
  return el;
}

describe("<TabsController>", () => {
  it("matches the transform's static aria-selected on mount (no flash)", () => {
    const { container } = render(<TabsFixture />);
    expect(tab(container, "a")).toHaveAttribute("aria-selected", "true");
    expect(tab(container, "a")).toHaveAttribute("tabindex", "0");
    expect(tab(container, "b")).toHaveAttribute("aria-selected", "false");
    expect(tab(container, "c")).toHaveAttribute("aria-selected", "false");
    expect(panel(container, "a")).not.toHaveAttribute("hidden");
    expect(panel(container, "b")).toHaveAttribute("hidden");
    expect(panel(container, "c")).toHaveAttribute("hidden");
  });

  it("respects a non-zero default (no-flash): tab b stays selected on mount", () => {
    // Catches a class of regression where the controller forces selection
    // to index 0 on mount — invisible against the default-a fixture but
    // visibly wrong here.
    const { container } = render(<TabsFixtureDefaultB />);
    expect(tab(container, "a")).toHaveAttribute("aria-selected", "false");
    expect(tab(container, "b")).toHaveAttribute("aria-selected", "true");
    expect(tab(container, "b")).toHaveAttribute("tabindex", "0");
    expect(tab(container, "c")).toHaveAttribute("aria-selected", "false");
    expect(panel(container, "a")).toHaveAttribute("hidden");
    expect(panel(container, "b")).not.toHaveAttribute("hidden");
    expect(panel(container, "c")).toHaveAttribute("hidden");
  });

  it("click on a tab updates aria-selected/tabindex/hidden on all tabs+panels", () => {
    const { container } = render(<TabsFixture />);
    fireEvent.click(tab(container, "b"));
    expect(tab(container, "a")).toHaveAttribute("aria-selected", "false");
    expect(tab(container, "a")).toHaveAttribute("tabindex", "-1");
    expect(tab(container, "b")).toHaveAttribute("aria-selected", "true");
    expect(tab(container, "b")).toHaveAttribute("tabindex", "0");
    expect(tab(container, "c")).toHaveAttribute("aria-selected", "false");
    expect(panel(container, "a")).toHaveAttribute("hidden");
    expect(panel(container, "b")).not.toHaveAttribute("hidden");
    expect(panel(container, "c")).toHaveAttribute("hidden");
  });

  it("ArrowRight from the active tab moves activation + focus and wraps", () => {
    const { container } = render(<TabsFixture />);
    const a = tab(container, "a");
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(tab(container, "b")).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tab(container, "b"));
    fireEvent.keyDown(tab(container, "b"), { key: "ArrowRight" });
    expect(tab(container, "c")).toHaveAttribute("aria-selected", "true");
    // Wrap: ArrowRight from last → first.
    fireEvent.keyDown(tab(container, "c"), { key: "ArrowRight" });
    expect(tab(container, "a")).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tab(container, "a"));
  });

  it("ArrowLeft wraps from the first tab to the last", () => {
    const { container } = render(<TabsFixture />);
    const a = tab(container, "a");
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowLeft" });
    expect(tab(container, "c")).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tab(container, "c"));
  });

  it("Home jumps to the first tab; End jumps to the last", () => {
    const { container } = render(<TabsFixture />);
    fireEvent.click(tab(container, "b"));
    fireEvent.keyDown(tab(container, "b"), { key: "End" });
    expect(tab(container, "c")).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tab(container, "c"));
    fireEvent.keyDown(tab(container, "c"), { key: "Home" });
    expect(tab(container, "a")).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tab(container, "a"));
  });
});
