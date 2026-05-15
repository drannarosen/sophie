# PR 10 — Print polish (design)

**Status:** design committed; implementation plan to follow at
`docs/plans/2026-05-15-pr-10-print-polish-plan.md`.
**Bucket:** B (closeout). Last item before Bucket B = 10/10.
**Scope:** chapter-print contract. Slide-deck print is out of scope.

## Context

Bucket B's nine other items landed without a print pass. Sophie
chapters today print whatever the screen renders — chrome included.
Anyone hitting Cmd+P sees a sticky topbar, a sidebar, and a right
column rendered onto the page; theme-mode is whatever the reader had
active; figure backgrounds and aside callouts may render with
ink-heavy dark surfaces; collapsible cards print in collapsed state,
silently dropping pedagogy.

A 2026-05-15 pre-flight audit (closeout brainstorm session) overturned
the original sizing assumption that PR 10 would port existing print
SCSS from `_archive/astr101-sp26/`, `_archive/astr201-sp26/`, and
`_archive/comp536-sp26/`. The audit found those repos' `@media print`
rules are overwhelmingly **slide-focused** (Reveal.js controls, demo-
mode `window.print()` hooks, multi-column-to-single-column slide
overrides). There is no meaningful chapter-print prior art to port.
PR 10 is **greenfield chapter-print design work**, informed by the
courses but written fresh.

This design ships with one targeted MDX-pipeline change (extending
the existing pedagogy-index extractor) to support first-use glossary
footnotes — the only pedagogy element where pure-CSS print preservation
isn't possible.

## Goals

- Saving a Sophie chapter as PDF (the dominant 2026 print outcome)
  produces a clean, readable artifact: chrome hidden, single-column
  wide layout, figures and equations atomic across pages, hyperlinks
  preserved.
- Interactive pedagogy components render in static, pedagogy-preserving
  form: collapsibles expanded, predict-prompts with answer-space,
  self-assessment answer keys revealed, glossary-term first-use
  inline-footnoted.
- Forced light-mode tokens for prose and chrome regardless of the
  reader's `data-theme` choice; figures render as authored (dark
  astronomy imagery stays dark).
- Roll-up pages (`/glossary`, `/equations`, `/figures`, `/key-insights`,
  `/misconceptions`, `/objectives`) print as a reference appendix —
  each entry atomic, dense flow.
- A11y under `@media print` emulation verified by axe-core.

## Non-goals

- **Slide-deck print polish** (Reveal.js per ADR 0006). The
  `@sophie/theme/print.css` file is structured so future slide-deck
  print work can import it, but slide-specific page-break and
  reveal-controls-hide rules are a separate PR.
- **Paper-print-only URL suffixes.** The contract optimizes for the
  PDF-dominant case. Paper print degrades hyperlinks to plain text;
  mitigation is author-side self-describing link text, not CSS. See
  Decision 3 below for rationale.
- **SelfAssessment answer-key inversion.** The clever idea
  (`transform: scaleY(-1)` so students self-grade by flipping paper)
  was considered and dropped — students self-grade by reading
  discipline, not paper-flipping. Print just reveals the answer.
- **CodeCell whole-block atomicity.** Long code listings must allow
  breaks. Short blocks happen to fit; long blocks split mid-line by
  necessity.

## Architecture

**Two-file split** motivated by ADR 0001 (package purity) and ADR
0005 (three-layer theming):

1. **`packages/astro/src/styles/textbook-layout.css`** — single
   `@media print` block at file end. Hides chrome
   (`.sophie-topbar`, `.sophie-sidebar`, `.sophie-right`,
   `.sophie-search-trigger`). Overrides `.sophie-shell` grid to
   single-column block layout regardless of `<html data-view-mode>`.
   Touches only classes owned by `@sophie/astro`.

2. **`packages/theme/src/print.css` (new)** — exported by
   `@sophie/theme`, imported into `@sophie/astro`'s entry styles.
   Contains the layout-agnostic a11y + ink-savings contract:
   forced-light token overrides, page-break-inside protection per
   pedagogy component, interactive-to-static rendering rules.
   Reusable by future slide-deck print mode without duplication.

**One targeted MDX-pipeline change**:

3. **`packages/astro/src/lib/pedagogy-index-extractor.ts`** — extend
   the existing remark plugin (which already walks chapter MDX and
   extracts GlossaryTerm usages by slug at line 793) to mark the
   first `<GlossaryTerm>` per slug per chapter with
   `data-first-use="true"` and inject a sibling
   `<span class="sophie-glossary-footnote">` carrying the definition
   HTML. CSS in `print.css` hides the footnote by default and
   reveals it under `@media print`.

