# PR 10 — Chapter-print polish (implementation plan)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`
> to implement this plan task-by-task in the current session, OR
> `superpowers:executing-plans` from a parallel session. RED-first TDD
> throughout; commit each task before moving on.

**Goal:** Sophie chapters print as clean PDFs — chrome hidden,
single-column Wide layout, light-mode tokens forced, pedagogy atoms
break-inside-avoid, interactive components expanded to static
pedagogy-preserving form, first-use glossary terms inline-footnoted.

**Architecture:** Two emit-points + one MDX-pipeline change. Theme
side: extend `generate-css.ts` to emit a `@media print` block in
`dist/theme.css` that re-applies `colorBlock(light)` to `:root,
html[data-theme="dark"]`. Layout side: single `@media print` block
appended to `packages/astro/src/styles/textbook-layout.css` covering
chrome reset + view-mode-Wide override + page-break protection +
interactive-to-static rules. Pipeline side: new
`markFirstUseGlossaryTerms` function in `pedagogy-index-extractor.ts`
that marks the first `<GlossaryTerm>` per slug per chapter with
`data-first-use="true"`; `GlossaryTerm.tsx` reads the prop and
conditionally renders an inline footnote span.

**Tech Stack:** Astro 6 + MDX, React 19, CSS Modules, tsup, Vitest +
Testing Library + jest-axe (`@sophie/components`), Vitest (`@sophie/astro`
co-located under `src/lib/`), Playwright `@1.56.0` (chromium),
`@axe-core/playwright`, `unist-util-visit`, `color-mix(in oklch)`.

**Design reference:**
[docs/plans/2026-05-15-pr-10-print-polish-design.md](./2026-05-15-pr-10-print-polish-design.md)
(commits `61fd43f` initial + `fdf76a8` post-audit revision).

---

## Context

PR 10 is Bucket B's final item. PR 7 (Pagefind faceted search) merged
2026-05-15 at commit `78d1a5f` with one post-merge plan-amendment
commit (`0254579`) documenting four task-10 errata. PR 10 ships the
chapter-print contract Sophie has been deferring since Bucket B
opened. The seven brainstorm decisions are locked in the design doc
§Decisions; the two architectural revisions from the post-design file
audit are captured in §Architectural revision.

The plan creates a worktree branch `feat/pr-10-print-polish` following
the same pattern as PR 7. **Use `superpowers:using-git-worktrees`**
before Task 1.

---

## Errata (live corrections vs design doc)

None yet. If execution surfaces deviations, append here and they
supersede the design doc where they conflict.

---

## Pre-task: Worktree setup

**Use `superpowers:using-git-worktrees`.**

From the main checkout at `/Users/anna/Teaching/sophie`:

**Step 1: Verify clean working tree on main**

```bash
git -C /Users/anna/Teaching/sophie status
git -C /Users/anna/Teaching/sophie log -1 --oneline
```

Expected: `On branch main`, last commit `fdf76a8` (design revision).
If there are unrelated unstaged changes (myst.yml, untracked ADR
0051-0053, sophie-publish-schedule-cli.md), leave them — they are
pre-existing work outside PR 10's scope.

**Step 2: Create worktree**

```bash
cd /Users/anna/Teaching/sophie
git worktree add ../sophie-pr-10-print-polish -b feat/pr-10-print-polish main
cd ../sophie-pr-10-print-polish
```

**Step 3: Install dependencies**

```bash
pnpm install
```

Expected: pnpm reports `done` with no lockfile changes.

**Step 4: Verify smoke build works**

```bash
pnpm --filter smoke build
```

Expected: build succeeds, emits `dist/` directory. This confirms the
worktree is healthy before any PR 10 changes.

---

## Task 1 — Layer 2 RED: failing Playwright print-mode.spec.ts

**Files:**
- Create: `examples/smoke/e2e/print-mode.spec.ts`

**Step 1: Write the failing spec**

