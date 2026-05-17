import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  BREAKS_WHEN_EPISTEMIC_ROLE,
  BreaksWhenPropsSchema,
} from "./BreaksWhen.schema.ts";
import { BreaksWhen } from "./BreaksWhen.tsx";

describe("<BreaksWhen> — schema", () => {
  it("accepts the minimum-valid props (children only)", () => {
    expect(BreaksWhenPropsSchema.safeParse({ children: "Body." }).success).toBe(
      true
    );
  });
});

describe("BREAKS_WHEN_EPISTEMIC_ROLE", () => {
  it("exports the canonical 'approximation' role string", () => {
    // <BreaksWhen> marks a validity-domain boundary — exactly the
    // approximation contract per ADR 0058.
    expect(BREAKS_WHEN_EPISTEMIC_ROLE).toBe("approximation");
  });
});

describe("<BreaksWhen> — render", () => {
  it("renders the 'Breaks when' label", () => {
    render(<BreaksWhen>Body prose</BreaksWhen>);
    expect(screen.getByText("Breaks when")).toBeInTheDocument();
  });

  it("renders the body children verbatim", () => {
    render(
      <BreaksWhen>
        <p>Non-thermal emission; optically-thin sources.</p>
      </BreaksWhen>
    );
    expect(
      screen.getByText("Non-thermal emission; optically-thin sources.")
    ).toBeInTheDocument();
  });

  it("exposes data-epistemic-role='approximation' for E2E + extractor hooks", () => {
    const { container } = render(<BreaksWhen>Body</BreaksWhen>);
    expect(
      container.querySelector('[data-epistemic-role="approximation"]')
    ).not.toBeNull();
  });

  it("uses <aside role='note'> as the landmark", () => {
    render(<BreaksWhen>Body</BreaksWhen>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("has no axe-core violations", async () => {
    const { container } = render(
      <BreaksWhen>
        <p>Non-thermal emission (synchrotron, masers, line emission).</p>
      </BreaksWhen>
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