**No runtime JavaScript.** View-mode override is CSS specificity over
`data-view-mode` attribute selectors. Theme override is `@media print`
rebinding of CSS custom properties — fires after the boot script's
`data-theme` setting because CSS cascade resolves media queries last.

## Decisions settled in the brainstorm (2026-05-15)

### 1. Print CSS home: split between `textbook-layout.css` and `@sophie/theme/print.css`

**Layout chrome reset** rules know class names owned by `@sophie/astro`
(`.sophie-topbar`, `.sophie-shell`, etc.) and must stay co-located
with the layout that defines them — `textbook-layout.css`.

**A11y + ink-savings contract** rules (forced-light tokens,
page-break-inside protection, interactive-to-static rendering,
roll-up entry atomicity) are layout-agnostic. They live in a new
`packages/theme/src/print.css` exported by `@sophie/theme`. Future
slide-deck print polish (ADR 0006) imports the same file — no
duplication.

**Why not single-file:** collapses two change vectors. Future
slide-deck print mode would duplicate the a11y rules. Cheap now,
costly later — violates ADR 0023's "vertical-slice but plan
ahead" framing.

**Why not theme-only:** violates ADR 0001 package purity.
`@sophie/theme` cannot import from `@sophie/astro`. Putting
`.sophie-topbar` in a theme stylesheet means theme would need to
know layout class names.

### 2. Greenfield, not a port

The CLAUDE.md "Existing course SCSS to port, not redesign" rule was
written before the audit found that the `_archive/` print SCSS is
slide-focused. There is no chapter-print prior art to port. PR 10
writes fresh chapter print rules guided by:
- General print-design best practices (page-break-inside on atoms,
  forced light mode, hide interactive chrome).
- The a11y brief Anna specified (high contrast, no color-only
  signaling, preserved pedagogy).
- The decisions captured in this design doc.

The audit is cited; the framing is honest.

### 3. No URL suffixes; PDF preserves hyperlinks

The classical print-stylesheet rule `a[href]::after { content: " ("
attr(href) ")" }` exists to give paper-print readers a way to follow
links. In 2026 the dominant print outcome is **Save as PDF**: Chrome,
Safari, Edge all default to PDF in the print dialog. PDFs preserve
`<a href>` elements as clickable hyperlinks — clicking opens the
browser.

The contract drops the URL-suffix rule entirely:
- External links (`https://arxiv.org/...`) remain clickable in PDF.
- Internal site links (`/ch02#sec-1`) remain clickable in PDF and
  jump within the PDF when the chapter is printed whole.
- In-page anchors (`#fig-3`) remain clickable in PDF.

**Paper-print fallback** loses URL information. The mitigation is
**author-side self-describing link text** — `<a href="...">arXiv:
2401.12345</a>` rather than `<a href="...">here</a>`. This is a
style-guide / AI-pedagogy-review concern, not a CSS concern.

### 4. Color-scheme normalization: force light tokens for prose+chrome; figures as authored

`@media print` redefines all semantic theme tokens (`--sophie-bg`,
`--sophie-text`, `--sophie-surface-*`, `--sophie-border`,
`--sophie-muted`, etc.) to their `*-light` counterparts, overriding
any `<html data-theme="dark">` setting from the boot script. The CSS
cascade resolves media queries last, so this works without `!important`.

```css
@media print {
  :root,
  html[data-theme="dark"],
  html[data-theme="system"] {
    --sophie-bg: var(--sophie-bg-light);
    --sophie-text: var(--sophie-text-light);
    /* etc. — all semantic tokens redirect to *-light */
  }
  :root { color-scheme: light; }
}
```

**Figures and images render as authored.** A dark-background astronomy
figure stays dark — that's an intentional author choice (dark sky,
dark nebula). Forcing light mode globally would corrupt astronomy
imagery. The token override applies to prose, chrome, asides,
callouts, and equation backgrounds; not to `<img>`, `<figure>`, or
SVG content within figures.

### 5. Moderate page-break-inside contract

Each named pedagogy atom that fits comfortably on a single printed
page gets `break-inside: avoid`. Larger blocks (long code, long
misconceptions, full learning-objectives lists) allow breaking to
prevent excessive white space at page bottoms.

