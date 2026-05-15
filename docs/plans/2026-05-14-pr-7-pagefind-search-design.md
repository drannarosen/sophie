# PR 7 — Pagefind faceted search (engineering design)

**Status:** Approved 2026-05-14 via the brainstorming flow with Anna.
Implementation plan follows at
`docs/plans/2026-05-14-pr-7-pagefind-search-plan.md` (separate doc).

## 0. Context

PR 7 is the second-to-last item in Bucket B (chrome / foundation
PRs). It adds course-wide search via Pagefind, accessible from any
chapter via Cmd/Ctrl+K, exposing the 7 first-class pedagogy entity
types from the post-Bucket-C `PedagogyIndex` as faceted search
results alongside conventional page-level prose results.

Sophie has had no search since Phase 0. Students can navigate by
module / chapter / in-page ToC; readers wanting to find a specific
equation, glossary term, key insight, or misconception by name have
no path other than scrolling chapters they already know about.
PR 7 closes that gap. Bucket B's PR 6 audit
(`docs/reviews/2026-05-13-bucket-b-pr6-audit.md`) named PR 7 as the
single chrome primitive that legitimately needs a React island
(Radix Dialog for focus trap + keyboard nav, per
[ADR 0032](../website/decisions/0032-vanilla-js-chrome-state.md));
[ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md)
named PR 7 as a downstream consumer of the pedagogy-index pattern.

The brainstorm answered six decision points:

| # | Decision | Outcome |
|---|---|---|
| 1 | Search mental model | "Find a thing" — pedagogy entities as first-class results |
| 2 | Facet set | All 7 entity types (chapters, terms, equations, key insights, figures, misconceptions, objectives); Module as scope filter |
| 3 | Preview cards | Tiered — uniform base + KaTeX rich tail for equations + severity badge for misconceptions |
| 4 | Index mechanics | Default HTML crawl + postbuild custom-records from pedagogy-index |
| 5 | LDS-foundation entities | Out of v1 (no indexable data yet); converter registry leaves the seam open |
| 6 | A11y + UX state | Radix Dialog mechanics + `aria-activedescendant` listbox model |

## 1. Architecture & data flow

### Package boundaries

Per [ADR 0001](../website/decisions/0001-platform-not-monorepo.md):

- `@sophie/components` owns the **React UI**. Framework-pure:
  imports React, Zod, and `@sophie/*` only — never `astro:*`.
  - `<SearchModal>` — Radix Dialog with focus trap.
  - `<SearchInput>` — text input + Cmd/Ctrl+K hint badge.
  - `<ChipStrip>` — horizontal scroll of entity-type toggles.
  - `<ResultList>` — `role="listbox"` with `aria-activedescendant`.
  - `<ResultCard>` — tiered preview card with a switch on
    `record.filters.type[0]` for the rich tail.
- `@sophie/astro` owns the **build pipeline** and the **mount point**.
  - `defineSophieIntegration()` already exists; extend it to register
    an `astro:build:done` hook that invokes the postbuild step.
  - Postbuild reads `dist/.sophie/pedagogy-index.json` (the canonical
    artifact per
    [ADR 0045](../website/decisions/0045-pedagogical-diff-curriculum-ci.md);
    today the file lands in `dist/.sophie/` as a side effect of
    `pedagogyIndexRemarkPlugin`'s final flush — verify shape during
    implementation).
  - `<SearchTrigger>` Astro component mounts in `<TextbookLayout>`'s
    header chrome. Wraps a `<SearchModal client:idle>` island.

### Two-pipeline index

The Pagefind output is built by two pipelines feeding one
`index.writeFiles()` call:

1. **Default HTML crawl** — `index.addDirectory({ path: "dist/" })`
   walks the built site, harvests `data-pagefind-body` regions (the
   chapter `<main>` per convention), and emits one record per page
   with `filters: { type: ["page"] }`. Free; no component changes.

