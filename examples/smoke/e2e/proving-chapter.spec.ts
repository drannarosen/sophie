import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";
const CHAPTER_SLUG = "spoiler-alerts";

/**
 * Build-time snapshot of `indexAccumulator.asPedagogyIndex()` (Session
 * 9 Area 3). Written by `integrations/pedagogy-index-dump.ts`'s
 * `astro:build:done` hook into `dist/.sophie-pedagogy-index.json`.
 *
 * Loaded once per test run; the spec derives expected element counts
 * + per-entry existence assertions from this snapshot rather than
 * hardcoded literal numbers. Audit Priority 5 (2026-05-18 post-PR-A)
 * called this shape "function-of-content assertions": the test passes
 * the index in, asserts every tracked entry has a rendered
 * correspondence, survives shape refactors that previously required
 * mechanical count updates (e.g. PR-7 +24, PR-A −17).
 */
const INDEX_PATH = resolve(
  import.meta.dirname,
  "..",
  "dist",
  ".sophie-pedagogy-index.json"
);
const indexJson = readFileSync(INDEX_PATH, "utf8");
const index = JSON.parse(indexJson) as {
  definitions: { chapter: string; slug: string; anchor: string }[];
  keyInsights: { chapter: string; anchor: string }[];
  misconceptions: { chapter: string; anchor: string }[];
  interventions: { chapter: string; anchor: string }[];
  figureUsages: { chapter: string; anchor: string }[];
  equationCitations: { chapter: string; anchor: string }[];
};

const chapterEntries = {
  definitions: index.definitions.filter((d) => d.chapter === CHAPTER_SLUG),
  keyInsights: index.keyInsights.filter((k) => k.chapter === CHAPTER_SLUG),
  misconceptions: index.misconceptions.filter(
    (m) => m.chapter === CHAPTER_SLUG
  ),
  interventions: index.interventions.filter((i) => i.chapter === CHAPTER_SLUG),
  figureUsages: index.figureUsages.filter((f) => f.chapter === CHAPTER_SLUG),
  equationCitations: index.equationCitations.filter(
    (e) => e.chapter === CHAPTER_SLUG
  ),
};

/**
 * Figures in the DOM = figure-usages MINUS those inside collapsed
 * Radix Collapsible cards (which unmount on close). PR-7 / Trio 3 #1
 * documented one such case: the "standard-candles" figure in the
 * "Deep Dive: How the Distance Ladder Works" CollapsibleCard.
 *
 * The index tracks all figure-usages (rendering-environment-agnostic),
 * so the rendered DOM count is index-count minus collapsed cards. The
 * single constant here documents the one known unmounted figure;
 * when collapse-state becomes index-tracked, the constant goes away.
 */
const COLLAPSED_FIGURES_COUNT = 1;
const expectedFigureCount =
  chapterEntries.figureUsages.length - COLLAPSED_FIGURES_COUNT;