| Element | `break-inside` |
|---|---|
| `<figure>` (Figure component + caption) | `avoid` |
| `.sophie-key-equation` | `avoid` |
| `.sophie-key-insight` card | `avoid` |
| `.sophie-misconception` (short) | `avoid` |
| `.sophie-aside` (short callouts) | `avoid` |
| `.sophie-objective-item` (single objective) | `avoid` |
| `.sophie-glossary-footnote` (first-use inline definition) | `avoid` |
| `.sophie-rollup-entry` (per entry on roll-up pages) | `avoid` |
| `.sophie-code-cell` | `auto` (must allow breaks) |
| `.sophie-misconception` long body | `auto` |
| `<ol class="sophie-learning-objectives">` (full list) | `auto` |
| `.sophie-collapsible-card` expanded body | `auto` |

Task 4 of the implementation plan does a manual headless-print audit
of the smoke chapters + roll-up pages and tunes per-component rules
if the audit surfaces concrete legibility problems.

### 6. Interactive components expand to static pedagogy-preserving form

| Component | Print behavior |
|---|---|
| `<CollapsibleCard>` | All cards expanded. Chevron hidden. Body fully visible. |
| `<InteractiveCheckbox>` | Renders as a static empty checkbox glyph (`appearance: auto; pointer-events: none`). |
| `<Predict>` | Question shown. Reveal-button hidden. Blank answer-space block drawn below the question (4em min-height + bottom border) so the reader can write on paper or annotate on PDF. |
| `<SelfAssessment>` | Question shown. Answer-key reveal-button hidden; answer key rendered expanded. Reader self-grades by discipline. |
| `<GlossaryTerm>` | First-use per slug per chapter shows inline footnote-style definition (`<span class="sophie-glossary-footnote">` populated by the remark plugin). Subsequent uses print as styled term text only. |

**Why first-use only for GlossaryTerm:** ink-savings + visual
density. A term that appears 5× in a chapter doesn't need its
definition shown 5×.

**Implementation note for GlossaryTerm:** the remark plugin
extension is build-time (deterministic, no runtime cost), not a
client-side first-use Set (would break under React strict mode +
hydration). The plugin sets `data-first-use="true"` on the first
occurrence per slug per chapter AND injects a sibling
`<span class="sophie-glossary-footnote">` carrying the definition
HTML. CSS hides the span by default; `@media print` reveals it.

### 7. A11y verification via axe-core under print emulation

The Playwright spec runs axe-core inside
`page.emulateMedia({ media: "print" })`. Aligns with ADR 0004's
mandatory a11y testing. Catches contrast issues against the
forced-light tokens — specifically aside/callout background colors
that may not meet AA contrast on white page background.

## Print contract — full reference

### `packages/astro/src/styles/textbook-layout.css` (append)

```css
@media print {
  /* Hide chrome */
  .sophie-topbar,
  .sophie-sidebar,
  .sophie-right,
  .sophie-search-trigger {
    display: none;
  }

  /* Force Wide layout regardless of data-view-mode */
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

**Note:** the existing scoped `@media print` rule in
`packages/astro/src/components/SearchTrigger.astro:68–72` will be
removed in Task 2 of the implementation plan. Single source of truth
in `textbook-layout.css`.

### `packages/theme/src/print.css` (new)

```css
/* (1) Forced light-mode tokens for prose+chrome regardless of data-theme.
   Figures (containers + image content) inherit nothing here — they
   render as authored. */
@media print {
  :root,
  html[data-theme="dark"],
  html[data-theme="system"] {
    --sophie-bg: var(--sophie-bg-light);
    --sophie-text: var(--sophie-text-light);
    --sophie-surface-1: var(--sophie-surface-1-light);
    --sophie-surface-2: var(--sophie-surface-2-light);
    --sophie-border: var(--sophie-border-light);
    --sophie-muted: var(--sophie-muted-light);
    /* additional semantic tokens redirected to *-light */
  }

  :root { color-scheme: light; }
}

/* (2) Page-break-inside protection — moderate contract */
@media print {
  figure,
  .sophie-key-equation,
  .sophie-key-insight,
  .sophie-aside,
  .sophie-objective-item,
  .sophie-glossary-footnote,
  .sophie-rollup-entry {
    break-inside: avoid;
  }
}

