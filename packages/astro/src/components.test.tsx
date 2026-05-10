import type { FigureRegistry } from "@sophie/components";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeStaticComponents } from "./components.tsx";

const registry: FigureRegistry = {
  cosmic: {
    name: "cosmic",
    src: "/figures/cosmic.png",
    alt: "Cosmic test image",
    caption: "From the registry",
  },
};

describe("makeStaticComponents", () => {
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