Create `examples/smoke/e2e/print-mode.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/measuring-the-sky";

/**
 * PR 10 — chapter-print polish.
 *
 * Per docs/plans/2026-05-15-pr-10-print-polish-design.md:
 * - Chrome hidden under @media print.
 * - .sophie-shell collapses to single-column block layout (Wide
 *   override) regardless of <html data-view-mode>.
 * - Interactive components expand to static pedagogy-preserving
 *   form (CollapsibleCard open, Predict answer-space, GlossaryTerm
 *   first-use inline footnote visible).
 * - axe-core passes under media: "print" emulation.
 * - Rendered .sophie-content HTML matches the print snapshot.
 */

test.describe("PR 10: chapter print contract", () => {
  test("chrome hidden + Wide layout under media: print", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });

    await expect(page.locator(".sophie-topbar")).toHaveCSS("display", "none");
    await expect(page.locator(".sophie-sidebar")).toHaveCSS("display", "none");
    await expect(page.locator(".sophie-right")).toHaveCSS("display", "none");
    await expect(page.locator(".sophie-search-trigger")).toHaveCSS(
      "display",
      "none"
    );

    // Wide-layout grid: .sophie-shell becomes block-level with
    // grid-template-columns: none.
    await expect(page.locator(".sophie-shell")).toHaveCSS(
      "grid-template-columns",
      "none"
    );
  });

  test("interactive components expand to static form in print", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });

    // CollapsibleCard: all cards' bodies render as block regardless of
    // [data-state]. (Test asserts the first card on the page.)
    const card = page.locator(".sophie-collapsible-card").first();
    if (await card.count()) {
      await expect(card.locator("[data-state]")).toHaveCSS("display", "block");
    }

    // GlossaryTerm first-use footnote: the first occurrence per slug
    // gets data-first-use="true" + a sibling .sophie-glossary-footnote
    // span which is display:inline under print.
    const firstUse = page
      .locator(".sophie-glossary-term[data-first-use='true']")
      .first();
    if (await firstUse.count()) {
      const footnote = firstUse.locator(".sophie-glossary-footnote");
      await expect(footnote).toHaveCSS("display", "inline");
    }
  });

  test("axe-core passes under media: print", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("rendered .sophie-content HTML matches print snapshot", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.emulateMedia({ media: "print" });
    const content = await page.locator(".sophie-content").innerHTML();
    expect(content).toMatchSnapshot("smoke-chapter-print.html");
  });
});
```

**Step 2: Run the spec to verify it fails**

```bash
pnpm --filter smoke playwright test print-mode
```

Expected: ALL 4 tests fail. Test 1 fails because `.sophie-topbar`
still has `display: flex` under print (no `@media print` rules yet).
Test 2 fails on the footnote `display: inline` check or skips both
existence-guarded blocks. Test 3 may or may not fail depending on
existing a11y state (note any violations). Test 4 fails because no
snapshot file exists yet.

**Step 3: Commit**

```bash
git add examples/smoke/e2e/print-mode.spec.ts
git commit -m "test(smoke): RED Layer 2 — failing print-mode.spec.ts (4 tests)"
```

---

## Task 2 — GREEN-theme: forced-light tokens in `@media print`

**Files:**
- Modify: `packages/theme/scripts/generate-css.ts`

**Step 1: Read the current generate-css.ts structure**

```bash
grep -n "^function\|^export\|^const " packages/theme/scripts/generate-css.ts
```

Expected output includes a top-level `generateCSS()` export (or
similar) that returns the concatenated CSS string. Identify where the
`light` and `dark` blocks are emitted; the print block appends after.

**Step 2: Add a print-mode emission at the end of `generateCSS()`**

In `packages/theme/scripts/generate-css.ts`, after the existing
`dark` block emission and before the `return` of the assembled CSS
string, append a `@media print` block that re-applies
`colorBlock(light)` to `:root, html[data-theme="dark"]`:

```ts
// Print mode: force light-mode tokens regardless of [data-theme].
// Dark figures and image content render as authored (the redirect
// targets prose+chrome semantic tokens, not media content).
const printBlock = [
  "@media print {",
  "  :root,",
  "  html[data-theme=\"dark\"] {",
  `    ${colorBlock(light)}`,
  "    color-scheme: light;",
  "  }",
  "}",
].join("\n");

// Append printBlock to the assembled output before returning.
```

The exact assembly depends on the existing function shape. Read the
file end-to-end before editing; integrate cleanly with the existing
return statement.

**Step 3: Rebuild theme and inspect dist/theme.css**

```bash
pnpm --filter @sophie/theme build
tail -20 packages/theme/dist/theme.css
```

Expected: `dist/theme.css` ends with a `@media print { :root,
html[data-theme="dark"] { --sophie-bg: ...; ... color-scheme: light; }
}` block. Token values match the light-mode block earlier in the file.

**Step 4: Run theme typecheck + WCAG contrast guard**

```bash
pnpm --filter @sophie/theme build
```

Expected: contrast checks pass; CSS emits without error. The script
exits 0.

**Step 5: Commit**

```bash
git add packages/theme/scripts/generate-css.ts packages/theme/dist/theme.css
git commit -m "feat(theme): emit @media print forced-light tokens

Extend generate-css.ts to emit a @media print block at the end of
dist/theme.css that re-applies colorBlock(light) to :root,
html[data-theme=\"dark\"]. Consumers of @sophie/theme/css get
forced-light prose/chrome tokens in print regardless of the
reader's active theme; figures render as authored."
```

---

## Task 3 — GREEN-layout: chrome reset + view-mode-Wide override

**Files:**
- Modify: `packages/astro/src/styles/textbook-layout.css` (append at file end)

