import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, test } from "vitest";
import { FigurePropsSchema } from "./Figure.schema.ts";
import { Figure } from "./Figure.tsx";

describe("<Figure>", () => {
  test("renders a <figure> element with the supplied id", () => {
    const { container } = render(
      <Figure id='fig-1' aria-labelledby='fig-1-title'>
        <header id='fig-1-title'>Stub title</header>
      </Figure>
    );
    const fig = container.querySelector("figure");
    expect(fig).not.toBeNull();
    expect(fig?.id).toBe("fig-1");
  });

  test("forwards aria-labelledby to the underlying figure", () => {
    const { container } = render(
      <Figure id='fig-2' aria-labelledby='fig-2-title'>
        <header id='fig-2-title'>Title</header>
      </Figure>
    );
    expect(
      container.querySelector("figure")?.getAttribute("aria-labelledby")
    ).toBe("fig-2-title");
  });

  test("renders children in source order (slot composition)", () => {
    const { container } = render(
      <Figure id='fig-3' aria-labelledby='fig-3-title'>
        <header id='fig-3-title'>T</header>
        <div data-testid='controls'>C</div>
        <div data-testid='body'>B</div>
        <figcaption>Cap</figcaption>
      </Figure>
    );
    const fig = container.querySelector("figure");
    expect(fig).not.toBeNull();
    const tags = Array.from(fig?.children ?? []).map((c) =>
      c.tagName.toLowerCase()
    );
    expect(tags).toEqual(["header", "div", "div", "figcaption"]);
  });

  test("applies data-epistemic-role when role prop is provided", () => {
    const { container } = render(
      <Figure id='fig-4' epistemicRole='model' aria-labelledby='fig-4-title'>
        <header id='fig-4-title'>T</header>
      </Figure>
    );
    expect(
      container.querySelector("figure")?.getAttribute("data-epistemic-role")
    ).toBe("model");
  });

  test("omits data-epistemic-role when role prop is absent", () => {
    const { container } = render(
      <Figure id='fig-5' aria-labelledby='fig-5-title'>
        <header id='fig-5-title'>T</header>
      </Figure>
    );
    expect(
      container.querySelector("figure")?.hasAttribute("data-epistemic-role")
    ).toBe(false);
  });

  test("does not spread the epistemic role onto the figure as an ARIA role attribute", () => {
    // Guards against accidentally spreading `role` (the epistemic prop)
    // onto the DOM as the standard HTML `role=` attribute, which would
    // override the implicit `figure` ARIA role.
    const { container } = render(
      <Figure
        id='fig-aria'
        epistemicRole='observable'
        aria-labelledby='fig-aria-title'
      >
        <header id='fig-aria-title'>T</header>
      </Figure>
    );
    const fig = container.querySelector("figure");
    expect(fig?.getAttribute("role")).toBeNull();
  });

  test("axe-core: no a11y violations when labelled via aria-labelledby", async () => {
    const { container } = render(
      <Figure id='fig-a11y' aria-labelledby='fig-a11y-title'>
        <header id='fig-a11y-title'>Blackbody Spectrum</header>
        <p>A figure with a label.</p>
      </Figure>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("schema rejects an empty id", () => {
    const result = FigurePropsSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  test("schema accepts all 8 ADR-0058 epistemic roles for the role prop", () => {
    const roles = [
      "observable",
      "model",
      "inference",
      "assumption",
      "approximation",
      "uncertainty",
      "numerical",
      "misconception",
    ];
    for (const role of roles) {
      const result = FigurePropsSchema.safeParse({
        id: "x",
        epistemicRole: role,
      });
      expect(result.success).toBe(true);
    }
  });

  test("schema rejects an unknown role value", () => {
    const result = FigurePropsSchema.safeParse({
      id: "x",
      epistemicRole: "vibes",
    });
    expect(result.success).toBe(false);
  });
});