2. **Custom records from pedagogy-index** — the postbuild step
   iterates the 6 structured entity arrays
   (`definitions`, `equations`, `keyInsights`, `figureRegistry`,
   `misconceptions`, `objectives`) and calls
   `index.addCustomRecord(...)` per entity, emitting:

   ```ts
   {
     url: `/chapters/${entity.chapter}#${entity.anchor}`,
     content: stripHtml(entity.body ?? entity.definition ?? entity.statement),
     language: "en",
     meta: {
       title: deriveTitle(entity),   // type-specific
       locator: `${chapterTitle} · ${moduleTitle}`,
       // type-specific extras (e.g., equation.lhs, misconception.severity)
     },
     filters: {
       type: [entityTypeKey],  // see filter-value gotcha §1.3
       chapter: [entity.chapter],
       module: [entity.module],
     },
   }
   ```

Both pipelines share one `dist/pagefind/` output directory.

### Filter-value gotcha {#filter-value-gotcha}

Pagefind's Node API requires filter values to be **arrays of
strings**, not bare strings:

```ts
filters: { type: ["equation"] }   // ✓ valid
filters: { type: "equation" }     // ✗ runtime error
```

This is documented in Pagefind's Node-API page under
`addCustomRecord`. Sophie's converter registry must enforce the
array shape at the converter return type. A failing-first unit test
should pin this so a future converter author can't accidentally emit
a bare string.

### Extensibility — the converter registry

```ts
type EntityType =
  | "page"
  | "chapter"
  | "term"
  | "equation"
  | "keyInsight"
  | "figure"
  | "misconception"
  | "objective";

type PagefindCustomRecord = {
  url: string;
  content: string;
  language: string;
  meta: Record<string, string>;
  filters: Record<string, string[]>;
};

type EntityToPagefindRecord<Entity> = (
  entity: Entity,
  ctx: { chapterTitle: string; moduleTitle: string; moduleSlug: string },
) => PagefindCustomRecord;