**Step 1: Append the @media print block**

After the closing `}` of the last existing rule (line 566), append:

```css

/* ============================================================
   PR 10 — chapter-print polish (@media print).
   Design doc: docs/plans/2026-05-15-pr-10-print-polish-design.md
   ============================================================ */

@media print {
  /* (1) Hide chrome */
  .sophie-topbar,
  .sophie-sidebar,
  .sophie-right,
  .sophie-search-trigger {
    display: none;
  }

  /* (2) Force Wide layout regardless of data-view-mode */
  .sophie-shell,
  html[data-view-mode="default"] .sophie-shell,
  html[data-view-mode="focused"] .sophie-shell,
  html[data-view-mode="wide"] .sophie-shell {
    display: block;
    grid-template-columns: none;
    grid-template-areas: none;
    max-width: none;
    padding: 0;
  }

  .sophie-content {
    max-width: none;
    margin: 0;
    padding: 0;
  }
}
```

**Step 2: Run Playwright test 1 to verify it passes**

```bash
pnpm --filter smoke playwright test print-mode -g "chrome hidden"
```

Expected: test 1 passes.

**Step 3: Commit**

```bash
git add packages/astro/src/styles/textbook-layout.css
git commit -m "feat(astro): @media print chrome reset + Wide override

Single @media print block at the end of textbook-layout.css hides
.sophie-topbar/.sophie-sidebar/.sophie-right/.sophie-search-trigger
and overrides .sophie-shell grid to single-column block layout
regardless of <html data-view-mode>. CSS-only; no JS changes."
```

---

## Task 4 — GREEN-layout: page-break-inside protection + interactive expansion + glossary footnote display

**Files:**
- Modify: `packages/astro/src/styles/textbook-layout.css` (extend the @media print block)
- Modify: `packages/astro/src/components/SearchTrigger.astro` (remove scoped @media print rule)

**Step 1: Extend the @media print block with page-break + interactive rules**

Inside the `@media print { ... }` block created in Task 3, add:

```css
  /* (3) Page-break-inside protection — moderate contract */
  figure,
  .sophie-key-equation,
  .sophie-key-insight,
  .sophie-aside,
  .sophie-objective-item,
  .sophie-glossary-footnote,
  .sophie-rollup-entry {
    break-inside: avoid;
  }

  /* (4) Interactive components → static pedagogy-preserving form */

  /* CollapsibleCard: force-expanded body, hide chevron */
  .sophie-collapsible-card [data-state="closed"] {
    display: block;
  }
  .sophie-collapsible-card-chevron {
    display: none;
  }

  /* InteractiveCheckbox: render as static empty glyph */
  .sophie-interactive-checkbox input[type="checkbox"] {
    appearance: auto;
    pointer-events: none;
  }

  /* Predict: hide reveal button, draw blank answer-space */
  .sophie-predict[data-revealed="false"] .sophie-predict-reveal-button {
    display: none;
  }
  .sophie-predict::after {
    content: "";
    display: block;
    min-height: 4em;
    border-bottom: 1px solid var(--sophie-border);
  }

  /* SelfAssessment: hide reveal button, show answer */
  .sophie-self-assessment-answer {
    display: block;
  }
  .sophie-self-assessment-reveal-button {
    display: none;
  }

  /* GlossaryTerm first-use footnote: reveal */
  .sophie-glossary-term[data-first-use="true"] .sophie-glossary-footnote {
    display: inline;
  }
}

/* Default (non-print) state: glossary footnote spans are hidden.
   Outside the @media print block so it applies to both screen and print
   when no [data-first-use="true"] match. */
.sophie-glossary-footnote {
  display: none;
}
```

**Step 2: Remove the scoped @media print rule from SearchTrigger.astro**

In `packages/astro/src/components/SearchTrigger.astro:68–72`, delete
the block:

```css
@media print {
  .sophie-search-trigger {
    display: none;
  }
}
```

(Replaced by the cascading rule in textbook-layout.css. Single source
of truth for chrome resets.)

Also remove the doc-comment reference on lines 26–27 of that file
that says "@media print hides the trigger (design doc §11 print-hide
follow-up; PR 10 covers full print polish)" — update or remove it
since PR 10 is now landing the rules upstream.

**Step 3: Run Playwright tests 1 and 2**

```bash
pnpm --filter smoke playwright test print-mode -g "chrome hidden|interactive"
```

Expected: test 1 still passes; test 2 partially passes — the
CollapsibleCard assertion passes; the GlossaryTerm first-use
assertion may still fail because the remark plugin hasn't been
extended yet (Tasks 5–6). That's OK; test 2's GlossaryTerm
assertion is existence-guarded (`if (await firstUse.count())`).

**Step 4: Commit**

