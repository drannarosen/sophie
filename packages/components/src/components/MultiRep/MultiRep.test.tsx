import type { SerializedRep } from "@sophie/core/schema";
import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { MultiRepPropsSchema } from "./MultiRep.schema.ts";
import { MultiRep } from "./MultiRep.tsx";

const verbalRep: SerializedRep = {
  kind: "verbal",
  body: "The orbital radius is the distance from the central mass.",
};
const equationRep: SerializedRep = {
  kind: "equation",
  refKey: "kepler-3rd-law",
  symbol: "r",
};
const figureRep: SerializedRep = {
  kind: "figure",
  refName: "orbit-geometry",
  symbolLabel: "r",
};

describe("<MultiRep>", () => {
  it("renders the framed binding card with the concept-label header", () => {
    render(
      <MultiRep
        concept='orbital-radius'
        conceptLabel='orbital radius'
        reps={[verbalRep, equationRep]}
      />
    );
    const region = screen.getByRole("region", { name: /orbital radius/i });
    expect(region).toBeInTheDocument();
    // The header surfaces both the kind label ("concept") and the
    // registry verbal_label.
    expect(within(region).getByText("concept")).toBeInTheDocument();
    expect(within(region).getByText("orbital radius")).toBeInTheDocument();
  });

  it("falls back to the concept slug when conceptLabel is absent", () => {
    render(<MultiRep concept='orbital-radius' reps={[verbalRep]} />);
    // No conceptLabel passed; the header shows the slug.
    expect(screen.getByText("orbital-radius")).toBeInTheDocument();
  });

  it("auto-derives the anchor id from concept slug when `id` is omitted", () => {
    const { container } = render(
      <MultiRep concept='orbital-radius' reps={[verbalRep]} />
    );
    expect(container.querySelector("#mr-orbital-radius")).not.toBeNull();
  });

  it("uses author-supplied `id` over the auto-derived one", () => {
    const { container } = render(
      <MultiRep concept='orbital-radius' id='binding-1' reps={[verbalRep]} />
    );
    expect(container.querySelector("#binding-1")).not.toBeNull();
    expect(container.querySelector("#mr-orbital-radius")).toBeNull();
  });

  it("carries data-multirep-concept for extractor + audit lookups", () => {
    const { container } = render(
      <MultiRep concept='orbital-radius' reps={[verbalRep]} />
    );
    expect(
      container.querySelector("[data-multirep-concept='orbital-radius']")
    ).not.toBeNull();
  });

  it("sorts reps into canonical order regardless of source order (verbal → equation → figure)", () => {
    const { container } = render(
      <MultiRep
        concept='orbital-radius'
        reps={[figureRep, equationRep, verbalRep]}
      />
    );
    // Read rendered rep cells in DOM order.
    const repCells = Array.from(
      container.querySelectorAll("[data-rep-kind]")
    ).map((el) => el.getAttribute("data-rep-kind"));
    expect(repCells).toEqual(["verbal", "equation", "figure"]);
  });

  it("renders multiple equations in source order (multiple of one kind preserved within their bucket)", () => {
    const equationRep2: SerializedRep = {
      kind: "equation",
      refKey: "kepler-3rd-law-au-form",
      symbol: "r_au",
      equivalent_to: "kepler-3rd-law",
      via: "natural-units-substitution",
    };
    const { container } = render(
      <MultiRep
        concept='orbital-radius'
        reps={[equationRep, equationRep2, verbalRep]}
      />
    );
    // After canonical sort: verbal first, then both equations in
    // their relative source order.
    const repCells = Array.from(
      container.querySelectorAll("[data-rep-kind]")
    ).map((el) => el.getAttribute("data-rep-kind"));
    expect(repCells).toEqual(["verbal", "equation", "equation"]);
    // The second equation's equivalent-to footnote renders.
    expect(screen.getByText(/equivalent to/i)).toBeInTheDocument();
    expect(screen.getByText("natural-units-substitution")).toBeInTheDocument();
  });

  it("renders only the rep kinds actually present (binding-of-two is valid)", () => {
    render(
      <MultiRep
        concept='orbital-radius'
        conceptLabel='orbital radius'
        reps={[verbalRep, equationRep]}
      />
    );
    // Verbal + equation render; no figure cell.
    expect(screen.getByText("verbal")).toBeInTheDocument();
    expect(screen.getByText("equation")).toBeInTheDocument();
    expect(screen.queryByText("figure")).not.toBeInTheDocument();
  });

  it("renders binding-of-one (the chapter introduces only verbal handle)", () => {
    render(<MultiRep concept='orbital-radius' reps={[verbalRep]} />);
    expect(screen.getByText("verbal")).toBeInTheDocument();
    expect(screen.queryByText("equation")).not.toBeInTheDocument();
    expect(screen.queryByText("figure")).not.toBeInTheDocument();
  });

  it("passes axe accessibility checks with all three reps", async () => {
    const { container } = render(
      <MultiRep
        concept='orbital-radius'
        conceptLabel='orbital radius'
        reps={[verbalRep, equationRep, figureRep]}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("MultiRepPropsSchema", () => {
  it("accepts the minimum-valid props (concept + reps with one entry)", () => {
    const result = MultiRepPropsSchema.safeParse({
      concept: "orbital-radius",
      reps: [{ kind: "verbal", body: "body text" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty reps array (audit MR1's prerequisite — schema-gated)", () => {
    const result = MultiRepPropsSchema.safeParse({
      concept: "orbital-radius",
      reps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-Slug concept", () => {
    const result = MultiRepPropsSchema.safeParse({
      concept: "UPPER",
      reps: [{ kind: "verbal", body: "body" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional conceptLabel + id + layout", () => {
    const result = MultiRepPropsSchema.safeParse({
      concept: "orbital-radius",
      conceptLabel: "orbital radius",
      id: "mr-orbital-radius",
      layout: "grid",
      reps: [{ kind: "verbal", body: "body" }],
    });
    expect(result.success).toBe(true);
  });
});