const converters: {
  [K in keyof PedagogyIndexEntitySources]: EntityToPagefindRecord<
    PedagogyIndexEntitySources[K]
  >;
} = {
  definitions: toDefinitionRecord,
  equations: toEquationRecord,
  keyInsights: toKeyInsightRecord,
  figureRegistry: toFigureRecord,
  misconceptions: toMisconceptionRecord,
  objectives: toObjectiveRecord,
};
```

LDS-foundation entities
([ADRs 0040–0046](../website/decisions/0040-teaching-decision-records.md))
have no indexable data in v1. When notation-registry concepts /
misconception-graph nodes / intervention-library entries ship code-
side, adding them is one converter + one registry entry. No UI
change if the existing tiered-card base layout fits; one new rich
tail variant if it doesn't.

### Cross-bundle interaction

PR 7 does not need view-mode awareness in v1 (search is an overlay;
view mode is layout). If a future iteration needs to react —
hide the modal in print, narrow the layout in mobile — the
data-attribute-observation pattern from
[ADR 0037](../website/decisions/0037-cross-bundle-dom-attribute-observation.md)
is the seam. The modal's React tree subscribes via the existing
`useDataAttributeOnHtmlElement` hook; no new infrastructure.

## 2. UX & a11y

### Trigger

Header chrome shows a button:

```text
┌─────────────────────┐
│ 🔍  Search    ⌘K   │
└─────────────────────┘
```

- Visible affordance (icon + label + keyboard hint) for discovery.
- Global `keydown` listener on Cmd+K (macOS) / Ctrl+K (everything
  else) opens the modal. Pressed again closes it.

### Modal

Radix Dialog (per [ADR 0019](../website/decisions/0019-radix-ui-primitives.md))
provides:

- Focus trap engaged on open.
- Focus returns to trigger on close.
- Esc closes.
- Backdrop dims chapter; click closes.
- `aria-modal="true"` and `aria-labelledby` plumbed automatically.

The modal contents:

```text
┌─ ⌘K ──────────────────────────────────────────────────┐
│ search query…                                    [⌘K] │
│ ● All  Pages  Terms  Eqns  Insights  Miscs  Figs  Objs│   ← chip strip
├─────────────────────────────────────────────────────── ┤
│ 🔤 Term · luminosity                            0.91 │   ← uniform base
│    Total radiant power emitted by a body.            │
│    Ch. 4 · Measuring the sky                          │
│                                                       │
│ ∫  Eq E12 · Stefan-Boltzmann luminosity         0.87 │   ← KaTeX tail
│    L = 4πR²σT⁴   [rendered]                          │
│    Ch. 7 · Stellar radiation                          │
│                                                       │
│ ⚠ Misconception · [dangerous]                    0.74 │   ← severity tail
│    "Brighter stars are hotter."                      │
│    Ch. 4 · Measuring the sky                          │
└────────────────────────────────────────────────────── ┘
```

### Keyboard model

Cleanly splits the keyboard space so users can type continuously
without focus management costs:

| Key | Action |
|---|---|
| Cmd/Ctrl+K | Open modal (anywhere) or close it (if open) |
| Esc | Close modal |
| `/` | Focus search input (familiar from GitHub, MDN) |
| Arrow ↓ / ↑ | Cycle highlighted result row (visual only, see §a11y) |
| Enter | Navigate to highlighted result |
| Tab / Shift-Tab | Cycle chip strip filters |
| Enter on a chip | Toggle that filter |

**Input keeps real DOM focus throughout.** Arrow keys do not move
focus — they update `aria-activedescendant` on the listbox, which
screen readers announce. This is the canonical pattern for
combobox / command-palette UIs (W3C ARIA Authoring Practices).

### A11y contract

Per [ADR 0004](../website/decisions/0004-component-contract-revisions.md) +
axe-core mandatory:

| Element | Role / attr |
|---|---|
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Search input | standard text input, `aria-controls={listId}`, `aria-activedescendant={highlightedRowId}`, `aria-expanded` |
| Chip strip | `role="tablist"`, chips `role="tab"` with `aria-selected` |
| Result list | `role="listbox"`, labeled |
| Result row | `role="option"`, `aria-label` summarizing type + title + locator |
| Count announcer | `aria-live="polite"`, debounced settle text ("5 results" / "no results"); never `assertive` |
| Empty state | rendered with screen-reader-accessible message |
| Loading state | `aria-busy="true"` on listbox; spinner with `aria-label` |
| Error state | `role="status"` with retry affordance |

### Pagefind loading

Lazy-load the Pagefind JS bundle on first Cmd+K press. Pagefind's
own bundle is ~50KB; the per-page index slices stream on demand.
The first-open latency is ~50–150ms perceived; subsequent opens are
instant.

v2 candidate (defer until measured): eager-on-trigger-hover using
Chrome's prerender heuristic. Pagefind's `pagefind.preload()` exists
for this; deferring per YAGNI.

## 3. Component shape

```text
@sophie/components/src/components/Search/
├─ Search.schema.ts              — Zod for SearchResultSchema (filtered subset of Pagefind's output)
├─ SearchModal.tsx               — Radix Dialog wrapper + state machine
├─ SearchModal.test.tsx          — render + keyboard nav + a11y
├─ SearchModal.stories.tsx       — Storybook visual reference
├─ SearchModal.module.css        — modal chrome
├─ ResultList.tsx                — listbox + aria-activedescendant
├─ ResultList.test.tsx           — arrow nav, count announcer
├─ ResultCard.tsx                — switch on type → base + rich tail
├─ ResultCard.test.tsx           — 7 type variants render correctly
├─ ResultCard.module.css         — base layout + per-type modifiers
├─ ChipStrip.tsx                 — tablist for entity-type filters
├─ ChipStrip.test.tsx            — toggle, keyboard, a11y
└─ index.ts                      — barrel
```

`@sophie/astro` additions:

```text
packages/astro/src/lib/
├─ pagefind-postbuild.ts         — orchestrates createIndex + addDirectory + addCustomRecord per converter
├─ pagefind-postbuild.test.ts    — converter-registry round-trip (Layer 1.5)
├─ pagefind-converters/
│  ├─ index.ts                   — converter registry + EntityType union
│  ├─ definitions.ts             — toDefinitionRecord
│  ├─ definitions.test.ts
│  ├─ equations.ts               — toEquationRecord (carries lhs/units in meta)
│  ├─ equations.test.ts
│  ├─ key-insights.ts
│  ├─ key-insights.test.ts
│  ├─ figures.ts                 — uses alt + caption for content; thumbnail URL in meta
│  ├─ figures.test.ts
│  ├─ misconceptions.ts          — severity in meta (intuitive | inconsistent | dangerous)
│  ├─ misconceptions.test.ts
│  ├─ objectives.ts              — verb + body
│  └─ objectives.test.ts
├─ transform-mdx-compile.test.ts — (Layer 1.6 from PR 6 follow-up; precedent)
└─ pagefind-compile.test.ts      — Layer 1.6 for PR 7

packages/astro/src/components/
└─ SearchTrigger.astro           — header-chrome button + ⌘K listener + <SearchModal client:idle>
```

## 4. Index-build pipeline (Node API)

The postbuild step at `pagefind-postbuild.ts`:

```ts
import * as pagefind from "pagefind";
import { readFileSync } from "node:fs";
import { converters } from "./pagefind-converters";
import { PedagogyIndexSchema } from "@sophie/core/schema";

export async function buildPagefindIndex(distPath: string): Promise<void> {
  const indexPath = `${distPath}/.sophie/pedagogy-index.json`;
  const indexJson = JSON.parse(readFileSync(indexPath, "utf-8"));
  const pedagogyIndex = PedagogyIndexSchema.parse(indexJson);

  const { index } = await pagefind.createIndex({
    rootSelector: "main",
    excludeSelectors: [".no-index", "nav", "footer", "[data-pagefind-ignore]"],
    forceLanguage: "en",
  });

  // Pipeline 1: default HTML crawl
  const { errors: dirErrors, page_count } = await index.addDirectory({
    path: distPath,
  });
  if (dirErrors.length > 0) {
    throw new Error(`Pagefind HTML crawl errors: ${dirErrors.join("; ")}`);
  }

  // Pipeline 2: custom records per entity, via the converter registry
  for (const [entitySource, converter] of Object.entries(converters)) {
    const entities = pedagogyIndex[entitySource as keyof typeof converters];
    for (const entity of entities) {
      const chapter = pedagogyIndex.chapters.find(
        (c) => c.slug === entity.chapter,
      );
      const module = pedagogyIndex.modules.find(
        (m) => m.slug === chapter?.module,
      );
      if (!chapter || !module) continue;

      const record = converter(entity, {
        chapterTitle: chapter.title,
        moduleTitle: module.title,
        moduleSlug: module.slug,
      });
      const { errors } = await index.addCustomRecord(record);
      if (errors.length > 0) {
        throw new Error(
          `Pagefind addCustomRecord errors for ${entitySource}: ${errors.join("; ")}`,
        );
      }
    }
  }

  // Emit the index to dist/pagefind/
  const { errors: writeErrors } = await index.writeFiles({
    outputPath: `${distPath}/pagefind`,
  });
  if (writeErrors.length > 0) {
    throw new Error(`Pagefind writeFiles errors: ${writeErrors.join("; ")}`);
  }

  await pagefind.close();
}
```

Wired via Astro's integration hooks in `defineSophieIntegration()`:

```ts
{
  name: "@sophie/astro/search",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      await buildPagefindIndex(fileURLToPath(dir));
    },
  },
}
```

## 5. Pagefind client integration (`SearchModal`)

```tsx
// SearchModal.tsx (sketch — full file in plan)
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState } from "react";

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<EntityType | "all">("all");
  const [pagefind, setPagefind] = useState<PagefindAPI | null>(null);

  // Cmd/Ctrl+K global toggle
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lazy-load Pagefind on first open
  useEffect(() => {
    if (open && !pagefind) {
      // Pagefind is published to /pagefind/ in the static build
      import(/* @vite-ignore */ "/pagefind/pagefind.js").then(setPagefind);
    }
  }, [open, pagefind]);

  // Debounced query → Pagefind
  useEffect(() => {
    if (!pagefind || !query) return setResults([]);
    const handle = setTimeout(async () => {
      const filters = activeFilter === "all"
        ? undefined
        : { type: activeFilter };
      const search = await pagefind.search(query, { filters });
      const data = await Promise.all(
        search.results.slice(0, 25).map((r) => r.data()),
      );
      setResults(data);
    }, 150);
    return () => clearTimeout(handle);
  }, [pagefind, query, activeFilter]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-labelledby="sophie-search-title"
        >
          <Dialog.Title id="sophie-search-title" className={styles.srOnly}>
            Search
          </Dialog.Title>
          <SearchInput value={query} onChange={setQuery} />
          <ChipStrip active={activeFilter} onChange={setActiveFilter} />
          <ResultList results={results} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

## 6. Test plan

Four-layer pyramid, matching Bucket-C precedent + the new
Layer 1.6 introduced in PR 6's fix commit
([Equation transform → MDX compile round-trip](../plans/2026-05-14-lo-checkbox-remark-extraction-design.md)).

### Layer 1 — UI unit (`@sophie/components`)

Vitest + Testing Library + axe-core. Tests:

- `ResultCard.test.tsx`:
  - Renders all 7 type variants from fixture records.
  - Equation variant renders KaTeX (assert `<span class="katex">` in DOM).
  - Misconception variant renders severity badge with correct
    aria-label.
  - Locator (`Ch · Module`) is consistent across all variants.
  - axe-core: zero violations on each variant.

- `ResultList.test.tsx`:
  - Renders empty state when `results.length === 0`.
  - Arrow Down/Up cycle `aria-activedescendant`; input retains focus.
  - Enter on highlighted row fires `onSelect` with that record.
  - `aria-live` count announcer text updates after debounce.

- `ChipStrip.test.tsx`:
  - Tab cycles chips; arrow keys do not (those belong to results).
  - Enter on chip toggles selection; `aria-selected` reflects state.
  - Only one chip selected at a time (radio-group semantics within
    tablist).

- `SearchModal.test.tsx`:
  - Cmd+K opens; Esc closes; Cmd+K again closes.
  - Focus traps inside modal (Radix's `FocusScope` test).
  - Focus returns to `<SearchTrigger>` button on close.

### Layer 1.5 — converter unit (`@sophie/astro`)

Vitest, no Pagefind dep. One test file per converter:

- Feed a fixture `Entity` (one per `EntityType`).
- Assert the emitted record has:
  - `url` with correct chapter slug + anchor format.
  - `content` is a flat string (HTML stripped if source was HTML).
  - `meta` contains `title`, `locator`, plus type-specific fields.
  - `filters.type === [entityTypeKey]` (array, single element).
  - `language === "en"`.
- One test in `pagefind-converters/index.test.ts` asserts the
  registry is exhaustive over `EntityType` (compile-time + runtime
  check). This is the load-bearing extensibility seam.

### Layer 1.6 — index-build round-trip

`pagefind-compile.test.ts`. Runs Pagefind's Node API against a tiny
in-memory fixture:

- 1 fixture page HTML + a fixture `PedagogyIndex` with 1 entity of
  each type.
- `await buildPagefindIndex(tmpDir)`.
- Read the resulting `pagefind/pagefind-entry.json` + slice files.
- Assert: count of records = 1 page + 7 entities = 8; filters
  round-trip; `meta.title` survives.
- Pin one specific failure mode: a converter returning
  `filters: { type: "term" }` (bare string) must error out at the
  pipeline boundary, not silently corrupt the index.

This layer closes the gap between converter-unit (Layer 1.5) and
Playwright e2e (Layer 2) — the same gap that the LO checkbox PR's
post-merge Layer 1.6 closed for the MDX-compile pipeline. Codified
in CLAUDE.md's SoTA-over-simple principle.

### Layer 2 — Playwright e2e on smoke

`examples/smoke/e2e/search.spec.ts`. Asserts:

- Cmd+K opens modal; backdrop visible; input focused.
- Typing a known smoke term ("luminosity" or whichever the fixture
  uses) produces ≥1 result for each of: page, term, equation,
  insight, misconception (figures + objectives if the smoke
  chapters author them).
- Chip toggle: clicking "Equations" narrows to type=equation results.
- Arrow Down + Enter navigates to the result's URL; deep-link
  anchor lands on the right section.
- Esc closes.
- 3× consecutive runs green (Bucket-C condition-based-waiting
  discipline; wait on Radix's `data-state="open"` attribute or the
  `aria-live` count region — never on fixed timeouts).
- axe-core check on modal-open and modal-closed states.

## 7. Pattern precedent

This PR sets the canonical shape for any future feature that wants
to **consume the pedagogy-index for a structured view**:

1. Build pipeline reads `dist/.sophie/pedagogy-index.json`.
2. A typed converter registry maps each `EntityType` to the feature-
   specific output shape.
3. The registry's exhaustiveness over `EntityType` is unit-tested.
4. New entity types (e.g., LDS-foundation entries when they ship)
   plug in by adding one converter + one registry entry; no UI
   change required unless the new type needs a new rich tail.

Possible future consumers using this pattern:

- A "concept map" page (B6 in vision/features) — turns the
  pedagogy-index into a graph with terms / equations / misconceptions
  as nodes.
- LLM context bundling (B4 — "Course Brain") — serializes the
  index for AI consumption with the same converter discipline.
- Print-mode roll-up (PR 10's adjacent surface) — could reuse a
  converter to produce print-friendly per-entity summaries.

## 8. Out of scope (v1)

Captured explicitly so the implementation plan inherits a clean
non-goals list:

- **Authored ranking weights.** Pagefind's BM25 default ships. If
  authoring volume reveals a bias (e.g., chapter prose drowns out
  glossary terms), revisit with `sort` field weights.
- **LDS-foundation entity surfacing.** Notation registry,
  misconception graph, intervention library, teaching moves,
  equation biography all have no indexable data yet. The converter
  registry leaves the seam open; converters land alongside their
  respective code-side data flushes in Phase 3.
- **Search analytics / query logging.** Out of v1 — privacy posture
  for Sophie hasn't been decided.
- **Multi-course federated search.** Each consumer course repo
  builds its own index; cross-course federation is post-v2.
- **Search history / recents.** Persistence overhead without proven
  user benefit; v3 candidate at earliest.
- **Mobile-specific UX.** Modal works on mobile via Radix Dialog
  responsive defaults; bespoke mobile shape (e.g., bottom-sheet) is
  deferred.

## 9. Pitfalls — sharp edges the implementation plan must address

1. **Filter-value array shape.** §1.3 above. Bare-string filters
   silently produce wrong index. Layer 1.5 + 1.6 tests pin this.

2. **`pedagogy-index.json` artifact timing.** The plugin writes the
   index to `dist/.sophie/` after MDX render. The postbuild hook
   must run *after* that flush. `astro:build:done` is the correct
   gate per Astro's hook lifecycle; verify during implementation.

3. **KaTeX double-render.** Chapter pages already pull KaTeX for
   their authored equations. The search modal reuses the same KaTeX
   for the equation rich tail. Two concerns:
   - Bundle dedup — `@sophie/components` should mark `katex` as a
     peer dep so the consumer doesn't double-bundle.
   - Render synchronicity — KaTeX renders inside `ResultCard` are
     synchronous; debounce the search query to 150ms so KaTeX runs
     after the user pauses typing, not on each keystroke.

4. **Pagefind's HTML crawl picks up the search modal itself.** The
   modal is rendered into the DOM (via Radix Portal); without an
   exclusion it would self-index. Use Pagefind's `data-pagefind-
   ignore` attribute on the modal's root, and include
   `[data-pagefind-ignore]` in `excludeSelectors` in
   `createIndex({ excludeSelectors })`.

5. **Anchor format.** Chapter pages currently use anchor formats
   like `#ki-3`, `#misc-2`, `#eq-E12`, `#term-luminosity`. The
   converter must match the same format the chapter renders. If
   the anchor format diverges, the result URL deep-link doesn't
   land. Pin the format in a shared constant (`anchorFor(entity)`)
   used by both the rendering side and the converter side.

6. **Empty entity arrays.** Smoke chapters may not author every
   entity type (e.g., no figures in the spoiler-alerts chapter).
   The Layer 2 spec must handle "this type has zero hits in the
   fixture" gracefully — assert presence only for types the
   fixture authors.

7. **`/objectives`, `/equations`, `/figures`, `/misconceptions`,
   `/key-insights`, `/glossary` roll-up pages.** Each is its own
   route in `examples/smoke/dist/`. The default HTML crawl will
   index them. They contain entity content that's *also* indexed
   as custom records. Two records may exist for the same
   underlying entity (one page-level, one custom). Acceptable for
   v1; the chip filter lets users dedupe. Future: consider marking
   roll-up routes with `data-pagefind-ignore` to keep their content
   from the page-record stream.

## 10. Verification

Beyond the test pyramid:

- `pnpm --filter smoke build` produces `dist/pagefind/` containing
  `pagefind.js` + `pagefind-entry.json` + chunked index slices.
- Smoke chapter route renders the `<SearchTrigger>` button in
  header chrome.
- Manual: Cmd+K opens modal; typing a chapter term shows results
  from all 7 entity types where authored; chip filter narrows;
  Enter navigates.
- `pnpm exec biome check .` — zero errors and zero warnings.
- `pnpm turbo run typecheck && pnpm turbo run test` clean.

## 11. Open follow-ups (after merge)

- LDS-foundation converters land in Phase 3 alongside each ADR's
  code-side implementation.
- Eager Pagefind preload — if measured latency on first Cmd+K
  proves annoying, add `pagefind.preload()` on trigger-hover.
- Authored weights — if pedagogy-index authoring volume reveals
  systematic bias, add `sort.weight` per converter.
- Print-mode polish (PR 10) lands next; ensure the search trigger
  is hidden in print (`@media print { display: none }`).
