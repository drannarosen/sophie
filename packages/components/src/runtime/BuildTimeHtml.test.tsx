import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { BuildTimeHtml, type BuildTimeHtmlTrust } from "./BuildTimeHtml.tsx";

const TRUST_VALUES: BuildTimeHtmlTrust[] = [
  "katex",
  "mdx-serialized",
  "extractor-body",
];

describe("<BuildTimeHtml>", () => {
  it("injects the html into a default <span>", () => {
    const { container } = render(
      <BuildTimeHtml html='<em>hi</em>' trust='mdx-serialized' />
    );
    const span = container.querySelector("span");
    expect(span?.innerHTML).toBe("<em>hi</em>");
  });

  it("renders the author-chosen element via `as` and forwards rest props", () => {
    const { container } = render(
      <BuildTimeHtml
        as='div'
        html='<b>x</b>'
        trust='extractor-body'
        className='body'
        data-testid='bt'
      />
    );
    const el = container.querySelector("div.body");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-testid")).toBe("bt");
    expect(el?.innerHTML).toBe("<b>x</b>");
  });

  it("renders an empty element when html is undefined", () => {
    const { container } = render(
      <BuildTimeHtml html={undefined} trust='katex' />
    );
    expect(container.querySelector("span")?.innerHTML).toBe("");
  });

  it("never leaks the `trust` discriminator onto the DOM", () => {
    const { container } = render(
      <BuildTimeHtml html='<i>y</i>' trust='katex' />
    );
    expect(container.querySelector("span")?.getAttribute("trust")).toBeNull();
  });

  it("is axe-clean for every trust value", async () => {
    for (const trust of TRUST_VALUES) {
      const { container } = render(
        <BuildTimeHtml as='p' html='<span>safe</span>' trust={trust} />
      );
      expect(await axe(container)).toHaveNoViolations();
    }
  });
});
