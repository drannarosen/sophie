import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { CommonMisusePropsSchema } from "./CommonMisuse.schema.ts";
import { CommonMisuse } from "./CommonMisuse.tsx";

describe("<CommonMisuse> — schema", () => {
  it("accepts the minimum-valid props (children only)", () => {
    expect(CommonMisusePropsSchema.safeParse({ children: "x" }).success).toBe(
      true
    );
  });

  it("accepts optional `misconception` Slug", () => {
    expect(
      CommonMisusePropsSchema.safeParse({
        misconception: "wiens-law-absorption-spectra",
        children: "x",
      }).success
    ).toBe(true);
  });

  it("rejects a non-Slug `misconception` (uppercase / spaces)", () => {
    expect(
      CommonMisusePropsSchema.safeParse({
        misconception: "Wiens Law Absorption",
        children: "x",
      }).success
    ).toBe(false);
  });
});

describe("<CommonMisuse> — render", () => {
  it("renders the 'Common misuse' label", () => {
    render(<CommonMisuse>Body prose</CommonMisuse>);
    expect(screen.getByText("Common misuse")).toBeInTheDocument();
  });

  it("renders the optional `misconception` slug next to the label when supplied", () => {
    render(
      <CommonMisuse misconception='wiens-law-absorption-spectra'>
        Body
      </CommonMisuse>
    );
    expect(screen.getByText("Common misuse")).toBeInTheDocument();
    expect(
      screen.getByText("wiens-law-absorption-spectra")
    ).toBeInTheDocument();
  });

  it("omits the misconception slug when not supplied", () => {
    render(<CommonMisuse>Body</CommonMisuse>);
    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });

  it("renders the body children verbatim", () => {
    render(
      <CommonMisuse>
        <p>Applying Wien's law to absorption-line spectra.</p>
      </CommonMisuse>
    );
    expect(
      screen.getByText("Applying Wien's law to absorption-line spectra.")
    ).toBeInTheDocument();
  });

  it("exposes data-misconception-ref when `misconception` supplied (audit hook for PR-δ E9)", () => {
    const { container } = render(
      <CommonMisuse misconception='wiens-law-absorption-spectra'>
        Body
      </CommonMisuse>
    );
    expect(
      container.querySelector(
        '[data-misconception-ref="wiens-law-absorption-spectra"]'
      )
    ).not.toBeNull();
  });

  it("does NOT carry data-epistemic-role (the linked misconception node carries 'misconception' per ADR 0058)", () => {
    // The cross-ref entry inherits the role indirectly via the link;
    // duplicating it here would weaken the single-source-of-truth
    // property of the misconception graph.
    const { container } = render(
      <CommonMisuse misconception='x'>Body</CommonMisuse>
    );
    expect(container.querySelector("[data-epistemic-role]")).toBeNull();
  });

  it("uses <aside role='note'> as the landmark", () => {
    render(<CommonMisuse>Body</CommonMisuse>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("has no axe-core violations (no cross-ref form)", async () => {
    const { container } = render(
      <CommonMisuse>
        <p>Applying Wien's law to absorption-line spectra.</p>
      </CommonMisuse>
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("has no axe-core violations (with misconception cross-ref)", async () => {
    const { container } = render(
      <CommonMisuse misconception='wiens-law-absorption-spectra'>
        <p>Applying Wien's law to absorption-line spectra.</p>
      </CommonMisuse>
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
