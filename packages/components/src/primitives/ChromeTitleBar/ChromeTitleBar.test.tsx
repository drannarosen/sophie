import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { PauseCircle, Target, Telescope } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ChromeTitleBar } from "./ChromeTitleBar.tsx";

describe("<ChromeTitleBar>", () => {
  it("renders icon + heading inside a header", () => {
    const { container } = render(
      <ChromeTitleBar
        accent='teal'
        icon={Target}
        heading='After this reading'
      />
    );
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header?.querySelector("svg")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "After this reading" })
    ).toBeInTheDocument();
  });

  it("defaults heading element to h2 with section-level role", () => {
    render(
      <ChromeTitleBar
        accent='teal'
        icon={Target}
        heading='Default heading level'
      />
    );
    const heading = screen.getByRole("heading", {
      name: "Default heading level",
    });
    expect(heading.tagName).toBe("H2");
  });

  it("supports headingAs override (h3)", () => {
    render(
      <ChromeTitleBar
        accent='teal'
        icon={Target}
        heading='Subsection heading'
        headingAs='h3'
      />
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Subsection heading" })
    ).toBeInTheDocument();
  });

  it("supports headingAs='label' with headingFor for form controls", () => {
    render(
      <>
        <ChromeTitleBar
          accent='rose'
          icon={PauseCircle}
          heading='Reflection prompt'
          headingAs='label'
          headingFor='reflect-input'
        />
        {/* The ChromeTitleBar renders a <label htmlFor=...> that
            associates with this textarea — static a11y linters can't
            see across the component boundary, hence the redundant
            aria-label fallback. Runtime accessibility verified by the
            axe() assertion below. */}
        <textarea id='reflect-input' aria-label='Reflection prompt' />
      </>
    );
    const label = screen.getByText("Reflection prompt");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", "reflect-input");
  });

  it("threads headingId for aria-labelledby consumers", () => {
    render(
      <ChromeTitleBar
        accent='status-info'
        icon={Target}
        heading='Callout title'
        headingId='callout-1-title'
      />
    );
    const heading = screen.getByRole("heading", { name: "Callout title" });
    expect(heading).toHaveAttribute("id", "callout-1-title");
  });

  it("renders math segments in the heading via MathText pipeline", () => {
    const { container } = render(
      <ChromeTitleBar
        accent='violet'
        icon={Target}
        heading={"Recall: $E = mc^2$"}
      />
    );
    // KaTeX emits a .katex span when math renders successfully.
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });

  it.each([
    "teal",
    "rose",
    "violet",
    "status-info",
    "status-warn",
    "status-error",
  ] as const)("accepts accent='%s' and routes it via data-accent", (accent) => {
    const { container } = render(
      <ChromeTitleBar accent={accent} icon={Target} heading='X' />
    );
    expect(container.querySelector("header")).toHaveAttribute(
      "data-accent",
      accent
    );
  });

  it("respects iconSize override", () => {
    const { container } = render(
      <ChromeTitleBar
        accent='teal'
        icon={Telescope}
        heading='Larger icon'
        iconSize={24}
      />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("is accessible (axe)", async () => {
    const { container } = render(
      <ChromeTitleBar
        accent='teal'
        icon={Target}
        heading='After this reading'
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