/* (3) Interactive components → static pedagogy-preserving form */
@media print {
  .sophie-collapsible-card [data-state="closed"] { display: block; }
  .sophie-collapsible-card-chevron { display: none; }

  .sophie-interactive-checkbox input[type="checkbox"] {
    appearance: auto;
    pointer-events: none;
  }

  .sophie-predict[data-revealed="false"] .sophie-predict-reveal-button {
    display: none;
  }
  .sophie-predict::after {
    content: "";
    display: block;
    min-height: 4em;
    border-bottom: 1px solid var(--sophie-border);
  }

  .sophie-self-assessment-answer { display: block; }
  .sophie-self-assessment-reveal-button { display: none; }

  .sophie-glossary-term[data-first-use="true"] .sophie-glossary-footnote {
    display: inline;
  }
}

/* Default (non-print) state: glossary footnote spans are hidden */
.sophie-glossary-footnote { display: none; }
```

### Remark plugin extension (`pedagogy-index-extractor.ts`)

Pseudocode for the addition (full implementation in the plan):

```ts
// In the existing chapter MDX walk that finds <GlossaryTerm name="..."> usages:
const seenSlugsThisChapter = new Set<string>();

for (const node of glossaryTermNodes) {
  const slug = slugify(node.attributes.name);
  if (!seenSlugsThisChapter.has(slug)) {
    seenSlugsThisChapter.add(slug);
    node.attributes["data-first-use"] = "true";
    // Inject sibling footnote span carrying the full definition HTML
    const footnoteSpan = h(
      "span",
      { className: "sophie-glossary-footnote" },
      lookupDefinitionBody(slug) // existing pedagogy-index API
    );
    insertSiblingAfter(node, footnoteSpan);
  }
}
```

## Test plan

### Playwright e2e (`examples/smoke/e2e/print-mode.spec.ts`)

Four tests, RED-first per Bucket-C precedent. 3× consecutive run
discipline before merging.

```ts
import AxeBuilder from "@axe-core/playwright";

test("chrome hidden + Wide layout under media: print", async ({ page }) => {
  await page.goto("/chapters/measuring-the-sky/");
  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".sophie-topbar")).toHaveCSS("display", "none");
  await expect(page.locator(".sophie-sidebar")).toHaveCSS("display", "none");
  await expect(page.locator(".sophie-right")).toHaveCSS("display", "none");
  await expect(page.locator(".sophie-shell"))
    .toHaveCSS("grid-template-columns", "none");
});

test("interactive components expand to static form in print", async ({ page }) => {
  await page.goto("/chapters/measuring-the-sky/");
  await page.emulateMedia({ media: "print" });

  // CollapsibleCard: expanded
  const card = page.locator(".sophie-collapsible-card").first();
  await expect(card.locator("[data-state]")).toHaveCSS("display", "block");

  // GlossaryTerm first-use footnote: visible
  const firstUse = page.locator(".sophie-glossary-term[data-first-use='true']").first();
  await expect(firstUse.locator(".sophie-glossary-footnote")).toBeVisible();
});

