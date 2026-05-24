// @vitest-environment node
/**
 * axe-core a11y test for `<LibraryCollectionShell>` (W4c design D2; ADR
 * 0004 mandate). The shell is a hybrid component — text props for
 * primitives + named slots for rich content — that wraps every
 * Library-room consumer (5 Course* refactored in Batch 4 + 3 new CourseX
 * in Batch 5 + 8 Spec routes in Batches 7–8).
 *
 * ## Rendering pattern: Container API
 *
 * Each test renders the real `.astro` template via
 * `experimental_AstroContainer`, mounts the result in JSDOM's
 * `document.body`, and asserts axe-core has zero violations. The earlier
 * hand-crafted-HTML mirror has been retired (W4c Batch 3b) so axe runs
 * against the actual template — template drift is now caught at the
 * unit-test level rather than relying on smoke e2e as the only defense.
 *
 * See `src/test-utils/container-axe.ts` for the helper's pragma + globals
 * setup. The `// @vitest-environment node` pragma above is required
 * (Astro's Vite plugin refuses to load `.astro` modules under a `client`-
 * tagged environment such as jsdom).
 *
 * Four scenarios cover the shell's branches:
 *   1. content branch — default slot rendered with a real list,
 *   2. empty branch — `isEmpty: true` shows the empty-state `<p>`,
 *   3. composed-into-`<main>` regression guard (Library page wrapping),
 *   4. intro slot populated alongside default slot.
 */

import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import LibraryCollectionShell from "./LibraryCollectionShell.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("LibraryCollectionShell — axe-core a11y", () => {
  test("renders heading + content slot with zero violations", async () => {
    await renderAstroToBody(LibraryCollectionShell, {
      props: {
        collection: "glossary",
        heading: "Glossary",
        emptyText: "No definitions yet.",
        isEmpty: false,
      },
      slots: { default: "<dl><dt>term</dt><dd>def</dd></dl>" },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders empty-state with zero violations", async () => {
    await renderAstroToBody(LibraryCollectionShell, {
      props: {
        collection: "glossary",
        heading: "Glossary",
        emptyText: "No definitions yet.",
        isEmpty: true,
      },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    // Class-of-issue regression guard: catch the case where the shell
    // would render <main><main>...</main></main> once consumed by
    // Library pages that route through TextbookLayout → ContentColumn.
    // The shell now emits <section> (region landmark) precisely so this
    // composition is clean. `wrap` puts the rendered shell inside a
    // `<main>` so axe sees the production composition.
    await renderAstroToBody(LibraryCollectionShell, {
      props: {
        collection: "glossary",
        heading: "Glossary",
        emptyText: "No definitions yet.",
        isEmpty: false,
      },
      slots: { default: "<dl><dt>term</dt><dd>def</dd></dl>" },
      wrap: (html) => `<main class="sophie-content">${html}</main>`,
    });
    const results = (await axe(document.body)) as {
      violations: Array<{ id: string }>;
    };
    expect(results).toHaveNoViolations();
    const duplicateMainViolation = results.violations.find(
      (v) => v.id === "landmark-no-duplicate-main"
    );
    expect(duplicateMainViolation).toBeUndefined();
  });

  test("renders with intro slot populated — no heading-order or aria violations", async () => {
    // Intro content renders inside <header> AFTER the <h1> per the
    // shell's template (`<header><h1>…</h1><slot name="intro" /></header>`).
    // Confirms heading-order isn't disrupted by intro content and any
    // aria-orphan issues are caught.
    await renderAstroToBody(LibraryCollectionShell, {
      props: {
        collection: "glossary",
        heading: "Glossary",
        emptyText: "No definitions yet.",
        isEmpty: false,
      },
      slots: {
        default: "<dl><dt>term</dt><dd>def</dd></dl>",
        intro:
          '<p class="sophie-library-collection__intro">Introductory text about this collection.</p>',
      },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
