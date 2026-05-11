import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { MiniGlossary } from "./MiniGlossary.tsx";

const sampleTerms = [
  { term: "Photon", definition: "A packet of light." },
  { term: "Wavelength (λ)", definition: "The spatial period of a wave." },
  { term: "Dark matter", definition: "Invisible matter detected by gravity." },
];

describe("<MiniGlossary>", () => {
  it("renders the title as visible heading and accessible region name", () => {
    render(
      <MiniGlossary
        id='mini-glossary'
        title='Mini-Glossary'
        terms={sampleTerms}
      />
    );
    const region = screen.getByRole("region", { name: "Mini-Glossary" });
    expect(region).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Mini-Glossary" })
    ).toBeInTheDocument();
  });

  it("sets the outer DOM id to the prop value (hash-anchor support)", () => {
    const { container } = render(
      <MiniGlossary id='mini-glossary' title='Glossary' terms={sampleTerms} />
    );
    expect(container.querySelector("#mini-glossary")).not.toBeNull();
  });

  it("renders each term as a <dt>/<dd> pair inside a <dl>, in order", () => {
    const { container } = render(
      <MiniGlossary id='mg' title='Glossary' terms={sampleTerms} />
    );
    const dl = container.querySelector("dl");
    expect(dl).not.toBeNull();
    const dts = Array.from(container.querySelectorAll("dt"));
    const dds = Array.from(container.querySelectorAll("dd"));
    expect(dts).toHaveLength(3);
    expect(dds).toHaveLength(3);
    expect(dts.map((el) => el.textContent)).toEqual([
      "Photon",
      "Wavelength (λ)",
      "Dark matter",
    ]);
    expect(dds.map((el) => el.textContent)).toEqual([
      "A packet of light.",
      "The spatial period of a wave.",
      "Invisible matter detected by gravity.",
    ]);
  });

  it("gives each <dt> a unique id of form <id>-term-<slug>", () => {
    const { container } = render(
      <MiniGlossary id='mg' title='Glossary' terms={sampleTerms} />
    );
    const dts = Array.from(container.querySelectorAll("dt"));
    expect(dts[0]?.id).toBe("mg-term-photon");
    expect(dts[1]?.id).toBe("mg-term-wavelength");
    expect(dts[2]?.id).toBe("mg-term-dark-matter");
  });

  it("renders the optional lede paragraph when provided", () => {
    render(
      <MiniGlossary
        id='mg'
        title='Glossary'
        lede='Scan, do not memorize.'
        terms={sampleTerms}
      />
    );
    expect(screen.getByText("Scan, do not memorize.")).toBeInTheDocument();
  });

  it("omits the lede element entirely when not provided", () => {
    const { container } = render(
      <MiniGlossary id='mg' title='Glossary' terms={sampleTerms} />
    );
    // No paragraph child directly inside the section other than inside <dd>.
    // Confirm the section's first non-heading child is the <dl>.
    const section = container.querySelector("section");
    const children = Array.from(section?.children ?? []);
    // Expected children: [h3, dl].
    expect(children.map((c) => c.tagName.toLowerCase())).toEqual(["h3", "dl"]);
  });

  it("namespaces per-term ids so two instances on a page do not collide", () => {
    const photonTerm = { term: "Photon", definition: "A packet of light." };
    const { container } = render(
      <>
        <MiniGlossary id='alpha' title='Alpha' terms={[photonTerm]} />
        <MiniGlossary id='beta' title='Beta' terms={[photonTerm]} />
      </>
    );
    expect(container.querySelector("#alpha-term-photon")).not.toBeNull();
    expect(container.querySelector("#beta-term-photon")).not.toBeNull();
    // The two <dt>s share a slug but are namespaced under different outer ids.
    expect(container.querySelectorAll("#alpha-term-photon")).toHaveLength(1);
    expect(container.querySelectorAll("#beta-term-photon")).toHaveLength(1);
  });

  it("has no axe-core accessibility violations", async () => {
    const { container } = render(
      <MiniGlossary
        id='mg'
        title='Mini-Glossary'
        lede='Recognition not retention.'
        terms={sampleTerms}
      />
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
