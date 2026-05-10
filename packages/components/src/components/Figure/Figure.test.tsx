import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { FigureRegistryProvider } from "../../runtime/FigureRegistry.tsx";
import { FigurePropsSchema } from "./Figure.schema.ts";
import { Figure } from "./Figure.tsx";

describe("<Figure>", () => {
  it("renders inline mode with src + alt + caption", () => {
    render(
      <Figure
        src='/figures/three-questions.png'
        alt='Three big questions illustration'
        caption='The three guiding questions of the chapter.'
      />
    );
    const img = screen.getByRole("img", {
      name: "Three big questions illustration",
    });
    expect(img).toHaveAttribute("src", "/figures/three-questions.png");
    expect(
      screen.getByText("The three guiding questions of the chapter.")
    ).toBeInTheDocument();
  });

  it("looks up registry mode entries by name", () => {
    const registry = {
      "three-questions": {
        name: "three-questions",
        src: "/figures/three-questions.png",
        alt: "Three questions",
        caption: "Caption from registry",
      },
    };
    render(
      <FigureRegistryProvider registry={registry}>
        <Figure name='three-questions' />
      </FigureRegistryProvider>
    );
    expect(
      screen.getByRole("img", { name: "Three questions" })
    ).toHaveAttribute("src", "/figures/three-questions.png");
    expect(screen.getByText("Caption from registry")).toBeInTheDocument();
  });

  it("renders missing-figure placeholder when name not in registry", () => {
    render(
      <FigureRegistryProvider registry={{}}>
        <Figure name='absent' />
      </FigureRegistryProvider>
    );
    expect(screen.getByText(/Missing figure/)).toBeInTheDocument();
  });

  it("schema rejects inline mode without alt", () => {
    const result = FigurePropsSchema.safeParse({
      src: "/foo.png",
      caption: "no alt",
    });
    expect(result.success).toBe(false);
  });

  it("inline mode has zero axe violations", async () => {
    const { container } = render(
      <Figure src='/figures/x.png' alt='An image' caption='A caption' />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
