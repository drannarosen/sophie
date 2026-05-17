import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Intervention } from "./Intervention.tsx";

describe("<Intervention>", () => {
  it("renders the canonical type slug as the type-pill label", () => {
    render(
      <Intervention type='contrasting-cases' addresses='this'>
        Body prose
      </Intervention>
    );
    expect(screen.getByText("contrasting-cases")).toBeInTheDocument();
  });

  it("resolves and renders the citation chip from intervention-index.ts for canonical types", () => {
    render(
      <Intervention type='contrasting-cases' addresses='this'>
        Body prose
      </Intervention>
    );
    // Bransford & Schwartz 1999 is the canonical citation for contrasting-cases per ADR 0044 design §D1
    expect(screen.getByText(/Bransford & Schwartz 1999/)).toBeInTheDocument();
  });

  it("renders the author-supplied name (NOT the type slug) when type=custom", () => {
    render(
      <Intervention type='custom' name='scale-comparison' addresses='this'>
        Body prose
      </Intervention>
    );
    expect(screen.getByText("scale-comparison")).toBeInTheDocument();
    // Custom interventions get a "custom" annotation pill so readers/instructors can spot non-canonical moves
    expect(screen.getByText("custom")).toBeInTheDocument();
  });

  it("omits the citation chip for custom interventions (no canonical citation)", () => {
    const { container } = render(
      <Intervention type='custom' name='ad-hoc-move' addresses='this'>
        Body prose
      </Intervention>
    );
    // No canonical entry → no citation text in the title bar
    expect(container.textContent).not.toMatch(/Bransford|Clement|Chi|Liem/);
  });

  it("omits the citation chip for unknown canonical names (graceful degradation; PR-δ I2 audit catches at build)", () => {
    // The component degrades gracefully when given a type slug not in
    // the library (a runtime mistake the I2 audit will surface at
    // build time). It still renders the pill so the reader sees the
    // intervention rather than a hard error.
    const { container } = render(
      // biome-ignore lint/suspicious/noExplicitAny: testing schema-permissive runtime behavior
      <Intervention type={"made-up-name" as any} addresses='this'>
        Body prose
      </Intervention>
    );
    expect(screen.getByText("made-up-name")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/·/); // no citation separator
  });

  it("OMITS the leading addresses header when nested in a misconception (addresses='this')", () => {
    render(
      <Intervention type='contrasting-cases' addresses='this'>
        Body prose
      </Intervention>
    );
    // Visual context (intervention nested in misconception Aside)
    // conveys what's addressed; we don't surface the literal "this"
    // string as a header.
    expect(screen.queryByText(/Addresses:/)).not.toBeInTheDocument();
  });

  it("RENDERS the leading addresses header when standalone (single slug)", () => {
    render(
      <Intervention type='refutation-text' addresses='universe-with-a-center'>
        Body prose
      </Intervention>
    );
    expect(screen.getByText(/Addresses:/)).toBeInTheDocument();
    expect(screen.getByText("universe-with-a-center")).toBeInTheDocument();
  });

  it("renders comma-separated slugs in the header for multi-target addresses (array form)", () => {
    render(
      <Intervention type='refutation-text' addresses={["misc-a", "misc-b"]}>
        Body prose
      </Intervention>
    );
    // The audit normalizes single vs array, but the renderer must surface
    // every target so readers see the full pairing scope.
    expect(screen.getByText("misc-a, misc-b")).toBeInTheDocument();
  });

  it("filters out 'this' from a mixed-array addresses list, surfacing only explicit slugs in the header", () => {
    // Mixed-array case: an authoring or extractor intermediate state
    // where `["this", "explicit-slug"]` is supplied. Hiding the entire
    // header would suppress information; the component instead filters
    // out `"this"` and renders the remaining explicit slug(s).
    render(
      <Intervention
        type='refutation-text'
        addresses={["this", "explicit-slug"]}
      >
        Body prose
      </Intervention>
    );
    expect(screen.getByText(/Addresses:/)).toBeInTheDocument();
    expect(screen.getByText("explicit-slug")).toBeInTheDocument();
    // The literal "this" must NOT appear in the displayed list.
    expect(screen.queryByText(/^this$/)).not.toBeInTheDocument();
  });

  it("renders the id prop on the rendered <aside> (so #anchor hash navigation lands here, :target highlights)", () => {
    const { container } = render(
      <Intervention
        id='intervention-contrasting-cases-1'
        type='contrasting-cases'
        addresses='this'
      >
        Body prose
      </Intervention>
    );
    expect(
      container.querySelector("#intervention-contrasting-cases-1")
    ).not.toBeNull();
  });

  it("renders the optional limits sub-section when `limits` prop is supplied", () => {
    render(
      <Intervention
        type='bridging-analogy'
        addresses='this'
        limits="Bread has an outside; the universe doesn't."
      >
        Body prose
      </Intervention>
    );
    expect(screen.getByText("Limits:")).toBeInTheDocument();
    expect(
      screen.getByText(/Bread has an outside; the universe doesn't/)
    ).toBeInTheDocument();
  });

  it("omits the limits sub-section when `limits` prop is absent", () => {
    render(
      <Intervention type='contrasting-cases' addresses='this'>
        Body prose
      </Intervention>
    );
    expect(screen.queryByText("Limits:")).not.toBeInTheDocument();
  });

  it("renders children verbatim (paragraphs, lists, strong, em)", () => {
    render(
      <Intervention type='contrasting-cases' addresses='this'>
        <p>Framing prose.</p>
        <ul>
          <li>
            <strong>Predict:</strong> what would you observe?
          </li>
          <li>
            <em>Reveal:</em> isotropic flow.
          </li>
        </ul>
      </Intervention>
    );
    expect(screen.getByText("Framing prose.")).toBeInTheDocument();
    expect(screen.getByText("Predict:")).toBeInTheDocument();
    expect(screen.getByText("Reveal:")).toBeInTheDocument();
  });

  it("uses <aside role='note'> as the landmark (intervention is a tangential resolution to the misconception's note)", () => {
    render(
      <Intervention type='contrasting-cases' addresses='this'>
        Body prose
      </Intervention>
    );
    // The component is structurally a tangential resolution paired
    // with the parent misconception. role='note' aligns with the
    // Callout/Aside vocabulary used elsewhere for sidebar-like content.
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("exposes the type as data-intervention-type for E2E hooks", () => {
    const { container } = render(
      <Intervention type='bridging-analogy' addresses='this'>
        Body
      </Intervention>
    );
    expect(
      container.querySelector('[data-intervention-type="bridging-analogy"]')
    ).not.toBeNull();
  });

  it("isolates aria-labelledby ids between two instances (no cross-talk)", () => {
    const { container } = render(
      <>
        <Intervention type='contrasting-cases' addresses='this'>
          Alpha
        </Intervention>
        <Intervention type='bridging-analogy' addresses='this'>
          Beta
        </Intervention>
      </>
    );
    const asides = container.querySelectorAll('[role="note"]');
    expect(asides.length).toBe(2);
    const idA = asides[0]?.getAttribute("aria-labelledby");
    const idB = asides[1]?.getAttribute("aria-labelledby");
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });

  it("has no axe-core accessibility violations (nested-in-misconception form)", async () => {
    const { container } = render(
      <Intervention type='contrasting-cases' addresses='this'>
        <p>
          Predict what you'd observe if the universe had a center, then compare.
        </p>
      </Intervention>
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("has no axe-core accessibility violations (standalone form with addresses header)", async () => {
    const { container } = render(
      <Intervention
        type='bridging-analogy'
        addresses='universe-with-a-center'
        limits="Bread has an outside; the universe doesn't."
      >
        <p>Bread baking with raisins: from any raisin's perspective…</p>
      </Intervention>
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("has no axe-core accessibility violations (custom form with name override)", async () => {
    const { container } = render(
      <Intervention
        type='custom'
        name='scale-comparison'
        addresses='stars-are-points'
      >
        <p>Compare 10^21 m to 10^23 m.</p>
      </Intervention>
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