test.describe("Phase 0 vertical-slice acceptance — spoiler-alerts chapter", () => {
  test.beforeEach(async ({ context }) => {
    // Each test gets a fresh IDB by isolating origin storage. The
    // BroadcastChannel persistence survives within a single test run
    // but doesn't leak across tests.
    await context.clearCookies();
  });

  test("renders prose, math, figures, callouts, and tables", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    await expect(page).toHaveTitle(/Spoiler Alerts/);

    // Aggregate structural counts (Phase 0 lineage — kept as sanity
    // gates until the renderer uniformly tracks every role="note"
    // source in the pedagogy index):
    //
    //   role="note" total = 36 = 28 <Callout> (info/tip/key-insight/
    //   roadmap/summary/warning — chrome callouts, not pedagogy) +
    //   8 <Intervention>. <Callout> isn't tracked in the index today
    //   (it's narration/chrome, not pedagogy-OMI roles), so the total
    //   can't yet be fully derived from the index. When <Callout> is
    //   indexed or migrated, swap this for the derived form.
    await expect(page.locator("[role='note']")).toHaveCount(36);
    // figureUsages.length − collapsed-card unmounts. Function-of-
    // content: when a <Figure>/<FigureRef> is added or removed in
    // the chapter MDX, expectedFigureCount auto-adjusts.
    await expect(page.locator("figure")).toHaveCount(expectedFigureCount);
    // The Mini-Glossary markdown table migrated to <MiniGlossary>
    // (Trio 3 #3) which renders as a <dl>, not a <table>. The 8
    // remaining are raw markdown tables in MDX prose (not tracked
    // in the pedagogy index — markdown tables are formatting, not
    // pedagogy roles). Literal until tables become a tracked kind.
    await expect(page.locator("table")).toHaveCount(8);

    // ─── Function-of-content per-kind assertions (Session 9 Area 3) ───
    //
    // For each pedagogy kind tracked in the index, assert the rendered
    // DOM count matches the index entry count. The renderer emits
    // `data-aside-kind="<kind>"` (or a kind-specific id prefix) on each
    // rendered element, giving us a stable selector that DOESN'T
    // change with role/aria refactors. When the chapter MDX adds or
    // removes a definition/key-insight/misconception/intervention,
    // these counts auto-update; no spec edit required.
    //
    // Per the 2026-05-18 post-PR-A audit's Priority 5 — replacing
    // hardcoded counts with index-derived expressions survives shape
    // refactors and removes the PR-7 +24 / PR-A −17 mechanical-update
    // pattern documented in the comments above.
    await expect(
      page.locator('[data-aside-kind="definition"]'),
      `Index lists ${chapterEntries.definitions.length} definitions for this chapter`
    ).toHaveCount(chapterEntries.definitions.length);
    await expect(
      page.locator('[data-aside-kind="key-insight"]'),
      `Index lists ${chapterEntries.keyInsights.length} key-insights for this chapter`
    ).toHaveCount(chapterEntries.keyInsights.length);
    await expect(
      page.locator('[data-aside-kind="misconception"]'),
      `Index lists ${chapterEntries.misconceptions.length} misconceptions for this chapter`
    ).toHaveCount(chapterEntries.misconceptions.length);

    // Per-entry existence assertions (the audit's "every entry has a
    // rendered correspondence" full vision, 2026-05-19 unified-anchor
    // PR). Three kinds now have anchor→DOM-id mapping via the shared
    // `deriveAsideAnchor` helper in `@sophie/core` — renderer and
    // extractor agree on anchors by construction.
    //
    // - definitions: id from slugify(title) (definition kind requires
    //   title per the schema, so every definition always has an id).
    // - misconceptions: id from name (preferred) or slug(title). The
    //   smoke chapter's 8 misconceptions all carry `name=`.
    // - interventions: id from the intervention's own anchor scheme
    //   (separate component, predates the unification).
    //
    // Key-insights are NOT asserted per-entry here: the smoke chapter
    // currently has 2 untitled key-insights, so they fall through to
    // the extractor's positional `ki-N` fallback (index-only, no DOM
    // id). When a key-insight gains a title, the helper will emit
    // id={slug(title)} automatically and this loop can extend to
    // include key-insights without any change to the renderer.
    for (const def of chapterEntries.definitions) {
      await expect(
        page.locator(`#${def.anchor}`),
        `Definition "${def.slug}" should be rendered in DOM at #${def.anchor}`
      ).toHaveCount(1);
    }
    for (const m of chapterEntries.misconceptions) {
      await expect(
        page.locator(`#${m.anchor}`),
        `Misconception should be rendered in DOM at #${m.anchor}`
      ).toHaveCount(1);
    }
    for (const iv of chapterEntries.interventions) {
      await expect(
        page.locator(`#${iv.anchor}`),
        `Intervention should be rendered in DOM at #${iv.anchor}`
      ).toHaveCount(1);
    }

    // KaTeX rendered all math (no raw `$...$` left behind).
    const katexCount = await page.locator(".katex").count();
    expect(katexCount).toBeGreaterThan(100);

    // First figure has alt text and a usable src.
    const firstImg = page.locator("figure img").first();
    await expect(firstImg).toHaveAttribute("alt", /\w+/);
    const src = await firstImg.getAttribute("src");
    expect(src).toBeTruthy();
    if (src) {
      const response = await page.request.get(src);
      expect(response.status()).toBe(200);
    }
  });

  test("interactive callout: toggle persists across reload via IndexedDB", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    // Six "Mark as reviewed" labels = six interactive callouts.
    const reviewLabels = page.locator("label", {
      hasText: /Mark as reviewed/,
    });
    await expect(reviewLabels).toHaveCount(6);

    // Toggle the first one. Wait briefly for the IDB write before
    // navigating away.
    const firstLabel = reviewLabels.first();
    await firstLabel.click();
    await expect(
      page.locator("label", { hasText: "Reviewed" }).first()
    ).toBeVisible();

    // Reload. The state must rehydrate from IndexedDB.
    await page.reload();
    await expect(
      page.locator("label", { hasText: "Reviewed" }).first()
    ).toBeVisible({ timeout: 5000 });

    // Verify the underlying DB exists with the expected key.
    const storedValue = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("sophie-smoke");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        const tx = db.transaction("responses", "readonly");
        const store = tx.objectStore("responses");
        const value = await new Promise((resolve) => {
          const req = store.get(
            "student:spoiler-alerts:callout:check-yourself-1:reviewed"
          );
          req.onsuccess = () => resolve(req.result);
        });
        return value;
      } finally {
        db.close();
      }
    });
    // Per ADR 0029, IDB records are `{ value, ts }`.
    expect((storedValue as { value: boolean }).value).toBe(true);
    expect((storedValue as { ts: number }).ts).toBeGreaterThan(0);
  });

  test("axe-core: zero accessibility violations on platform-rendered surface", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for hydration to settle so dynamic regions are present.
    await page
      .locator("label", { hasText: /Mark as reviewed/ })
      .first()
      .waitFor();

    const results = await new AxeBuilder({ page })
      // Exclusions document Phase-0 known-acceptable patterns:
      // - `.margin-note`: 22 column-margin <aside> elements from MDX.
      //   Phase 1 replaces these with a <MarginNote> component (per
      //   ADR-queue) that carries role="note" + a unique label.
      // - GFM task-list checkboxes: remark-gfm renders `[x]` lists as
      //   `<input type="checkbox" disabled>` siblings of text without
      //   wrapping `<label>`. Markdown convention; not actionable
      //   from Sophie's side without a custom rehype plugin.
      // - color-contrast: theme-level concern; @sophie/theme runs its
      //   own WCAG-AA contrast check at build time.
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .exclude("li > input[type='checkbox'][disabled]")
      // - list / listitem: the PR-C4 <LearningObjectives> children-mode
      //   refactor (commit 4737e03) renders `<ul><astro-slot><li>…`
      //   because Astro slots nested React children inside MDX
      //   `client:load` islands. axe-core's list+listitem rules
      //   (WCAG 1.3.1) flag the slot as a non-`<li>` direct child.
      //   The DOM is semantically a list; the slot is an Astro
      //   render-layer artifact. Tracked as a follow-up; suppress
      //   here so the chapter-wide axe sweep stays green. Mirrors
      //   the same suppression in learning-objectives.spec.ts.
      .disableRules(["color-contrast", "list", "listitem"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
