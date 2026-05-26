import type { Contact } from "@sophie/core/schema";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ContactCard } from "./ContactCard.tsx";

const FIXTURE: Contact = {
  email: "alrosen@sdsu.edu",
  response_window_hours: 24,
  async_channel: { kind: "canvas-msg", ref: "course-channel" },
};

describe("<ContactCard>", () => {
  it("renders a labeled <section> landmark (R10)", () => {
    const { container } = render(
      <ContactCard contact={FIXTURE} instructor='Anna Rosen' />
    );
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-labelledby"
    );
  });

  it("renders the email as a mailto link", () => {
    render(<ContactCard contact={FIXTURE} instructor='Anna Rosen' />);
    const link = screen.getByRole("link", { name: /alrosen@sdsu.edu/ });
    expect(link).toHaveAttribute("href", "mailto:alrosen@sdsu.edu");
  });

  it("renders the response window", () => {
    render(<ContactCard contact={FIXTURE} instructor='Anna Rosen' />);
    expect(screen.getByText(/24.*hour/i)).toBeInTheDocument();
  });

  it("renders the async channel kind + ref when present", () => {
    render(<ContactCard contact={FIXTURE} instructor='Anna Rosen' />);
    expect(screen.getByText(/canvas-msg|Canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/course-channel/)).toBeInTheDocument();
  });

  it("renders the instructor name", () => {
    render(<ContactCard contact={FIXTURE} instructor='Anna Rosen' />);
    expect(screen.getByText(/Anna Rosen/)).toBeInTheDocument();
  });

  it("does not render async_channel block when absent", () => {
    const minimal: Contact = {
      email: "x@y.edu",
      response_window_hours: 48,
    };
    render(<ContactCard contact={minimal} instructor='Test' />);
    expect(screen.queryByText(/canvas|slack|discord/i)).toBeNull();
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <ContactCard contact={FIXTURE} instructor='Anna Rosen' />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
