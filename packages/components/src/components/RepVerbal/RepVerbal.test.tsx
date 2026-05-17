import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { RepVerbalPropsSchema } from "./RepVerbal.schema.ts";
import { RepVerbal } from "./RepVerbal.tsx";

describe("<RepVerbal>", () => {
  it("renders author-mode children verbatim", () => {
    render(<RepVerbal>The distance from the central mass.</RepVerbal>);
    expect(
      screen.getByText("The distance from the central mass.")
    ).toBeInTheDocument();
  });

  it("renders extractor-fed `body` prop when no children", () => {
    render(<RepVerbal body='Extractor-supplied prose body.' />);
    expect(
      screen.getByText("Extractor-supplied prose body.")
    ).toBeInTheDocument();
  });

  it("prefers children over body when both are present (authoring wins)", () => {
    render(<RepVerbal body='extractor body'>author children</RepVerbal>);
    expect(screen.getByText("author children")).toBeInTheDocument();
    expect(screen.queryByText("extractor body")).not.toBeInTheDocument();
  });

  it("emits a 'verbal' role pill (matches the MultiRep card visual idiom)", () => {
    render(<RepVerbal>body</RepVerbal>);
    expect(screen.getByText("verbal")).toBeInTheDocument();
  });

  it("carries data-rep-kind='verbal' for extractor + audit lookups", () => {
    const { container } = render(<RepVerbal>body</RepVerbal>);
    expect(container.querySelector("[data-rep-kind='verbal']")).not.toBeNull();
  });

  it("passes axe accessibility checks", async () => {
    const { container } = render(
      <RepVerbal>The orbital radius is the instantaneous distance.</RepVerbal>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("RepVerbalPropsSchema", () => {
  it("accepts children-only props", () => {
    const result = RepVerbalPropsSchema.safeParse({ children: "body" });
    expect(result.success).toBe(true);
  });

  it("accepts body-only props", () => {
    const result = RepVerbalPropsSchema.safeParse({ body: "extractor body" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (component falls back to undefined render)", () => {
    // Both children and body are optional at the schema level. The
    // component handles the empty case by rendering an empty body
    // container — useful for Storybook scaffolding and audit-stub
    // misuses (which the audit catches separately, not the schema).
    const result = RepVerbalPropsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects empty body string (audit-grade: declared body must be non-empty)", () => {
    const result = RepVerbalPropsSchema.safeParse({ body: "" });
    expect(result.success).toBe(false);
  });
});