```bash
git add packages/astro/src/styles/textbook-layout.css \
        packages/astro/src/components/SearchTrigger.astro
git commit -m "feat(astro): @media print break-inside + interactive expansion

Extends the @media print block in textbook-layout.css with
break-inside: avoid on pedagogy atoms and interactive-to-static
rules for CollapsibleCard, InteractiveCheckbox, Predict,
SelfAssessment, and the GlossaryTerm first-use footnote reveal.

Also removes the duplicate scoped @media print rule from
SearchTrigger.astro:68–72 — replaced by the cascading rule in
textbook-layout.css. Single source of truth for chrome resets."
```

---

## Task 5 — RED: failing unit test for `markFirstUseGlossaryTerms`

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index-extractor.test.ts`
  (append a new `describe` block)

**Step 1: Inspect the existing test file**

```bash
grep -n "^describe\|^test\|^import" packages/astro/src/lib/pedagogy-index-extractor.test.ts | head -30
```

Expected: imports from `unified`/`remark-mdx`, a series of `describe()`
blocks for each extractor function. The new tests append after the
last existing `describe` block.

**Step 2: Write the failing tests**

Append to `packages/astro/src/lib/pedagogy-index-extractor.test.ts`:

```ts
import { markFirstUseGlossaryTerms } from "./pedagogy-index-extractor.ts";

describe("markFirstUseGlossaryTerms", () => {
  test("marks only the first <GlossaryTerm> per slug per chapter", async () => {
    const mdx = `
The <GlossaryTerm name="Luminosity">luminosity</GlossaryTerm> of a star
matters. Later we revisit <GlossaryTerm name="Luminosity">luminosity</GlossaryTerm>
again, and a different term: <GlossaryTerm name="Parsec">parsec</GlossaryTerm>.
`;
    const tree = await parseMdx(mdx); // shared helper from earlier tests
    markFirstUseGlossaryTerms(tree, "test-chapter");

    const terms = collectGlossaryTermNodes(tree); // shared helper
    expect(terms).toHaveLength(3);

    // First Luminosity → data-first-use="true"
    expect(getAttr(terms[0], "data-first-use")).toBe("true");
    // Second Luminosity → no data-first-use attribute
    expect(getAttr(terms[1], "data-first-use")).toBeUndefined();
    // First Parsec → data-first-use="true" (different slug)
    expect(getAttr(terms[2], "data-first-use")).toBe("true");
  });

  test("is idempotent — second call does not duplicate markings", async () => {
    const mdx = `The <GlossaryTerm name="Luminosity">luminosity</GlossaryTerm>.`;
    const tree = await parseMdx(mdx);
    markFirstUseGlossaryTerms(tree, "test-chapter");
    const before = JSON.stringify(tree);
    markFirstUseGlossaryTerms(tree, "test-chapter");
    expect(JSON.stringify(tree)).toBe(before);
  });

  test("treats slugified names as the dedup key", async () => {
    // Same slug, different casing — should still dedup.
    const mdx = `
<GlossaryTerm name="Luminosity">L1</GlossaryTerm>
<GlossaryTerm name="luminosity">L2</GlossaryTerm>
<GlossaryTerm name="LUMINOSITY">L3</GlossaryTerm>
`;
    const tree = await parseMdx(mdx);
    markFirstUseGlossaryTerms(tree, "test-chapter");
    const terms = collectGlossaryTermNodes(tree);
    expect(getAttr(terms[0], "data-first-use")).toBe("true");
    expect(getAttr(terms[1], "data-first-use")).toBeUndefined();
    expect(getAttr(terms[2], "data-first-use")).toBeUndefined();
  });
});
```

If shared helpers `parseMdx`, `collectGlossaryTermNodes`, `getAttr`
don't exist in the test file, add them at the top (or extend existing
helpers — read the file to confirm).

**Step 3: Run the tests to verify they fail**

```bash
pnpm --filter @sophie/astro test:unit -- pedagogy-index-extractor
```

Expected: 3 new tests fail with "markFirstUseGlossaryTerms is not a
function" or similar import-resolution error. Existing tests still
pass.

**Step 4: Commit**

```bash
git add packages/astro/src/lib/pedagogy-index-extractor.test.ts
git commit -m "test(astro): RED unit tests for markFirstUseGlossaryTerms

Three failing tests pin the contract for the new function:
- Marks only first <GlossaryTerm> per slug per chapter
- Idempotent under repeated invocation
- Slug-based dedup (case-insensitive via slugify)"
```

---

## Task 6 — GREEN: implement `markFirstUseGlossaryTerms`

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index-extractor.ts` (append a new
  exported function; wire into the remark plugin)

**Step 1: Add the function**

After the `extractInlineRefUsages` export (around line 850 — verify by
reading), add:

```ts
/**
 * Walks an mdast tree and marks the first `<GlossaryTerm name="...">`
 * per slug per chapter with `data-first-use="true"`. Mutates the
 * tree in place; idempotent (re-running yields the same shape).
 *
 * The slug is derived via the same `slugify(name)` helper used by
 * `lookupDefinition()` in the runtime store, so build-time marks
 * and runtime lookups stay consistent.
 *
 * Consumed by `GlossaryTerm.tsx`, which renders an inline footnote
 * span when `data-first-use="true"` is present on its element.
 * CSS in `textbook-layout.css` reveals the span under @media print.
 */
export function markFirstUseGlossaryTerms(
  tree: Root,
  _chapterSlug: string
): void {
  const seenSlugs = new Set<string>();

  const visitor = (node: unknown) => {
    const el = node as {
      name?: string | null;
      attributes?: Array<{
        type: string;
        name: string;
        value: unknown;
      }>;
    };
    if (el.name !== "GlossaryTerm") return;
    const name = readStringAttr(el, "name");
    if (!name) return;
    const slug = slugify(name);
    if (seenSlugs.has(slug)) return;
    seenSlugs.add(slug);

    // Append data-first-use="true" if not already present.
    const attrs = el.attributes ?? [];
    if (attrs.some((a) => a.name === "data-first-use")) return; // idempotent
    attrs.push({
      type: "mdxJsxAttribute",
      name: "data-first-use",
      value: "true",
    });
    el.attributes = attrs;
  };

  visit(tree, "mdxJsxFlowElement", visitor);
  visit(tree, "mdxJsxTextElement", visitor);
}
```

Import `slugify` from the same place `lookupDefinition()` uses it
(likely `./definitions-store.ts` or a shared util — search the
existing file for `slugify(`).

**Step 2: Wire into the remark plugin**

Find the `pedagogyIndexExtractor` remark plugin export (around line
1262, per the grep map). Inside its `transformer` (the function that
runs per-chapter), after the existing extractor calls, add:

```ts
markFirstUseGlossaryTerms(tree, chapterSlug);
```

**Step 3: Run the unit tests to verify pass**

```bash
pnpm --filter @sophie/astro test:unit -- pedagogy-index-extractor
```

Expected: all 3 new tests pass + all existing tests still pass.

**Step 4: Commit**

```bash
git add packages/astro/src/lib/pedagogy-index-extractor.ts
git commit -m "feat(astro): markFirstUseGlossaryTerms remark-plugin pass

Build-time pass marks the first <GlossaryTerm> per slug per chapter
with data-first-use=\"true\". Mutates the mdast tree in place;
idempotent. Wired into the pedagogyIndexExtractor transformer
alongside the existing extract* calls.

Consumed downstream by GlossaryTerm.tsx (renders inline footnote
span when data-first-use=\"true\" is present) + the @media print
rules in textbook-layout.css (reveals the footnote span)."
```

---

## Task 7 — RED: failing component test for GlossaryTerm footnote render

**Files:**
- Modify: `packages/components/src/components/GlossaryTerm/GlossaryTerm.test.tsx`

**Step 1: Write the failing tests**

Append a new `describe` block:

```tsx
describe("GlossaryTerm first-use footnote", () => {
  it("renders no footnote when data-first-use is absent", () => {
    render(
      <GlossaryTerm name="Luminosity">luminosity</GlossaryTerm>
    );
    expect(
      screen.queryByTestId("glossary-footnote")
    ).not.toBeInTheDocument();
  });

  it("renders inline footnote span when data-first-use='true'", () => {
    render(
      <GlossaryTerm name="Luminosity" data-first-use="true">
        luminosity
      </GlossaryTerm>
    );
    const footnote = screen.getByTestId("glossary-footnote");
    expect(footnote).toBeInTheDocument();
    expect(footnote).toHaveClass("sophie-glossary-footnote");
    // Definition body comes from definitions-store lookup; pin that it
    // is non-empty for a known fixture term seeded by the test store.
    expect(footnote.textContent ?? "").not.toBe("");
  });

  it("renders nothing extra when data-first-use is 'false' or unrecognised", () => {
    render(
      <GlossaryTerm name="Luminosity" data-first-use="false">
        luminosity
      </GlossaryTerm>
    );
    expect(
      screen.queryByTestId("glossary-footnote")
    ).not.toBeInTheDocument();
  });
});
```

Use the existing test scaffolding pattern in the file — `render` from
Testing Library, `screen` from Testing Library, and the existing test
definitions-store seed (look at the top of the test file). If a known
fixture term ("Luminosity") isn't seeded, either seed it in a
`beforeEach` or use a name already present in the test fixtures.

**Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @sophie/components vitest -- GlossaryTerm
```

Expected: the new "first-use footnote" tests fail. Existing tests
still pass.

**Step 3: Commit**

```bash
git add packages/components/src/components/GlossaryTerm/GlossaryTerm.test.tsx
git commit -m "test(components): RED tests for GlossaryTerm first-use footnote

Three new tests pin the contract:
- No footnote when data-first-use is absent
- Inline footnote span (testid='glossary-footnote', class
  'sophie-glossary-footnote') when data-first-use='true'
- No footnote on falsy data-first-use values"
```

---

## Task 8 — GREEN: GlossaryTerm renders footnote span when data-first-use='true'

**Files:**
- Modify: `packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx`
- Modify: `packages/components/src/components/GlossaryTerm/GlossaryTerm.module.css`
  (add `.glossaryFootnote` class)

**Step 1: Read the current component shape**

```bash
cat packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx
```

Identify where the component's main render lives, how it accesses
the definition body (`lookupDefinition(name)`), and how the wrapping
`<span>` is structured.

**Step 2: Extend props and render**

In `GlossaryTerm.tsx`, add `"data-first-use"?: string` to the props
type. After the existing render (the term-text span), conditionally
append:

```tsx
{props["data-first-use"] === "true" && entry ? (
  <span
    data-testid="glossary-footnote"
    className={styles.glossaryFootnote}
    // Definition body is pre-rendered HTML produced by the remark
    // plugin (mdast → hast → html); not user-supplied content.
    // ADR 0038 decision #11, same precedent as the tooltip body.
    // biome-ignore lint/security/noDangerouslySetInnerHtml: see comment
    dangerouslySetInnerHTML={{ __html: entry.body }}
  />
) : null}
```

`entry` is the result of `lookupDefinition(slug)`; it's already in
scope from the existing render. Reuse the same null-guard pattern as
the existing tooltip code path.

**Step 3: Add the CSS Module class**

In `GlossaryTerm.module.css`, add:

```css
.glossaryFootnote {
  /* default: hidden; revealed under @media print via the global rule
     in textbook-layout.css. Also fall back to global class so the
     reveal-under-print rule (which targets .sophie-glossary-footnote,
     not the CSS-Module-mangled name) can find it. */
  display: none;
}
```

Apply the global class name `sophie-glossary-footnote` to the span
via `className={\`\${styles.glossaryFootnote} sophie-glossary-footnote\`}`
so the global @media print rule in textbook-layout.css matches.

**Step 4: Run the tests to verify pass**

```bash
pnpm --filter @sophie/components vitest -- GlossaryTerm
```

Expected: all 3 new tests pass + all existing tests still pass.
Run jest-axe assertions if the existing test file uses them on
mount — confirm no a11y regressions.

**Step 5: Commit**

```bash
git add packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx \
        packages/components/src/components/GlossaryTerm/GlossaryTerm.module.css
git commit -m "feat(components): GlossaryTerm first-use footnote render

Conditional inline footnote span rendered when data-first-use='true'
is passed (from the markFirstUseGlossaryTerms remark plugin pass).
Span carries both the CSS-Module-mangled .glossaryFootnote class
(default display: none) AND the global .sophie-glossary-footnote
class so the @media print reveal rule in textbook-layout.css
matches without import coupling."
```

---

## Task 9 — Verify Layer 2 GREEN end-to-end

**Files:** none modified; verification only.

**Step 1: Build the smoke chapter end-to-end**

```bash
pnpm --filter smoke build
```

Expected: build succeeds. The compiled MDX now contains
`data-first-use="true"` attributes on first-occurrence `<GlossaryTerm>`
elements per chapter.

**Step 2: Run the full Playwright print spec**

```bash
pnpm --filter smoke playwright test print-mode
```

Expected: all 4 tests pass on the first run. Snapshot test (test 4)
will write the snapshot file on first run; that's expected. Inspect
the generated snapshot at
`examples/smoke/e2e/print-mode.spec.ts-snapshots/smoke-chapter-print.html`
and confirm:
- No `.sophie-topbar` / `.sophie-sidebar` / `.sophie-right` in the
  innerHTML (or present but hidden by CSS — innerHTML reflects DOM,
  not render state; the test asserts `display: none`, not absence).
- Glossary terms with `data-first-use="true"` carry inline footnote
  spans.

**Step 3: 3× consecutive run discipline**

```bash
pnpm --filter smoke playwright test print-mode
pnpm --filter smoke playwright test print-mode
pnpm --filter smoke playwright test print-mode
```

Expected: 12/12 across 3 runs (4 tests × 3 runs). Any flake means a
condition-based-waiting issue or timing race; fix before merging.

**Step 4: Commit any snapshot file**

```bash
git add examples/smoke/e2e/print-mode.spec.ts-snapshots/
git commit -m "test(smoke): print-mode snapshot for measuring-the-sky chapter"
```

---

## Task 10 — Roll-up page page-break audit (Task 4 of the design)

**Files:** none modified unless audit surfaces concrete legibility issues.

**Step 1: Headless-print each roll-up page**

For each URL in `/glossary`, `/equations`, `/figures`, `/key-insights`,
`/misconceptions`, `/objectives`:

```bash
pnpm --filter smoke preview &
# Wait for preview to be ready, then for each URL:
pnpm exec playwright codegen --device-scale-factor=2 http://localhost:4321/glossary
# Use the recorder to navigate, then in DevTools toggle media: print
# OR drive headlessly via a quick script:
pnpm exec playwright pdf http://localhost:4321/glossary roll-up-glossary.pdf --media-type=print
```

Capture PDFs of all 6 roll-up pages.

**Step 2: Eyeball each PDF**

Confirm:
- Each entry stays atomic across page boundaries (break-inside avoid).
- Dense flow — no excess whitespace between entries.
- No chrome (topbar, sidebar, right column).
- Wide single-column layout.
- Light-mode token rendering regardless of test browser theme.

**Step 3: Tune if necessary**

If any roll-up page surfaces a concrete page-break issue not covered
by the existing break-inside rules, append a targeted rule to the
`@media print` block in `textbook-layout.css`. Cite the audit finding
in the commit message.

If everything looks correct, no commit needed for this task — just
document the audit completion in a brief note.

**Step 4: Clean up audit artifacts**

```bash
rm roll-up-*.pdf
```

**Step 5: Commit (if tuning was needed)**

```bash
git add packages/astro/src/styles/textbook-layout.css
git commit -m "fix(astro): roll-up page-break tuning per Task-10 audit

[Detail the specific rule added and the roll-up page that surfaced
the need.]"
```

---

## Task 11 — Final verification gauntlet

**Files:** none modified.

**Step 1: Biome clean**

```bash
pnpm exec biome check .
```

Expected: 0 warnings + 0 errors. If warnings appear, **refactor to
satisfy the rule** per CLAUDE.md (`feedback_biome_warnings_policy`).
Do not suppress with `biome-ignore` unless the rule genuinely
doesn't fit the call site.

**Step 2: Typecheck**

```bash
pnpm turbo run typecheck
```

Expected: all packages pass.

**Step 3: Test gauntlet**

```bash
pnpm turbo run test
```

Expected: all packages pass.

**Step 4: Component-specific unit tests**

```bash
pnpm --filter @sophie/astro test:unit
pnpm --filter @sophie/components test
pnpm --filter @sophie/theme test  # if any
```

Expected: all pass.

**Step 5: Smoke build**

```bash
pnpm --filter smoke build
```

Expected: build succeeds; emits `dist/`.

**Step 6: Pre-PR lockfile check** (per `feedback_pre_pr_lockfile_check.md`)

```bash
pnpm install --frozen-lockfile
```

Expected: 0 changes to lockfile or node_modules. If pnpm complains
that the lockfile would be modified, investigate — the worktree's
`pnpm-lock.yaml` may have drifted during execution. Reset if needed
and re-run from a clean state.

**Step 7: Final 3× consecutive Playwright run**

```bash
pnpm --filter smoke playwright test
```

Run the FULL smoke e2e suite (not just print-mode) 3× consecutively.
Expected: all tests pass on all 3 runs. No regressions in other
specs from the @media print changes.

---

## Task 12 — Open the PR

**Use `superpowers:finishing-a-development-branch`.**

**Step 1: Push the branch**

```bash
git -C /Users/anna/Teaching/sophie-pr-10-print-polish push -u origin feat/pr-10-print-polish
```

**Step 2: Open the PR**

```bash
gh pr create --base main --head feat/pr-10-print-polish \
  --title "feat(pr-10): chapter-print polish — Bucket B 10/10" \
  --body "$(cat <<'EOF'
## Summary

- Sophie chapters now print as clean PDFs: chrome hidden,
  single-column Wide layout, light-mode tokens forced regardless of
  the reader's active `data-theme`, pedagogy atoms protected against
  page breaks, interactive components expanded to static pedagogy-
  preserving form.
- First-use `<GlossaryTerm>` instances per slug per chapter carry an
  inline footnote span (revealed in print) so printed artifacts
  remain pedagogically complete without forcing the reader to flip
  between chapter and standalone glossary.
- Closes Bucket B (PR 10 / 10 done).

## Architecture

Two emit-points, no new files:

1. `packages/theme/scripts/generate-css.ts` emits a `@media print`
   block at the end of `dist/theme.css` that re-applies
   `colorBlock(light)` to `:root, html[data-theme="dark"]`.
2. `packages/astro/src/styles/textbook-layout.css` gains a single
   `@media print` block at file end covering chrome reset +
   view-mode-Wide override + page-break-inside protection +
   interactive-to-static rules.

Plus one MDX-pipeline addition:

3. `packages/astro/src/lib/pedagogy-index-extractor.ts` exports a
   new `markFirstUseGlossaryTerms` function wired into the
   `pedagogyIndexExtractor` remark plugin. `GlossaryTerm.tsx`
   renders an inline footnote span when `data-first-use="true"`
   is present.

Design doc: [docs/plans/2026-05-15-pr-10-print-polish-design.md](docs/plans/2026-05-15-pr-10-print-polish-design.md)
Implementation plan: [docs/plans/2026-05-15-pr-10-print-polish-plan.md](docs/plans/2026-05-15-pr-10-print-polish-plan.md)

## Test plan

- [ ] `pnpm exec biome check .` → 0 warnings + 0 errors
- [ ] `pnpm turbo run typecheck` → clean
- [ ] `pnpm turbo run test` → clean
- [ ] `pnpm install --frozen-lockfile` → clean
- [ ] `pnpm --filter smoke build` → succeeds
- [ ] `pnpm --filter smoke playwright test print-mode` → 4/4 × 3 runs
- [ ] `pnpm --filter smoke playwright test` (full suite) → all pass × 3 runs
- [ ] Manual roll-up page-break audit (6 roll-up URLs printed to PDF,
      visual inspection per Task 10)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Final cross-branch review**

Dispatch a `superpowers:code-reviewer` agent for a full PR review
once the PR exists. Address any review comments before merging.

---

## Reference docs

- Design: `docs/plans/2026-05-15-pr-10-print-polish-design.md`
- Closeout meta-plan: `~/.claude/plans/bucket-b-closeout-curious-koala.md`
- PR 7 plan (model for plan shape): `docs/plans/2026-05-14-pr-7-pagefind-search-plan.md`
- ADR 0001 (package purity): `docs/website/decisions/0001-repo-shape.md`
- ADR 0005 (three-layer theming): `docs/website/decisions/0005-theming.md`
- ADR 0019 (Radix UI): `docs/website/decisions/0019-radix-ui-a11y.md`
- ADR 0023 (vertical-slice-first): `docs/website/decisions/0023-vertical-slice-first.md`
- ADR 0032 (vanilla-JS chrome): `docs/website/decisions/0032-vanilla-js-chrome-state.md`
- ADR 0037 (cross-bundle DOM observation): `docs/website/decisions/0037-cross-bundle-dom-observation.md`
- ADR 0038 (pedagogy-index pattern): `docs/website/decisions/0038-pedagogy-index-pattern.md`

## Test plan

- Layer 0 unit (theme build): WCAG contrast guard in `build-theme.ts`
  (existing) — must still pass after the print block addition.
- Layer 1 unit (extractor): 3 new tests in
  `pedagogy-index-extractor.test.ts` pin `markFirstUseGlossaryTerms`.
- Layer 1 unit (component): 3 new tests in `GlossaryTerm.test.tsx`
  pin the conditional footnote render.
- Layer 2 e2e: 4 tests in `examples/smoke/e2e/print-mode.spec.ts`
  (chrome hidden + Wide; interactive expanded; axe-core; HTML
  snapshot). 3× consecutive run discipline.
- Final regression check: full smoke e2e suite × 3 consecutive runs.

## Out of scope (per design doc §Non-goals)

- Slide-deck print polish (Reveal.js per ADR 0006) — future PR.
- Paper-print URL suffixes — handled by author-side self-describing
  link text guidance, not CSS.
- SelfAssessment inverted answer-key gimmick — not pedagogically
  serious; print just reveals the answer.
- CodeCell whole-block atomicity — long code listings must allow
  breaks.

## Risks + rollback

- **`color-mix(in oklch, ...)` browser support.** Already in use
  throughout `theme.css`; the print block doesn't introduce new
  syntax. Risk: zero.
- **`break-inside: avoid` on `.sophie-aside`.** If asides are
  consistently long enough to force frequent page-bottom whitespace,
  Task 10 audit tunes this to per-aside-type granularity. Rollback:
  remove `.sophie-aside` from the break-inside rule list.
- **GlossaryTerm prop-name `data-first-use`** colliding with React
  warnings about unknown DOM attributes. React 19 passes
  `data-*` attributes to DOM nodes without warnings, but verify the
  emitted HTML doesn't double-encode or strip the attribute.
- **Snapshot test churn.** The HTML snapshot will regenerate any
  time the smoke chapter prose changes. Treat updates to
  `smoke-chapter-print.html` as expected; reviewer eyeballs the
  diff for unintended structural change.
- **Rollback path.** All changes are additive (new `@media print`
  rules, new function, new component conditional). Revert the PR
  cleanly if the print contract turns out wrong; no consumer
  callsites depend on print behavior to function in screen-render
  mode.
