/**
 * Container API + axe-core helper for `.astro` component a11y tests.
 *
 * Renders an Astro component via `experimental_AstroContainer` (real SSR),
 * mounts the resulting HTML into a JSDOM document, and runs axe-core. This
 * replaces the hand-crafted-HTML mirror pattern (W4c Task 3.1 pivot) that
 * carried drift risk against the real `.astro` template.
 *
 * Note on axe matcher choice: kept jest-axe (v10) over vitest-axe
 * for Batch 3b setup to avoid a parallel dep migration during W4c.
 * Revisit post-W4c if vitest-axe's matcher shape becomes preferable.
 * The 3 surprises hit in setup (realm-mismatch, client env guard,
 * JSDOM-must-precede-axe-init ordering) are unrelated to which
 * matcher package is used; switching wouldn't have helped.
 *
 * ## Why test files in this dir use `// @vitest-environment node`
 *
 * The Astro Vite plugin emits a hard error ("Astro components cannot be
 * used in the browser") when it loads under any Vite environment named
 * `"client"`. Vitest's `jsdom` environment is tagged `client`, so any
 * test file importing a `.astro` module must opt into the `node`
 * environment via the file-level pragma:
 *
 *   // @vitest-environment node
 *
 * The other tests in `@sophie/astro` (the 60+ that don't touch `.astro`
 * modules) keep the package-default `jsdom` env for `window`/`document`.
 *
 * Because the `node` env has no DOM, this helper installs minimal JSDOM
 * globals (`window`, `document`, `HTMLElement`, etc.) needed by jest-axe.
 * Call `setupAxeDom()` once at the top of an axe test file, then call
 * `renderAstroToBody(Component, args)` inside each test.
 *
 * ## Usage
 *
 *   // @vitest-environment node
 *   import { setupAxeDom, renderAstroToBody } from "../test-utils/container-axe.ts";
 *   import LibraryCollectionShell from "./LibraryCollectionShell.astro";
 *
 *   const { axe } = setupAxeDom();
 *
 *   it("renders with zero violations", async () => {
 *     await renderAstroToBody(LibraryCollectionShell, {
 *       props: { collection: "glossary", heading: "G", emptyText: "X", isEmpty: true },
 *     });
 *     const results = await axe(document.body);
 *     expect(results).toHaveNoViolations();
 *   });
 *
 * For composed-landmark tests (where the shell sits inside a parent
 * `<main>`), pass `wrap: (html) => '<main>...' + html + '</main>'` to
 * `renderAstroToBody` so the wrapping HTML lands in `document.body`
 * alongside the rendered component.
 *
 * ## For singleton-consuming components (e.g., Course*)
 *
 * Components that read from module-singleton state at module-init
 * (e.g., `const { definitions } = indexAccumulator.asPedagogyIndex();`)
 * will render against EMPTY collections unless the test seeds the
 * singleton before calling `renderAstroToBody`.
 *
 * The helper deliberately offers no seeding callback (W2: don't
 * abstract until a second consumer pattern emerges). Seed
 * directly in `beforeEach`:
 *
 * @example
 * import { beforeEach } from "vitest";
 * import {
 *   resetIndexAccumulator,
 *   indexAccumulator,
 * } from "../lib/pedagogy-index/accumulator";
 *
 * beforeEach(() => {
 *   resetIndexAccumulator();
 *   indexAccumulator.addDefinition({ ...fixture });
 *   // ... seed any other entry types the component reads
 * });
 *
 * test("CourseGlossary renders with definitions", async () => {
 *   const html = await renderAstroToBody(CourseGlossary, { props: {} });
 *   // ... axe assertions
 * });
 *
 * ## What this helper does NOT cover
 *
 * `Container.renderToString` is for **components**, not full
 * Astro pages. Spec routes (Astro page modules under `src/pages/`)
 * involve mechanisms the Container API skips:
 *
 *  - Layouts pulled in via `<Layout>` slot composition — they
 *    render but Container doesn't apply page-level routing
 *    semantics around them.
 *  - `Astro.props` injected by routing (`getStaticPaths`,
 *    dynamic params).
 *  - Integration-injected globals (e.g., MDX integrations,
 *    Pagefind context).
 *
 * For component-shape axe coverage, this helper is fine. For
 * full-page axe coverage of Spec routes, use Playwright + axe
 * against the smoke build instead — Batch 3c wired
 * `@axe-core/playwright` for this purpose.
 *
 * If a Spec route's content is a single component (no layout
 * composition), you CAN test the inner component via this
 * helper + the route's test-only axe pass goes via Playwright.
 * Prefer the latter for full-page coverage.
 *
 * @see `src/components/LibraryCollectionShell.axe.test.ts` for live
 * examples covering isolated, empty, composed-fixture, and intro-slot.
 */

import reactRenderer from "@astrojs/react/server.js";
import {
  experimental_AstroContainer as AstroContainer,
  type AstroContainerOptions,
  type ContainerRenderOptions,
} from "astro/container";
import { JSDOM } from "jsdom";

type AxeFn = (
  element: Element | string,
  options?: Record<string, unknown>
) => Promise<unknown>;
type Matchers = Record<string, unknown>;

/**
 * Install JSDOM globals + jest-axe matchers. Idempotent — safe to call
 * once per test file at module top-level.
 */
export function setupAxeDom(): {
  axe: AxeFn;
  toHaveNoViolations: Matchers;
} {
  if (typeof (globalThis as { document?: unknown }).document === "undefined") {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const g = globalThis as unknown as Record<string, unknown>;
    g.window = dom.window;
    g.document = dom.window.document;
    g.HTMLElement = dom.window.HTMLElement;
    g.Element = dom.window.Element;
    g.Node = dom.window.Node;
    g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  }
  // `require` is used (not a top-of-file `import`) so jest-axe's
  // module-init touches `window`/`document` AFTER `setupAxeDom`'s
  // JSDOM install at lines 74-83, not at module load. A static
  // import would run jest-axe's init too early and crash on a
  // missing `document`.
  const jestAxe = require("jest-axe") as {
    axe: AxeFn;
    toHaveNoViolations: Matchers;
  };
  return jestAxe;
}

/**
 * Render an Astro component via the Container API and put the result in
 * `document.body`. Returns the raw HTML string for downstream assertions
 * (e.g., snapshot or substring matches).
 *
 * `wrap` lets callers compose the rendered shell into a parent landmark
 * (e.g., `<main>...</main>`) without needing a separate fixture `.astro`
 * file — keeps the composed-landmark axe regression guard inline.
 */
export async function renderAstroToBody<TProps extends Record<string, unknown>>(
  Component: unknown,
  args: {
    props?: TProps;
    slots?: Record<string, string>;
    wrap?: (renderedHtml: string) => string;
    containerOptions?: AstroContainerOptions;
    renderOptions?: ContainerRenderOptions;
  } = {}
): Promise<string> {
  const container = await AstroContainer.create(args.containerOptions);
  container.addServerRenderer({ renderer: reactRenderer });
  const html = await container.renderToString(Component as never, {
    props: args.props,
    slots: args.slots,
    ...args.renderOptions,
  });
  const wrapped = args.wrap ? args.wrap(html) : html;
  document.body.innerHTML = wrapped;
  return wrapped;
}
