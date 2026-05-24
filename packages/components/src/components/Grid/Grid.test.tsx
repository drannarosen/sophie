import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Grid } from "./Grid.tsx";

describe("<Grid> (chrome primitive)", () => {
  it("renders as <ul> when given children (semantic list grouping)", () => {
    const { container } = render(
      <Grid cols={2}>
        <span>One</span>
        <span>Two</span>
      </Grid>
    );
    const list = container.querySelector("ul");
    expect(list).not.toBeNull();
  });

  it("wraps each child in a <li> (implicit role='listitem')", () => {
    const { container } = render(
      <Grid cols={3}>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </Grid>
    );
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toBe("A");
    expect(items[1]?.textContent).toBe("B");
    expect(items[2]?.textContent).toBe("C");
  });

  it("supports all four cols variants via inline --grid-cols", () => {
    for (const cols of [1, 2, 3, 4] as const) {
      const { container, unmount } = render(
        <Grid cols={cols}>
          <span>cell</span>
        </Grid>
      );
      const list = container.querySelector("ul") as HTMLElement;
      expect(list.style.getPropertyValue("--grid-cols")).toBe(String(cols));
      unmount();
    }
  });

  it("renders empty grid as a plain <div> (no <ul>)", () => {
    const { container } = render(<Grid cols={3}>{null}</Grid>);
    expect(container.querySelector("ul")).toBeNull();
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it("filters falsy children (null/false/undefined) before wrapping", () => {
    const { container } = render(
      <Grid cols={3}>
        <span>One</span>
        {null}
        {false}
        <span>Two</span>
        {undefined}
      </Grid>
    );
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("applies the `id` prop to the root element", () => {
    const { container } = render(
      <Grid cols={2} id='my-grid'>
        <span>cell</span>
      </Grid>
    );
    expect(container.firstElementChild?.id).toBe("my-grid");
  });

  it("concatenates the optional `className` prop", () => {
    const { container } = render(
      <Grid cols={2} className='extra-class'>
        <span>cell</span>
      </Grid>
    );
    expect(container.firstElementChild?.className).toContain("extra-class");
  });

  it("non-responsive mode omits the responsive class modifier", () => {
    const { container: r } = render(
      <Grid cols={2} responsive={true}>
        <span>cell</span>
      </Grid>
    );
    const { container: nr } = render(
      <Grid cols={2} responsive={false}>
        <span>cell</span>
      </Grid>
    );
    // Responsive class is named "responsive" (CSS-Modules-hashed in
    // production; non-scoped under vitest's classNameStrategy).
    expect(r.firstElementChild?.className).toContain("responsive");
    expect(nr.firstElementChild?.className).not.toContain("responsive");
  });

  it("maps gap='sm' to --sophie-space-2", () => {
    const { container } = render(
      <Grid cols={2} gap='sm'>
        <span>cell</span>
      </Grid>
    );
    const list = container.querySelector("ul") as HTMLElement;
    expect(list.style.getPropertyValue("--grid-gap")).toBe(
      "var(--sophie-space-2)"
    );
  });

  it("has zero axe violations (populated grid)", async () => {
    const { container } = render(
      <Grid cols={2}>
        <span>One</span>
        <span>Two</span>
      </Grid>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations (empty grid — falls back to plain <div>)", async () => {
    const { container } = render(<Grid cols={3}>{null}</Grid>);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations (cols=4, non-responsive)", async () => {
    const { container } = render(
      <Grid cols={4} responsive={false} gap='lg'>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
      </Grid>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
