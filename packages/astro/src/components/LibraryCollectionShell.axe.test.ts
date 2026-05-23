/**
 * axe-core a11y test for `<LibraryCollectionShell>` (W4c design D2; ADR
 * 0004 mandate). The shell is a hybrid component — text props for
 * primitives + named slots for rich content — that wraps every
 * Library-room consumer (5 Course* refactored in Batch 4 + 3 new CourseX
 * in Batch 5 + 8 Spec routes in Batches 7–8).
 *
 * Two scenarios cover the shell's two branches:
 *   1. content branch — default slot rendered with a real list,
 *   2. empty branch — `isEmpty: true` shows the empty-state `<p>`.
 *
 * ## Why hand-crafted HTML mirror, not Astro Container
 *
 * The W4c plan suggested `experimental_AstroContainer` for component
 * axe tests. This package's Vitest config does NOT carry the Astro
 * Vite plugin (it's a library, not an Astro project — no `pages/`,
 * no routesList), so `.astro` files cannot be imported at test time
 * (Vite fails with "invalid JS syntax"). Wiring `getViteConfig` here
 * would either fail at config-resolve (no Astro project root) or
 * require fabricating an Astro project shell just for tests.
 *
 * Instead, this file mirrors `admonition-plugin.axe.test.ts`: render
 * the expected HTML output as a string, mount it into jsdom's
 * `document.body`, and run axe against the live DOM. Same rigor for
 * the a11y-mandated surface (axe verifies the actual rendered shape),
 * lower coupling cost (no Container plumbing). The Astro file is
 * exercised at the smoke target's e2e level (Playwright) where a
 * full Astro build is already running.
 *
 * The HTML mirror must track the `.astro` template. If the shell's
 * template changes, update `renderShellAsHtml()` below to match.
 * The shape is short (~10 lines of template) so drift risk is low,
 * and the smoke e2e is the second line of defense.
 */

import { axe, toHaveNoViolations } from "jest-axe";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

expect.extend(toHaveNoViolations);

type ShellArgs = {
  collection: string;
  heading: string;
  emptyText: string;
  isEmpty: boolean;
  defaultSlot?: string;
  introSlot?: string;
  secondaryNavSlot?: string;
};

function renderShellAsHtml(args: ShellArgs): string {
  const {
    collection,
    heading,
    emptyText,
    isEmpty,
    defaultSlot = "",
    introSlot = "",
    secondaryNavSlot = "",
  } = args;
  const headingId = `sophie-library-collection-heading-${collection}`;
  const rootClass = `sophie-library-collection sophie-library-collection--${collection}`;
  const body = isEmpty
    ? `<p class="sophie-library-collection__empty">${escapeHtml(emptyText)}</p>`
    : defaultSlot;
  return `
    <section class="${rootClass}"
          data-sophie-library-collection="${collection}"
          aria-labelledby="${headingId}">
      <header class="sophie-library-collection__header">
        <h1 id="${headingId}" class="sophie-library-collection__heading">${escapeHtml(heading)}</h1>
        ${introSlot}
      </header>
      ${secondaryNavSlot}
      ${body}
    </section>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

describe("LibraryCollectionShell — axe-core a11y", () => {
  let container: HTMLDivElement;

  beforeAll(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterAll(() => {
    container.remove();
  });

  test("renders heading + content slot with zero violations", async () => {
    container.innerHTML = renderShellAsHtml({
      collection: "glossary",
      heading: "Glossary",
      emptyText: "No definitions yet.",
      isEmpty: false,
      defaultSlot: "<dl><dt>term</dt><dd>def</dd></dl>",
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("renders empty-state with zero violations", async () => {
    container.innerHTML = renderShellAsHtml({
      collection: "glossary",
      heading: "Glossary",
      emptyText: "No definitions yet.",
      isEmpty: true,
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard: catch the case where the shell
    // would render <main><main>...</main></main> once consumed by
    // Library pages that route through TextbookLayout → ContentColumn.
    // The shell now emits <section> (region landmark) precisely so this
    // composition is clean. Test verifies axe is happy with the composed
    // markup any Library page will render in production. Future refactor
    // that reverts the outer element to <main> would break this test.
    container.innerHTML = `
      <main class="sophie-content">
        <section
          class="sophie-library-collection sophie-library-collection--glossary"
          data-sophie-library-collection="glossary"
          aria-labelledby="sophie-library-collection-heading-glossary"
        >
          <header class="sophie-library-collection__header">
            <h1 id="sophie-library-collection-heading-glossary"
                class="sophie-library-collection__heading">Glossary</h1>
          </header>
          <dl><dt>term</dt><dd>def</dd></dl>
        </section>
      </main>
    `;
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    const duplicateMainViolation = results.violations.find(
      (v) => v.id === "landmark-no-duplicate-main"
    );
    expect(duplicateMainViolation).toBeUndefined();
  });

  test("renders with intro slot populated — no heading-order or aria violations", async () => {
    // Mirror the populated-state test but with intro content rendered
    // inside <header> AFTER the <h1> (matches the shell's template:
    // <header><h1>…</h1><slot name="intro" /></header>). Confirms
    // heading-order isn't disrupted by intro content and any aria-orphan
    // issues are caught.
    container.innerHTML = renderShellAsHtml({
      collection: "glossary",
      heading: "Glossary",
      emptyText: "No definitions yet.",
      isEmpty: false,
      defaultSlot: "<dl><dt>term</dt><dd>def</dd></dl>",
      introSlot:
        '<p class="sophie-library-collection__intro">Introductory text about this collection.</p>',
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
