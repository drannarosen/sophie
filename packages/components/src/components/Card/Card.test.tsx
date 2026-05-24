import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Card } from "./Card.tsx";

describe("<Card> (chrome primitive)", () => {
  it("renders body content", () => {
    render(<Card>Body content.</Card>);
    expect(screen.getByText("Body content.")).toBeInTheDocument();
  });

  it("renders as a plain <div> (non-landmark) when no title or header slot is provided", () => {
    const { container } = render(<Card>Bare body.</Card>);
    expect(container.querySelector("section")).toBeNull();
    expect(container.querySelector("header")).toBeNull();
  });

  it("renders as <section aria-labelledby> when `title` is provided (R10 named-region landmark)", () => {
    const { container } = render(<Card title='Spectra'>Body.</Card>);
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    const labelledBy = section?.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    if (labelledBy) {
      const target = container.querySelector(`#${CSS.escape(labelledBy)}`);
      expect(target?.textContent).toBe("Spectra");
    }
  });

  it("renders as <section aria-labelledby> when `Card.Header` slot is provided", () => {
    const { container } = render(
      <Card>
        <Card.Header>Custom heading</Card.Header>
        Body.
      </Card>
    );
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    const labelledBy = section?.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    if (labelledBy) {
      const target = container.querySelector(`#${CSS.escape(labelledBy)}`);
      expect(target?.textContent).toBe("Custom heading");
    }
  });

  it("Card.Header slot wins when both `title` and `Card.Header` are present (Q3 lock)", () => {
    const { container } = render(
      <Card title='IgnoredTitle'>
        <Card.Header>SlotHeading</Card.Header>
        Body.
      </Card>
    );
    // Exactly one <header> in the DOM — the slot, not an auto-generated one.
    const headers = container.querySelectorAll("header");
    expect(headers).toHaveLength(1);
    expect(headers[0]?.textContent).toBe("SlotHeading");
  });

  it("renders Card.Footer slot when provided", () => {
    const { container } = render(
      <Card title='X'>
        Body.
        <Card.Footer>FooterText</Card.Footer>
      </Card>
    );
    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toBe("FooterText");
  });

  it("applies the `id` prop to the root <section> (titled form)", () => {
    const { container } = render(
      <Card title='X' id='my-anchor'>
        Body.
      </Card>
    );
    expect(container.querySelector("section")?.id).toBe("my-anchor");
  });

  it("applies the `id` prop to the root <div> (plain form)", () => {
    const { container } = render(<Card id='plain-anchor'>Body.</Card>);
    expect(container.firstElementChild?.id).toBe("plain-anchor");
  });

  it("concatenates the optional `className` prop", () => {
    const { container } = render(<Card className='extra-class'>Body.</Card>);
    expect(container.firstElementChild?.className).toContain("extra-class");
  });

  it("has zero axe violations (plain form)", async () => {
    const { container } = render(<Card>Bare body.</Card>);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations (with title)", async () => {
    const { container } = render(
      <Card title='Accessible title'>
        <p>Body prose.</p>
      </Card>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations (full anatomy: header + body + footer)", async () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
        <p>Body prose.</p>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
