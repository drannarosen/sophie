/**
 * axe-core a11y test for the rendered validation admonition (ADR 0004
 * mandate; ADR 0056 surface). The MyST book-theme renders an
 * admonition node as `<aside class="admonition validation-X">…</aside>`
 * with an `<h2>`-equivalent title and a list of facts.
 *
 * This test asserts that the rendered HTML — for every one of the four
 * status-keyed classes — has zero axe-core violations. The HTML
 * structure mirrors what mystmd's renderer emits (verified against the
 * docs build); if mystmd changes its admonition HTML shape the test
 * should track the new shape rather than the old one.
 */

import { axe, toHaveNoViolations } from "jest-axe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildValidationAdmonitionNode,
  type MystAdmonitionNode,
} from "./validation-admonition-plugin";

expect.extend(toHaveNoViolations);

function renderAdmonitionAsHtml(node: MystAdmonitionNode): string {
  const title = "Validation";
  const listItems =
    node.children
      .find((c) => c.type === "list")
      ?.children?.map((li) => {
        const para = (li as { children: Array<unknown> }).children[0] as {
          children: Array<{
            type: string;
            value?: string;
            children?: Array<{ value: string }>;
          }>;
        };
        const strong = para.children[0]?.children?.[0]?.value ?? "";
        const text = para.children[1]?.value ?? "";
        return `<li><p><strong>${escapeHtml(strong)}</strong>${escapeHtml(text)}</p></li>`;
      })
      .join("") ?? "";
  return `
    <aside class="admonition ${node.class}" role="note" aria-labelledby="validation-title">
      <p class="admonition-title" id="validation-title">${title}</p>
      <ul>${listItems}</ul>
    </aside>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

describe("validation admonition — axe-core a11y", () => {
  let container: HTMLDivElement;

  beforeAll(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterAll(() => {
    container.remove();
  });

  it.each([
    [
      "validated",
      {
        status: "validated" as const,
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "test" as const, ref: "x.ts", date: "2026-05-12" }],
      },
      null,
    ],
    [
      "in-progress",
      {
        status: "in-progress" as const,
        last_validated_date: null,
        evidence: [],
      },
      null,
    ],
    ["unvalidated (default)", undefined, null],
    [
      "re-validation-needed (auto-flipped)",
      {
        status: "validated" as const,
        last_validated_date: "2026-04-30",
        evidence: [],
      },
      "2026-05-15",
    ],
  ])("has zero axe violations for %s", async (_label, validation, lastRevisedDate) => {
    const node = buildValidationAdmonitionNode({
      validation,
      lastRevisedDate,
    });
    expect(node).not.toBeNull();
    if (node === null) return;
    container.innerHTML = renderAdmonitionAsHtml(node);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
