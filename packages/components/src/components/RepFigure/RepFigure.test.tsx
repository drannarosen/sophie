import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { RepFigurePropsSchema } from "./RepFigure.schema.ts";
import { RepFigure } from "./RepFigure.tsx";

describe("<RepFigure>", () => {
  it("renders the refName with the figure role pill", () => {
    render(<RepFigure refName='orbit-geometry' />);
    expect(screen.getByText("figure")).toBeInTheDocument();
    expect(screen.getByText("orbit-geometry")).toBeInTheDocument();
  });

  it("renders the optional symbolLabel inline when declared", () => {
    render(<RepFigure refName='orbit-geometry' symbolLabel='r' />);
    expect(screen.getByText("r")).toBeInTheDocument();
  });

  it("omits the symbolLabel sub-block when not declared", () => {
    const { container } = render(<RepFigure refName='orbit-geometry' />);
    // The symbol-label parens-wrapped span only renders when symbolLabel
    // is present; no parenthetical noise on the visual surface otherwise.
    expect(container.textContent).not.toMatch(/\(\s*\)/);
  });

  it("carries data-rep-kind='figure' for extractor + audit lookups", () => {
    const { container } = render(<RepFigure refName='orbit-geometry' />);
    expect(container.querySelector("[data-rep-kind='figure']")).not.toBeNull();
  });

  it("passes axe accessibility checks", async () => {
    const { container } = render(
      <RepFigure refName='orbit-geometry' symbolLabel='r' />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("RepFigurePropsSchema", () => {
  it("accepts the minimum-valid props (refName only)", () => {
    const result = RepFigurePropsSchema.safeParse({
      refName: "orbit-geometry",
    });
    expect(result.success).toBe(true);
  });

  it("accepts both refName + symbolLabel", () => {
    const result = RepFigurePropsSchema.safeParse({
      refName: "orbit-geometry",
      symbolLabel: "r",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing refName", () => {
    const result = RepFigurePropsSchema.safeParse({ symbolLabel: "r" });
    expect(result.success).toBe(false);
  });

  it("rejects empty refName or empty symbolLabel", () => {
    expect(RepFigurePropsSchema.safeParse({ refName: "" }).success).toBe(false);
    expect(
      RepFigurePropsSchema.safeParse({
        refName: "fig",
        symbolLabel: "",
      }).success
    ).toBe(false);
  });
});
