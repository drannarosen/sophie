import {
  Aside,
  Callout,
  ChapterRef,
  Due,
  EquationRef,
  FigureRef,
  type FigureRegistry,
  GlossaryTerm,
  KeyEquation,
  OfficeHours,
  Points,
  Reading,
  Video,
  Week,
  WorkedExample,
} from "@sophie/components";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeChromeComponents, makeStaticComponents } from "./components.tsx";

const registry: FigureRegistry = {
  cosmic: {
    name: "cosmic",
    src: "/figures/cosmic.png",
    alt: "Cosmic test image",
    caption: "From the registry",
  },
};

/**
 * Shared chrome subset surface — declared once so both factory tests
 * verify the same exhaustive key list. If a chrome component is added
 * or removed, this single source-of-truth updates and both factory
 * tests follow.
 */
const expectedChromeKeys = [
  // Inline chrome
  "Aside",
  "Callout",
  "KeyEquation",
  "GlossaryTerm",
  "EquationRef",
  "FigureRef",
  "ChapterRef",
  // Static media chrome
  "Video",
  // Course-management chrome (ADR 0080 Amendment 2)
  "Due",
  "OfficeHours",
  "Points",
  "Reading",
  "Week",
  // Figure (bound to registry via closure)
  "Figure",
] as const;

describe("makeStaticComponents", () => {
  it("returns a map with every chrome key plus pedagogy primitives", () => {
    const components = makeStaticComponents({ figures: registry });
    for (const key of expectedChromeKeys) {
      expect(components).toHaveProperty(key);
    }
    expect(components).toHaveProperty("WorkedExample");
  });

  it("each chrome component reference resolves to the @sophie/components export", () => {
    const components = makeStaticComponents({ figures: registry });
    expect(components.Aside).toBe(Aside);
    expect(components.Callout).toBe(Callout);
    expect(components.KeyEquation).toBe(KeyEquation);
    expect(components.GlossaryTerm).toBe(GlossaryTerm);
    expect(components.EquationRef).toBe(EquationRef);
    expect(components.FigureRef).toBe(FigureRef);
    expect(components.ChapterRef).toBe(ChapterRef);
    expect(components.Video).toBe(Video);
    expect(components.Due).toBe(Due);
    expect(components.OfficeHours).toBe(OfficeHours);
    expect(components.Points).toBe(Points);
    expect(components.Reading).toBe(Reading);
    expect(components.Week).toBe(Week);
    expect(components.WorkedExample).toBe(WorkedExample);
  });

  it("returns a Callout component identical to @sophie/components export", () => {
    const components = makeStaticComponents({ figures: registry });
    render(<components.Callout variant='tip'>Hello</components.Callout>);
    expect(screen.getByRole("note", { name: "Tip" })).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("Figure resolves a name through the bound registry", () => {
    const { Figure } = makeStaticComponents({ figures: registry });
    render(<Figure name='cosmic' />);
    const img = screen.getByRole("img", { name: "Cosmic test image" });
    expect(img).toHaveAttribute("src", "/figures/cosmic.png");
    expect(screen.getByText("From the registry")).toBeInTheDocument();
  });

  it("Figure renders inline mode when src + alt supplied", () => {
    const { Figure } = makeStaticComponents({ figures: registry });
    render(<Figure src='/foo.png' alt='Inline image' caption='Inline cap' />);
    expect(screen.getByRole("img", { name: "Inline image" })).toHaveAttribute(
      "src",
      "/foo.png"
    );
    expect(screen.getByText("Inline cap")).toBeInTheDocument();
  });

  it("Figure renders missing-figure placeholder when name not in registry", () => {
    const { Figure } = makeStaticComponents({ figures: registry });
    render(<Figure name='unknown-figure' />);
    expect(screen.getByText(/Missing figure/)).toBeInTheDocument();
  });

  it("Figure renders the malformed-props placeholder when neither name nor src+alt supplied", () => {
    const { Figure } = makeStaticComponents({ figures: registry });
    render(<Figure caption='no source' />);
    expect(screen.getByText(/Missing figure/)).toBeInTheDocument();
    expect(screen.getByText(/invalid props/)).toBeInTheDocument();
  });

  it("Figure renders the malformed-props placeholder when only src is supplied", () => {
    const { Figure } = makeStaticComponents({ figures: registry });
    render(<Figure src='/foo.png' />);
    expect(screen.getByText(/Missing figure/)).toBeInTheDocument();
    expect(screen.getByText(/invalid props/)).toBeInTheDocument();
  });
});

describe("makeChromeComponents", () => {
  it("returns a map with every chrome key", () => {
    const components = makeChromeComponents({ figures: registry });
    for (const key of expectedChromeKeys) {
      expect(components).toHaveProperty(key);
    }
  });

  it("each chrome component reference resolves to the @sophie/components export", () => {
    const components = makeChromeComponents({ figures: registry });
    expect(components.Aside).toBe(Aside);
    expect(components.Callout).toBe(Callout);
    expect(components.KeyEquation).toBe(KeyEquation);
    expect(components.GlossaryTerm).toBe(GlossaryTerm);
    expect(components.EquationRef).toBe(EquationRef);
    expect(components.FigureRef).toBe(FigureRef);
    expect(components.ChapterRef).toBe(ChapterRef);
    expect(components.Video).toBe(Video);
    expect(components.Due).toBe(Due);
    expect(components.OfficeHours).toBe(OfficeHours);
    expect(components.Points).toBe(Points);
    expect(components.Reading).toBe(Reading);
    expect(components.Week).toBe(Week);
  });

  it("excludes WorkedExample (chrome-vs-pedagogy boundary per ADR 0058 §R-0080-A2)", () => {
    const components = makeChromeComponents({ figures: registry });
    expect(components).not.toHaveProperty("WorkedExample");
  });

  it("Figure resolves a name through the bound registry", () => {
    const { Figure } = makeChromeComponents({ figures: registry });
    render(<Figure name='cosmic' />);
    const img = screen.getByRole("img", { name: "Cosmic test image" });
    expect(img).toHaveAttribute("src", "/figures/cosmic.png");
    expect(screen.getByText("From the registry")).toBeInTheDocument();
  });

  it("Figure renders inline mode when src + alt supplied", () => {
    const { Figure } = makeChromeComponents({ figures: registry });
    render(<Figure src='/foo.png' alt='Inline image' caption='Inline cap' />);
    expect(screen.getByRole("img", { name: "Inline image" })).toHaveAttribute(
      "src",
      "/foo.png"
    );
  });

  it("returns a Callout component identical to @sophie/components export", () => {
    const components = makeChromeComponents({ figures: registry });
    render(<components.Callout variant='tip'>Chrome map</components.Callout>);
    expect(screen.getByRole("note", { name: "Tip" })).toBeInTheDocument();
    expect(screen.getByText("Chrome map")).toBeInTheDocument();
  });
});

describe("chrome-vs-pedagogy boundary (structural cross-check)", () => {
  it("makeStaticComponents is a superset of makeChromeComponents", () => {
    const stat = makeStaticComponents({ figures: registry });
    const chrome = makeChromeComponents({ figures: registry });
    for (const key of Object.keys(chrome)) {
      expect(stat).toHaveProperty(key);
    }
  });

  it("the difference is exactly the pedagogy primitives (currently: WorkedExample)", () => {
    const stat = makeStaticComponents({ figures: registry });
    const chrome = makeChromeComponents({ figures: registry });
    const extraKeys = Object.keys(stat).filter((k) => !(k in chrome));
    expect(extraKeys.sort()).toEqual(["WorkedExample"]);
  });
});