test("axe-core passes under media: print", async ({ page }) => {
  await page.goto("/chapters/measuring-the-sky/");
  await page.emulateMedia({ media: "print" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("rendered HTML snapshot under media: print", async ({ page }) => {
  await page.goto("/chapters/measuring-the-sky/");
  await page.emulateMedia({ media: "print" });
  const content = await page.locator(".sophie-content").innerHTML();
  expect(content).toMatchSnapshot("smoke-chapter-print.html");
});
```

### Unit tests (remark plugin extension)

Extend `packages/astro/src/lib/pedagogy-index-extractor.test.ts`:

```ts
test("marks first-use GlossaryTerm per slug per chapter", async () => {
  const mdx = `
    The <GlossaryTerm name="Luminosity">luminosity</GlossaryTerm> of a star...
    Later we revisit <GlossaryTerm name="Luminosity">luminosity</GlossaryTerm>...
  `;
  const result = await runExtractor(mdx);
  expect(result.glossaryTermNodes[0].attributes["data-first-use"]).toBe("true");
  expect(result.glossaryTermNodes[1].attributes["data-first-use"]).toBeUndefined();
  expect(result.glossaryTermNodes[0].siblings).toContainEqual(
    expect.objectContaining({
      tagName: "span",
      className: "sophie-glossary-footnote",
    })
  );
});
```

### Verification commands

Per CLAUDE.md conventions:

- `pnpm exec biome check .` — 0 warnings + 0 errors
- `pnpm turbo run typecheck` — clean
- `pnpm turbo run test` — clean
- `pnpm --filter @sophie/astro test:unit` — clean (remark plugin test)
- `pnpm --filter @sophie/components test` — clean (no component changes,
  but verify no regressions)
- `pnpm install --frozen-lockfile` — clean (pre-PR lockfile check
  per `feedback_pre_pr_lockfile_check.md`)
- 3× consecutive `pnpm --filter smoke playwright test print-mode`
  (Bucket-C condition-based-waiting discipline)

## Critical files

**To modify:**

- `packages/astro/src/styles/textbook-layout.css` (append @media print
  block)
- `packages/astro/src/components/SearchTrigger.astro` (remove scoped
  @media print rule; consolidated upstream)
- `packages/theme/src/print.css` (new)
- `packages/theme/src/index.ts` (export print.css)
- `packages/astro/src/styles/` entry — import `@sophie/theme/print.css`
- `packages/astro/src/lib/pedagogy-index-extractor.ts` (extend remark
  plugin to mark first-use + inject footnote span)
- `packages/astro/src/lib/pedagogy-index-extractor.test.ts` (new test)
- `examples/smoke/e2e/print-mode.spec.ts` (new)

**To read for context:**

- `packages/astro/src/components/TextbookLayout.astro:250–360` — DOM
  structure
- `packages/astro/src/preferences/view-mode.ts:29–36` — view-mode
  primitive (ADR 0032)
- `examples/smoke/e2e/theme-toggle.spec.ts:30–31` — `emulateMedia`
  pattern
- `examples/smoke/e2e/view-modes.spec.ts` — Playwright spec structure
- `packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx`
  — definition body access via `lookupDefinition`

## ADRs revisited

- **ADR 0001** (package purity) — justifies the textbook-layout.css /
  theme split; theme cannot import layout class names.
- **ADR 0005** (three-layer theming) — print contract is a
  theme-layer concern.
- **ADR 0019** (Radix UI primitives) — Radix Dialog `aria-modal`
  state should not break in print emulation; the axe-core test
  catches any regression.
- **ADR 0023** (vertical-slice-first) — Task 4 audit drives
  per-component page-break tuning; don't pre-abstract rules for
  hypothetical breakage.
- **ADR 0032** (vanilla-JS chrome state) — `data-view-mode` is the
  primitive being overridden by CSS specificity; no JS changes.
- **ADR 0037** (cross-bundle DOM observation) — confirm aside
  positioning observers don't fire spuriously under `emulateMedia`
  (chrome-hide makes aside positioning moot).
- **ADR 0038** (pedagogy-index pattern) — the remark plugin extension
  for first-use GlossaryTerm marking happens in the existing
  pedagogy-index extractor; cohabits the same AST walk.

## Open questions

None. All brainstorm decision points (1–6 from the meta-plan, plus
the first-use-glossary-footnote scope expansion) are settled.

## Risks

- **Existing token contract may not have `*-light` variants for
  every semantic token.** The forced-light override assumes
  `--sophie-bg-light`, `--sophie-text-light`, etc. exist alongside
  the runtime-active tokens. Verification in Task 3 of the plan:
  audit `packages/theme/src/tokens.ts` for completeness; add missing
  `*-light` variants if needed (or use an alternative redirection
  scheme).
- **CodeCell line-wrapping in print.** Long code lines may extend
  past page width and clip. Task 4 audit checks; if observed,
  add `white-space: pre-wrap` under `@media print`.
- **axe-core under print emulation may surface contrast issues
  in light-mode tokens.** If aside background colors don't meet AA
  contrast on white page background, the test will fail. Fix:
  adjust the offending `*-light` token values in
  `packages/theme/src/tokens.ts`, NOT suppress the axe rule.

## Out of scope

- Slide-deck print polish (future PR; ADR 0006). The
  `@sophie/theme/print.css` file is the seam for that work.
- Paper-print-specific URL suffixes (author-side guidance).
- SelfAssessment "inverted answer key" gimmick (not pedagogically
  serious).
- Predict revealed-state print rendering (handled implicitly by
  `data-revealed` attribute reads; if revealed-state prose differs
  meaningfully from unrevealed, this design treats both as fine —
  print just shows whatever state the DOM is in).

## Sequencing

Design doc lands on main → implementation plan (Step 4) → execution
on worktree branch `feat/pr-10-print-polish` (Step 5) →
roadmap update closes Bucket B (Step 6).
