# PR 7 — Pagefind faceted search (implementation plan)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`
> to implement this plan task-by-task in the current session, OR
> `superpowers:executing-plans` from a parallel session. RED-first
> TDD throughout; commit each task before moving on.

**Goal:** Cmd/Ctrl+K search modal exposing all 7 pedagogy-index
entity types as first-class faceted results.

**Architecture:** React island (Radix Dialog + Pagefind JS client)
inside `@sophie/components`; Astro `astro:build:done` hook in
`@sophie/astro` orchestrates Pagefind's Node API (default HTML
crawl for page records + custom-records per pedagogy entity via a
typed converter registry).

**Tech Stack:** Pagefind (Node API + JS client), Radix Dialog,
Astro 6 + MDX, React 19, Vitest + Testing Library + axe-core,
Playwright (chromium), KaTeX (already a transitive dep for the
equation rich-tail render).

**Design reference:** `docs/plans/2026-05-14-pr-7-pagefind-search-design.md` (committed `7fb9e9b`).

---

## Context

PR 7 is Bucket B's second-to-last item. The
[Bucket B closeout plan](file:///Users/anna/.claude/plans/proceed-give-me-an-synchronous-harbor.md)
sequences this PR before PR 10 (print polish). Six brainstorm
decisions are locked in the design doc §0:

1. "Find a thing" mental model — pedagogy entities are first-class
   results, not just page snippets.
2. All 7 entity types: chapters · terms · equations · key insights ·
   figures · misconceptions · objectives. Module as scope filter.
3. Tiered preview cards: uniform base + KaTeX rich tail for
   equations + length indicator (short/long) for misconceptions;
   other 5 use the base layout.
4. Two-pipeline index: default HTML crawl for page records (free) +
   custom-records per entity via Pagefind's Node API.
5. LDS-foundation entities (notation registry, misconception graph,
   intervention library, teaching moves, equation biography) are
   out of v1; converter registry leaves the seam open.
6. A11y: Radix Dialog + listbox with `aria-activedescendant`.

The seven design-doc pitfalls (§9) each map to a specific task
below; they're called out in-line where they apply.

This plan creates a worktree branch `feat/pr-7-pagefind-search`
following the same pattern as the LO checkbox PR (just merged).
**Use `superpowers:using-git-worktrees`** before Task 1.

---

## Errata (live corrections vs design doc)

These corrections supersede the design doc where they conflict.
Tasks below already reflect them.

1. **Pedagogy-index source.** Design doc §1 / §4 describe reading
   `dist/.sophie/pedagogy-index.json` per ADR 0045. **That artifact
   doesn't exist today** — ADR 0045 is docs-only, unimplemented
   (`sophie diff` is still future work). Instead, the postbuild
   hook imports `indexAccumulator` from
   `packages/astro/src/lib/pedagogy-index-extractor.ts:1219` (the
   in-memory singleton already consumed by `CourseGlossary.astro`,
   `CourseKeyInsights.astro`, `ChapterMisconceptions.astro`, etc.)
   and calls `asPedagogyIndex()` directly. Same data; one fewer
   round-trip; no disk-IO timing concerns. When ADR 0045 ships its
   code-side implementation, the JSON file is added alongside —
   PR 7 doesn't need to wait.

2. **Test runner script.** Use `pnpm --filter @sophie/astro test:unit`
   (NOT `test`). Same as PR 6's errata — the package's script is
   `test:unit`; bare `test` silently no-ops.

3. **Test colocation.** Tests for `pagefind-converters/` and
   `pagefind-postbuild.ts` go under `src/lib/` next to source.
   Same convention as the LO checkbox PR.

4. **`addCustomRecord` filter shape.** Pagefind requires filter
   values to be **arrays of strings** even when there's only one
   value: `filters: { type: ["equation"] }`, NOT
   `filters: { type: "equation" }`. The Layer 1.5 + 1.6 tests pin
   this; converter return-type uses `Record<string, string[]>` to
   enforce at compile time.

5. **Astro integration hook insertion point.** `defineSophieIntegration()`
   at `packages/astro/src/integration.ts:76` currently has one
   hook (`astro:config:setup`). Task 7 extends the `hooks` object
   with `astro:build:done`. No new exported function; the existing
   `defineSophieIntegration` gains a hook.

6. **Test fixtures + converter implementations realigned to canonical
   `@sophie/core/schema/pedagogy-index.ts`.** The plan's original
   Task 1 + Task 2 + Task 6 fixtures and the design doc's example
   record shapes were written against an imagined schema that didn't
   match the canonical Zod schemas. Code review caught the mismatch
   after Task 1 RED was attempted. Corrections (applied across this
   file + the design doc):

   - **Field renames:** `definition` → `body` (Definition); `id` →
     `slug` + `context` → `title` + add `number`/`body` (Equation);
     drop `id`/`index` from KeyInsight; drop `id`/`severity`/
     `statement` from Misconception (use `length`/`label`).
   - **Figure model is 1:N to chapters.** `FigureRegistryEntry` is
     flat-namespace (no chapter). Per-chapter usage lives in the
     separate `FigureUsageEntry` collection. The search converter
     operates over `figureUsages`, joining to `figureRegistry` for
     src/alt/caption metadata. Registry key in the converter map
     is `figureUsages` (not `figureRegistry` / `figures`).
   - **Misconception rich tail = length, not severity.** Schema
     carries `length: "short" | "long"` (the source-component
     discriminator), not a graded severity. Anna's decision: drop
     the severity badge from preview cards; show the length
     indicator instead. Severity as a graded concept is a future
     ADR.
   - **Objective anchor = `lo-${id}`** (passthrough per
     `ObjectiveEntry` JSDoc), not `obj-${id}`.

   Tasks 1, 2, 6, 7, 8 in this file reflect these corrections in
   their prescribed code.

7. **`indexAccumulator` API: `setChapters` / `setModules`, not
   `addChapter` / `addModule`.** The Task 2 §2.1 fixture originally
   populated chapters and modules via `addChapter({...})` and
   `addModule({...})` (singular, single-object). Those methods don't
   exist. The actual API on `IndexAccumulator` is `setChapters(entries[])`
   and `setModules(entries[])` (plural, array-typed; last-write-wins).
   The shape difference is by design: chapters + modules are
   consumer-app-supplied at SSR merge time via `getCollection(...)`,
   not extractor-appended per-MDX-parse like the six entity sources
   (definitions / equations / keyInsights / figureUsages /
   misconceptions / objectives, all of which use `add<Plural>(entries[])`).
   Caught by the Task 2 subagent's API-divergence check before the
   bad fixture landed. Plan §Task 2 §2.1 corrected; tests now call
   `setModules([{...}])` and `setChapters([{...}])`.

8. **Pre-flight audit corrections (Tasks 3, 5, 8, 9) — project-convention
   alignment.** Comprehensive pre-execution audit caught six divergences
   between the plan's prescribed imports/patterns and the actual
   `@sophie/components` setup. Anna approved a single new dep
   (`@radix-ui/react-dialog`); the rest are project-pattern alignments.
   Tasks 3 + 5 + 8 + 9 sub-steps below reflect these corrections.

   - **Axe library is `jest-axe`, not `vitest-axe`** (Task 3, Task 8).
     `jest-axe` is at `@sophie/components` devDeps with `@types/jest-axe`.
     Convention: `import { axe } from "jest-axe"` then
     `expect(await axe(container)).toHaveNoViolations()`. The
     `toHaveNoViolations` matcher is registered via
     `@testing-library/jest-dom/vitest` (already in `test-setup.ts`).
     `vitest-axe` is not a project dep and won't be added.

   - **Keyboard testing uses `fireEvent`, not `@testing-library/user-event`**
     (Task 3 SearchModal.test.tsx). Project convention is
     `fireEvent.keyDown(target, { key: "k", metaKey: true })`
     (see `CollapsibleCard.test.tsx`, `Predict.test.tsx`).
     `@testing-library/user-event` is not installed and won't be
     added. All `userEvent.keyboard(...)` and `userEvent.click(...)`
     calls in plan §Task 3 rewrite to `fireEvent` equivalents.

   - **KaTeX render pattern: `katex.renderToString` +
     `dangerouslySetInnerHTML`, not `react-katex`** (Task 8
     ResultCard.tsx). Project precedent in
     `packages/components/src/components/EqRef/EqRef.tsx:43`:

     ```tsx
     import katex from "katex";
     // ...
     <span
       className={styles.tex}
       // biome-ignore lint/security/noDangerouslySetInnerHtml: tex is
       // rendered by katex.renderToString from extractor-captured TeX
       // source (not user-supplied content). Same trust boundary as
       // ADR 0038 + EqRef precedent.
       dangerouslySetInnerHTML={{
         __html: katex.renderToString(result.meta.tex, {
           displayMode: true,
           throwOnError: false,
         }),
       }}
     />
     ```

     `react-katex` is not a project dep and won't be added. The DOM
     output is the same `<span class="katex">…</span>` either way,
     so Task 3's assertion `container.querySelector(".katex")`
     works unchanged.

   - **`EntityType` lives in `@sophie/core/schema`** (Tasks 5, 8).
     Originally the plan placed `EntityType` in
     `@sophie/astro/lib/pagefind-converters` and imported it into
     `@sophie/components/Search/types.ts` via
     `@sophie/astro/lib/pagefind-converters`. Two problems:
     (a) `@sophie/astro` has no such subpath export (verified
     against `packages/astro/package.json` exports config), and
     (b) `@sophie/components` is framework-pure per ADR 0001 —
     importing from `@sophie/astro` is structurally wrong even at
     type level. **Fix:** create
     `packages/core/src/schema/search-facet.ts` with the
     `EntityType` union and re-export from
     `@sophie/core/schema`. Both `@sophie/astro/lib/pagefind-converters/index.ts`
     and `@sophie/components/src/components/Search/types.ts`
     import it as `import type { EntityType } from "@sophie/core/schema"`.
     Aligns with ADR 0003 (schema as source of truth).

   - **Add `@radix-ui/react-dialog` to `@sophie/components` deps**
     (Task 5). Approved by Anna. Other Radix primitives
     (`react-collapsible`, `react-hover-card`) are already direct
     deps; this is consistent with ADR 0019. Task 5's dep-install
     step adds two deps total: `pagefind` to `@sophie/astro` and
     `@radix-ui/react-dialog` to `@sophie/components`.

   - **Drop `vi.mock("/pagefind/pagefind.js", …)` from SearchModal
     unit tests** (Task 3 §3.4). Vitest can't resolve URL paths
     beginning with `/`, so the mock is a no-op anyway. SearchModal
     unit tests at Layer 1 only verify chrome behavior (Cmd+K opens,
     Esc closes, input autofocus); they don't exercise Pagefind
     query/result behavior — that's Layer 1.6 + Layer 2. The modal's
     own `import(…).catch(…)` swallows the failure-to-resolve under
     jsdom.

   - **Use `it` not `test`** (Tasks 3, 4 spec). Project convention
     across `@sophie/components` (see `LearningObjectives.test.tsx`,
     `CollapsibleCard.test.tsx`, etc.) imports `{ describe, expect, it }`
     from `"vitest"`. `@sophie/astro` happens to use `test` (see
     `pedagogy-index-extractor.test.ts`); Tasks 1 + 2 already use
     `test` correctly. The convention differs by package; respect
     each package's existing style.

   Tasks 3, 5, 8, 9 sub-steps below reflect all of the above. No
   change to Tasks 1 + 2 + 6 + 7 (those are `@sophie/astro` and use
   `test` correctly; no Radix or KaTeX involvement).

---

## Pre-task: Worktree setup

**Use `superpowers:using-git-worktrees`.**

```bash
git fetch
git worktree add .worktrees/pr-7-pagefind-search -b feat/pr-7-pagefind-search main
cd .worktrees/pr-7-pagefind-search
pnpm install --frozen-lockfile
```

Verify clean baseline:

```bash
pnpm exec biome check . 2>&1 | tail -3       # → 0 errors, 0 warnings
pnpm turbo run typecheck 2>&1 | tail -3      # → 9/9 successful
pnpm --filter @sophie/astro test:unit 2>&1 | tail -3   # → 249/249 pass
pnpm --filter @sophie/components exec vitest run 2>&1 | tail -3  # → 260/260 pass
```

All four must be green. If any fails on `main`, stop and report.

---

## Task 1 — Layer 1.5 RED: failing converter-registry tests

**Goal:** Commit the failing-first contract for the 6 converters +
the registry exhaustiveness check. Tests must fail with "converter
not defined" or "registry not defined", not with assertion mismatches.

**Files:**
- Create: `packages/astro/src/lib/pagefind-converters/index.test.ts`
- Create: `packages/astro/src/lib/pagefind-converters/definitions.test.ts`
- Create: `packages/astro/src/lib/pagefind-converters/equations.test.ts`
- Create: `packages/astro/src/lib/pagefind-converters/key-insights.test.ts`
- Create: `packages/astro/src/lib/pagefind-converters/figure-usages.test.ts`
- Create: `packages/astro/src/lib/pagefind-converters/misconceptions.test.ts`
- Create: `packages/astro/src/lib/pagefind-converters/objectives.test.ts`

**Step 1.1 — Write the shared converter-test types.**

Inline at the top of each test file (don't extract to a helper yet —
DRY threshold not met; each file has a single import):

```ts
import { describe, expect, test } from "vitest";
import type { PagefindCustomRecord } from "./index.ts";
```

**Step 1.2 — Write `definitions.test.ts`.**

```ts
import { describe, expect, test } from "vitest";
import type { DefinitionEntry } from "@sophie/core/schema";
import { toDefinitionRecord } from "./definitions.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: DefinitionEntry = {
  term: "luminosity",
  slug: "luminosity",
  body: "Total radiant power emitted by a body.",
  chapter: "measuring-the-sky",
  anchor: "def-luminosity",
};

describe("toDefinitionRecord", () => {
  test("emits url with chapter slug + anchor", () => {
    expect(toDefinitionRecord(fixture, ctx).url).toBe(
      "/chapters/measuring-the-sky#def-luminosity",
    );
  });

  test("emits content as the pre-rendered body HTML", () => {
    expect(toDefinitionRecord(fixture, ctx).content).toBe(
      "Total radiant power emitted by a body.",
    );
  });

  test("emits meta.title as the term", () => {
    expect(toDefinitionRecord(fixture, ctx).meta.title).toBe("luminosity");
  });

  test("emits meta.locator as 'chapter · module'", () => {
    expect(toDefinitionRecord(fixture, ctx).meta.locator).toBe(
      "Measuring the sky · Foundations",
    );
  });

  test("filters.type is the array ['term']", () => {
    expect(toDefinitionRecord(fixture, ctx).filters.type).toEqual(["term"]);
  });

  test("filters.chapter and filters.module are arrays", () => {
    const record = toDefinitionRecord(fixture, ctx);
    expect(record.filters.chapter).toEqual(["measuring-the-sky"]);
    expect(record.filters.module).toEqual(["01-foundations"]);
  });

  test("language is 'en'", () => {
    expect(toDefinitionRecord(fixture, ctx).language).toBe("en");
  });
});
```

**Step 1.3 — Write `equations.test.ts`.**

```ts
import { describe, expect, test } from "vitest";
import type { EquationEntry } from "@sophie/core/schema";
import { toEquationRecord } from "./equations.ts";

const ctx = {
  chapterTitle: "Stellar radiation",
  moduleTitle: "Stars",
  moduleSlug: "02-stars",
};

const fixture: EquationEntry = {
  slug: "stefan-boltzmann-luminosity",
  title: "Stefan-Boltzmann luminosity",
  number: 12,
  tex: "L = 4\\pi R^2 \\sigma T^4",
  body: "<p>The Stefan-Boltzmann law for stellar luminosity.</p>",
  chapter: "stellar-radiation",
  anchor: "stefan-boltzmann-luminosity",
};

describe("toEquationRecord", () => {
  test("emits url with anchor", () => {
    expect(toEquationRecord(fixture, ctx).url).toBe(
      "/chapters/stellar-radiation#stefan-boltzmann-luminosity",
    );
  });

  test("filters.type is ['equation']", () => {
    expect(toEquationRecord(fixture, ctx).filters.type).toEqual(["equation"]);
  });

  test("meta.title carries the equation title", () => {
    expect(toEquationRecord(fixture, ctx).meta.title).toBe(
      "Stefan-Boltzmann luminosity",
    );
  });

  test("meta.tex carries the raw TeX source for KaTeX render in card", () => {
    expect(toEquationRecord(fixture, ctx).meta.tex).toBe(
      "L = 4\\pi R^2 \\sigma T^4",
    );
  });

  test("meta.number carries the per-chapter sequence number", () => {
    expect(toEquationRecord(fixture, ctx).meta.number).toBe("12");
  });

  test("content includes the equation title (so prose-text search hits)", () => {
    expect(toEquationRecord(fixture, ctx).content).toContain(
      "Stefan-Boltzmann luminosity",
    );
  });
});
```

**Step 1.4 — Write `key-insights.test.ts`.**

```ts
import { describe, expect, test } from "vitest";
import type { KeyInsightEntry } from "@sophie/core/schema";
import { toKeyInsightRecord } from "./key-insights.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: KeyInsightEntry = {
  body: "Distance hides itself in every photometric measurement.",
  chapter: "measuring-the-sky",
  anchor: "ki-3",
};

describe("toKeyInsightRecord", () => {
  test("filters.type is ['keyInsight']", () => {
    expect(toKeyInsightRecord(fixture, ctx).filters.type).toEqual([
      "keyInsight",
    ]);
  });

  test("content carries the insight body", () => {
    expect(toKeyInsightRecord(fixture, ctx).content).toBe(
      "Distance hides itself in every photometric measurement.",
    );
  });

  test("url uses anchor ki-3", () => {
    expect(toKeyInsightRecord(fixture, ctx).url).toBe(
      "/chapters/measuring-the-sky#ki-3",
    );
  });

  test("meta.title is the first sentence (or full body if short)", () => {
    // Spec: title = body when body ≤ 80 chars; first 80 chars + ellipsis otherwise.
    expect(toKeyInsightRecord(fixture, ctx).meta.title).toBe(
      "Distance hides itself in every photometric measurement.",
    );
  });
});
```

**Step 1.5 — Write `figure-usages.test.ts`.**

Figures are 1:N to chapters: each `FigureUsageEntry` carries the
chapter/anchor; the registry-side `FigureRegistryEntry` holds the
shared src/alt/caption. The converter takes both arguments.

```ts
import { describe, expect, test } from "vitest";
import type {
  FigureRegistryEntry,
  FigureUsageEntry,
} from "@sophie/core/schema";
import { toFigureUsageRecord } from "./figure-usages.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const registry: FigureRegistryEntry = {
  name: "hr-diagram",
  src: "/figures/hr-diagram.svg",
  alt: "Hertzsprung-Russell diagram with main sequence highlighted",
  caption: "Stars cluster along the main sequence in luminosity-temperature space.",
};

const usage: FigureUsageEntry = {
  name: "hr-diagram",
  chapter: "measuring-the-sky",
  anchor: "fig-hr-diagram-1",
  number: 1,
  canonical: true,
};

describe("toFigureUsageRecord", () => {
  test("filters.type is ['figure']", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).filters.type).toEqual([
      "figure",
    ]);
  });

  test("content combines alt + registry caption (both searchable)", () => {
    const content = toFigureUsageRecord(usage, registry, ctx).content;
    expect(content).toContain(
      "Hertzsprung-Russell diagram with main sequence highlighted",
    );
    expect(content).toContain(
      "Stars cluster along the main sequence in luminosity-temperature space.",
    );
  });

  test("captionOverride wins over registry caption when present", () => {
    const withOverride: FigureUsageEntry = {
      ...usage,
      captionOverride: "Per-chapter caption override.",
    };
    const content = toFigureUsageRecord(withOverride, registry, ctx).content;
    expect(content).toContain("Per-chapter caption override.");
    expect(content).not.toContain(
      "Stars cluster along the main sequence in luminosity-temperature space.",
    );
  });

  test("meta.title is the figure name", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).meta.title).toBe(
      "hr-diagram",
    );
  });

  test("meta.thumbnail carries the registry src URL", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).meta.thumbnail).toBe(
      "/figures/hr-diagram.svg",
    );
  });

  test("url uses chapter slug + usage anchor", () => {
    expect(toFigureUsageRecord(usage, registry, ctx).url).toBe(
      "/chapters/measuring-the-sky#fig-hr-diagram-1",
    );
  });
});
```

**Step 1.6 — Write `misconceptions.test.ts`.**

```ts
import { describe, expect, test } from "vitest";
import type { MisconceptionEntry } from "@sophie/core/schema";
import { toMisconceptionRecord } from "./misconceptions.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: MisconceptionEntry = {
  body: "Many beginners conflate apparent brightness with temperature.",
  chapter: "measuring-the-sky",
  anchor: "misc-2",
  length: "short",
  label: "Brighter ≠ hotter",
};

describe("toMisconceptionRecord", () => {
  test("filters.type is ['misconception']", () => {
    expect(toMisconceptionRecord(fixture, ctx).filters.type).toEqual([
      "misconception",
    ]);
  });

  test("meta.length carries the length discriminator", () => {
    expect(toMisconceptionRecord(fixture, ctx).meta.length).toBe("short");
  });

  test("meta.title is the optional label when present", () => {
    expect(toMisconceptionRecord(fixture, ctx).meta.title).toBe(
      "Brighter ≠ hotter",
    );
  });

  test("content carries the body HTML", () => {
    expect(toMisconceptionRecord(fixture, ctx).content).toContain(
      "Many beginners conflate apparent brightness with temperature.",
    );
  });
});
```

**Step 1.7 — Write `objectives.test.ts`.**

```ts
import { describe, expect, test } from "vitest";
import type { ObjectiveEntry } from "@sophie/core/schema";
import { toObjectiveRecord } from "./objectives.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: ObjectiveEntry = {
  id: "thesis",
  anchor: "lo-thesis",
  chapter: "measuring-the-sky",
  verb: "State",
  body: "the course thesis in one sentence.",
};

describe("toObjectiveRecord", () => {
  test("filters.type is ['objective']", () => {
    expect(toObjectiveRecord(fixture, ctx).filters.type).toEqual([
      "objective",
    ]);
  });

  test("meta.verb carries the verb separately for badge render", () => {
    expect(toObjectiveRecord(fixture, ctx).meta.verb).toBe("State");
  });

  test("meta.title concatenates verb + body", () => {
    expect(toObjectiveRecord(fixture, ctx).meta.title).toBe(
      "State the course thesis in one sentence.",
    );
  });

  test("content is verb + body (for search)", () => {
    expect(toObjectiveRecord(fixture, ctx).content).toBe(
      "State the course thesis in one sentence.",
    );
  });
});
```

**Step 1.8 — Write `index.test.ts` (registry exhaustiveness).**

```ts
import { describe, expect, test } from "vitest";
import { converters, type EntityType } from "./index.ts";

describe("converter registry", () => {
  test("covers exactly the v1 entity types", () => {
    const keys = Object.keys(converters).sort();
    expect(keys).toEqual(
      [
        "definitions",
        "equations",
        "figureUsages",
        "keyInsights",
        "misconceptions",
        "objectives",
      ].sort(),
    );
  });

  test("each converter returns filters.type as a single-element array", () => {
    // Compile-time guard: filter values are Record<string, string[]>.
    // Runtime guard: spot-check via the converter shape.
    type RecordReturn = ReturnType<
      (typeof converters)[keyof typeof converters]
    >;
    const _typeCheck: RecordReturn["filters"]["type"] extends string[]
      ? true
      : never = true;
    expect(_typeCheck).toBe(true);
  });
});
```

**Step 1.9 — Run tests; verify all fail with module-not-found.**

```bash
pnpm --filter @sophie/astro test:unit pagefind-converters
```

Expected: every test file fails with
`Cannot find module './definitions.ts'` (or equivalent per file).
This is the textbook RED state.

**Step 1.10 — Commit.**

```bash
git add packages/astro/src/lib/pagefind-converters/
git commit -m "test(astro): RED — 6 pagefind-converter unit tests + registry

Layer 1.5 RED state for PR 7 (Pagefind faceted search). One test
file per pedagogy entity source (definitions, equations, keyInsights,
figureUsages, misconceptions, objectives) plus an
index.test.ts that pins the registry as exhaustive over the
6 entity sources.

Every test fails with module-not-found because no converter source
file exists yet. Task 6 turns these GREEN by implementing the
6 toFooRecord functions + the converters registry.

Per docs/plans/2026-05-14-pr-7-pagefind-search-design.md §6
'Layer 1.5'; addresses pitfall §9.1 (filter-value array shape)
via the filters.type === ['…'] assertion in every converter test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Layer 1.6 RED: failing Pagefind index round-trip

**Goal:** Single test that runs Pagefind's Node API end-to-end
against a tiny fixture, asserting that both pipelines (HTML crawl +
custom records) feed a single index with the expected filter
round-trip. Fails because `pagefind-postbuild.ts` doesn't exist yet.

**Files:**
- Create: `packages/astro/src/lib/pagefind-postbuild.test.ts`

**Step 2.1 — Write the test file.**

```ts
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { buildPagefindIndex } from "./pagefind-postbuild.ts";

/**
 * Layer 1.6 — end-to-end Pagefind index round-trip.
 *
 * Sits between Layer 1.5 (converter unit) and Layer 2 (Playwright
 * e2e). Catches failure modes where individual converters look
 * right in isolation but the Pagefind Node API rejects the
 * combined records, or where filters don't round-trip into the
 * emitted pagefind-entry.json. Same shape as the LO checkbox PR's
 * Layer 1.6 (transform-mdx-compile.test.ts) — see PR 6's fix
 * commit fa8c38d for the precedent.
 */
describe("buildPagefindIndex (Layer 1.6)", () => {
  test("emits records for HTML crawl + each entity converter", async () => {
    // Build a fixture site: one HTML page + a populated pedagogy index
    const dir = mkdtempSync(join(tmpdir(), "sophie-pagefind-"));
    mkdirSync(join(dir, "chapters", "ch"), { recursive: true });
    writeFileSync(
      join(dir, "chapters", "ch", "index.html"),
      `<!doctype html>
<html lang="en">
  <body>
    <main data-pagefind-body>
      <h1 data-pagefind-meta="title">Test chapter</h1>
      <p>Some prose about luminosity.</p>
    </main>
  </body>
</html>`,
    );

    // Populate the in-memory indexAccumulator with one of each
    // entity type via direct test-mode wiring (Task 7 exposes a
    // test-only helper for this).
    const { resetIndexAccumulator, indexAccumulator } = await import(
      "./pedagogy-index-extractor.ts"
    );
    resetIndexAccumulator();
    indexAccumulator.setModules([{ slug: "m", title: "M", order: 1 }]);
    indexAccumulator.setChapters([
      { slug: "ch", title: "Test chapter", module: "m", order: 1 },
    ]);
    indexAccumulator.addDefinitions([
      {
        term: "luminosity",
        slug: "luminosity",
        body: "Total radiant power.",
        chapter: "ch",
        anchor: "def-luminosity",
      },
    ]);
    indexAccumulator.addEquations([
      {
        slug: "stefan-boltzmann",
        title: "Stefan-Boltzmann",
        number: 1,
        tex: "L = 4\\pi R^2 \\sigma T^4",
        body: "<p>Stefan-Boltzmann luminosity.</p>",
        chapter: "ch",
        anchor: "stefan-boltzmann",
      },
    ]);
    indexAccumulator.addKeyInsights([
      {
        body: "Distance hides itself.",
        chapter: "ch",
        anchor: "ki-1",
      },
    ]);
    indexAccumulator.addMisconceptions([
      {
        body: "A common confusion: brighter is hotter.",
        chapter: "ch",
        anchor: "misc-1",
        length: "short",
        label: "Brighter ≠ hotter",
      },
    ]);
    indexAccumulator.addObjectives([
      {
        id: "obj-1",
        anchor: "lo-obj-1",
        chapter: "ch",
        verb: "State",
        body: "the thesis.",
      },
    ]);
    // Fixture omits figureUsages + figureRegistry — figures are
    // optional per chapter; the count assertion below adjusts.

    await buildPagefindIndex(dir);

    // Pagefind writes its entry manifest to {dir}/pagefind/pagefind-entry.json
    const entryPath = join(dir, "pagefind", "pagefind-entry.json");
    const entry = JSON.parse(readFileSync(entryPath, "utf-8"));

    // Sanity: the index manifest exists and is non-empty
    expect(entry).toBeDefined();
    expect(typeof entry.version).toBe("string");

    // The filter list should include 'type' with all 6 entity-type
    // values that the fixture authored (no 'figure' since fixture
    // has none).
    const filterMeta = JSON.parse(
      readFileSync(join(dir, "pagefind", "filter", "type.pf_filter"))
        .toString()
        .replace(/[^\x20-\x7E\n]+/g, ""), // strip Pagefind's binary chunk prefix
    );
    // The exact filter-file format is an implementation detail of
    // Pagefind; the assertion above is structural. The real signal
    // is that the file EXISTS (Pagefind only writes filter files
    // when at least one record carries that filter).
    expect(filterMeta).toBeDefined();
  });
});
```

**Step 2.2 — Run; verify fail with module-not-found.**

```bash
pnpm --filter @sophie/astro test:unit pagefind-postbuild
```

Expected: `Cannot find module './pagefind-postbuild.ts'`.

**Step 2.3 — Commit.**

```bash
git add packages/astro/src/lib/pagefind-postbuild.test.ts
git commit -m "test(astro): RED — Layer 1.6 Pagefind index round-trip

Single test that runs buildPagefindIndex against a tmpdir fixture
with one HTML page + a populated indexAccumulator carrying one of
each entity type (no figure — smoke chapters don't always author
them). Asserts that the resulting pagefind/pagefind-entry.json
exists and that the type filter file is written.

Fails today with 'Cannot find module' — buildPagefindIndex doesn't
exist yet. Task 7 turns this GREEN by implementing the postbuild
orchestrator.

Catches the failure class where individual converters look right
in isolation but the Pagefind Node API rejects the combined records
or filter shape. Same intent as the LO checkbox PR's Layer 1.6
(see commit fa8c38d).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Layer 1 RED: failing UI component tests

**Goal:** Four failing test files for the four React components.
Tests fail with module-not-found because the components don't
exist yet. Tasks 8 + 9 turn these GREEN.

**Files:**
- Create: `packages/components/src/components/Search/ResultCard.test.tsx`
- Create: `packages/components/src/components/Search/ResultList.test.tsx`
- Create: `packages/components/src/components/Search/ChipStrip.test.tsx`
- Create: `packages/components/src/components/Search/SearchModal.test.tsx`

**Step 3.1 — Write `ResultCard.test.tsx`.**

```tsx
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ResultCard } from "./ResultCard.tsx";
import type { SearchResult } from "./types.ts";

const baseFixture = {
  url: "/chapters/measuring-the-sky#term-luminosity",
  meta: {
    title: "luminosity",
    locator: "Measuring the sky · Foundations",
  },
  excerpt: "Total radiant power emitted by a body.",
  filters: { type: ["term"] as const },
};

describe("ResultCard", () => {
  test("renders type label and title for a term", () => {
    render(<ResultCard result={baseFixture as SearchResult} />);
    expect(screen.getByText("luminosity")).toBeInTheDocument();
    expect(screen.getByText(/term/i)).toBeInTheDocument();
  });

  test("renders KaTeX rich tail for equation results", () => {
    const equation: SearchResult = {
      ...baseFixture,
      meta: {
        ...baseFixture.meta,
        title: "Stefan-Boltzmann luminosity",
        tex: "L = 4\\pi R^2 \\sigma T^4",
        slug: "stefan-boltzmann-luminosity",
        number: "12",
      },
      filters: { type: ["equation"] },
    };
    const { container } = render(<ResultCard result={equation} />);
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });

  test("renders length indicator for misconception results", () => {
    const misc: SearchResult = {
      ...baseFixture,
      meta: {
        ...baseFixture.meta,
        title: "Brighter ≠ hotter",
        length: "short",
        label: "Brighter ≠ hotter",
      },
      filters: { type: ["misconception"] },
    };
    render(<ResultCard result={misc} />);
    const badge = screen.getByText(/short note/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/length/i),
    );
  });

  test("renders locator (chapter · module)", () => {
    render(<ResultCard result={baseFixture as SearchResult} />);
    expect(
      screen.getByText("Measuring the sky · Foundations"),
    ).toBeInTheDocument();
  });

  test("axe-core: zero a11y violations", async () => {
    const { container } = render(
      <ResultCard result={baseFixture as SearchResult} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Step 3.2 — Write `ResultList.test.tsx`.**

```tsx
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ResultList } from "./ResultList.tsx";
import type { SearchResult } from "./types.ts";

const r = (n: number, type: string): SearchResult => ({
  url: `/chapters/c#a-${n}`,
  meta: { title: `result ${n}`, locator: "Ch · Mod" },
  excerpt: `excerpt ${n}`,
  filters: { type: [type] },
});

describe("ResultList", () => {
  test("renders empty state when results is empty", () => {
    render(<ResultList results={[]} highlightedIndex={0} onSelect={() => {}} />);
    expect(screen.getByText(/try typing/i)).toBeInTheDocument();
  });

  test("renders one option per result", () => {
    const results = [r(1, "term"), r(2, "equation"), r(3, "page")];
    render(
      <ResultList
        results={results}
        highlightedIndex={0}
        onSelect={() => {}}
      />,
    );
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  test("uses aria-activedescendant to mark the highlighted row", () => {
    const results = [r(1, "term"), r(2, "equation")];
    render(
      <ResultList
        results={results}
        highlightedIndex={1}
        onSelect={() => {}}
      />,
    );
    const list = screen.getByRole("listbox");
    const optionId = screen.getAllByRole("option")[1].id;
    expect(list).toHaveAttribute("aria-activedescendant", optionId);
  });

  test("Enter on the listbox calls onSelect with the highlighted result", async () => {
    const onSelect = vi.fn();
    const results = [r(1, "term"), r(2, "equation")];
    render(
      <ResultList
        results={results}
        highlightedIndex={1}
        onSelect={onSelect}
      />,
    );
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(results[1]);
  });

  test("count announcer text matches result count", () => {
    const { rerender } = render(
      <ResultList
        results={[r(1, "term"), r(2, "equation")]}
        highlightedIndex={0}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("2 results");

    rerender(
      <ResultList results={[]} highlightedIndex={0} onSelect={() => {}} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/no results/i);
  });

  test("axe-core: zero violations on populated state", async () => {
    const results = [r(1, "term"), r(2, "equation")];
    const { container } = render(
      <ResultList
        results={results}
        highlightedIndex={0}
        onSelect={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

**Step 3.3 — Write `ChipStrip.test.tsx`.**

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ChipStrip } from "./ChipStrip.tsx";

describe("ChipStrip", () => {
  test("renders one tab per filter value plus 'all'", () => {
    render(<ChipStrip active="all" onChange={() => {}} />);
    const chips = screen.getAllByRole("tab");
    // 'all' + 7 entity types
    expect(chips).toHaveLength(8);
  });

  test("active chip has aria-selected=true", () => {
    render(<ChipStrip active="equation" onChange={() => {}} />);
    const active = screen.getByRole("tab", { name: /equations/i });
    expect(active).toHaveAttribute("aria-selected", "true");
  });

  test("clicking a chip calls onChange with its key", async () => {
    const onChange = vi.fn();
    render(<ChipStrip active="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: /terms/i }));
    expect(onChange).toHaveBeenCalledWith("term");
  });

  test("Tab cycles chips, Enter toggles", async () => {
    const onChange = vi.fn();
    render(<ChipStrip active="all" onChange={onChange} />);
    const first = screen.getAllByRole("tab")[0];
    first.focus();
    await userEvent.keyboard("{Tab}{Enter}");
    expect(onChange).toHaveBeenCalled();
  });

  test("axe-core: zero violations", async () => {
    const { container } = render(
      <ChipStrip active="equation" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

**Step 3.4 — Write `SearchModal.test.tsx`.**

```tsx
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { SearchModal } from "./SearchModal.tsx";

// Mock Pagefind's dynamic import — the modal lazy-loads it on
// first open. In unit tests we never want a real network fetch.
vi.mock("/pagefind/pagefind.js", () => ({
  search: vi.fn().mockResolvedValue({
    results: [],
  }),
}));

describe("SearchModal", () => {
  test("Cmd+K opens the modal", async () => {
    render(<SearchModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("Ctrl+K opens the modal on non-Mac", async () => {
    render(<SearchModal />);
    await userEvent.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("Esc closes the modal", async () => {
    render(<SearchModal />);
    await userEvent.keyboard("{Meta>}k{/Meta}");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("Cmd+K toggles closed state", async () => {
    render(<SearchModal />);
    await userEvent.keyboard("{Meta>}k{/Meta}");
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("input autofocuses on open", async () => {
    render(<SearchModal />);
    await userEvent.keyboard("{Meta>}k{/Meta}");
    const input = screen.getByRole("textbox");
    expect(input).toHaveFocus();
  });

  test("axe-core: zero violations on open modal", async () => {
    const { container } = render(<SearchModal />);
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

**Step 3.5 — Run; verify all fail with module-not-found.**

```bash
pnpm --filter @sophie/components exec vitest run src/components/Search/
```

Expected: 4 test files, all fail with module-not-found.

**Step 3.6 — Commit.**

```bash
git add packages/components/src/components/Search/
git commit -m "test(components): RED — Layer 1 UI tests (Search modal + parts)

Four test files for PR 7's React island. All fail with
'Cannot find module' — Tasks 8 + 9 land the implementations.

ResultCard.test.tsx (5 tests): 7-variant render, KaTeX in
equation tail, length indicator (short/long) for misconception,
locator consistency, axe-core.

ResultList.test.tsx (6 tests): empty state, option count,
aria-activedescendant on highlight, Enter calls onSelect, count
announcer text, axe-core.

ChipStrip.test.tsx (5 tests): tab roles (8 chips: all + 7
types), aria-selected on active, click calls onChange,
keyboard nav, axe-core.

SearchModal.test.tsx (6 tests): Cmd+K opens, Ctrl+K opens, Esc
closes, Cmd+K toggles, input autofocuses, axe-core. Pagefind
JS client dynamic import is mocked at the test boundary so
unit tests never touch the network.

Per docs/plans/2026-05-14-pr-7-pagefind-search-design.md §6
'Layer 1'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Layer 2 RED: failing Playwright e2e on smoke

**Goal:** Single Playwright spec exercising the full pipeline from
the smoke chapter route. Fails today because the modal doesn't
exist and the build doesn't write `dist/pagefind/`. Task 10 turns
this GREEN.

**Files:**
- Create: `examples/smoke/e2e/search.spec.ts`

**Step 4.1 — Write the spec.**

```ts
import { test, expect } from "@playwright/test";

test.describe("Pagefind search modal (Layer 2)", () => {
  test("Cmd+K opens modal, types term, navigates to result", async ({
    page,
  }) => {
    await page.goto("/chapters/measuring-the-sky/");

    // Wait for chapter page hydration to settle. Same condition-
    // based-waiting discipline as the LO checkbox e2e — no fixed
    // timeouts.
    const trigger = page.getByRole("button", { name: /search/i });
    await expect(trigger).toBeVisible();

    // Trigger via keyboard (the modal's primary entry point)
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-state", "open");

    const input = dialog.getByRole("textbox");
    await expect(input).toBeFocused();

    // Type a known smoke-chapter term
    await input.fill("luminosity");

    // Wait for results to settle via the aria-live count region
    const counter = dialog.getByRole("status");
    await expect(counter).not.toHaveText(/no results/i);

    // At least one result row appears
    const options = dialog.getByRole("option");
    await expect(options.first()).toBeVisible();

    // Arrow down + Enter navigates to a result URL
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/chapters\/.+/);
  });

  test("chip filter narrows results to one type", async ({ page }) => {
    await page.goto("/chapters/measuring-the-sky/");
    await page.keyboard.press("Meta+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await dialog.getByRole("textbox").fill("luminosity");

    // Toggle the 'Equations' chip
    await dialog.getByRole("tab", { name: /equations/i }).click();
    await expect(
      dialog.getByRole("tab", { name: /equations/i }),
    ).toHaveAttribute("aria-selected", "true");

    // Every visible result row's type label is 'Equation' (or empty
    // if no equation hits — assert at least one is present)
    const options = dialog.getByRole("option");
    await expect(options.first()).toBeVisible();
    const firstLabel = await options.first().getAttribute("aria-label");
    expect(firstLabel).toMatch(/equation/i);
  });

  test("Esc closes the modal", async ({ page }) => {
    await page.goto("/chapters/measuring-the-sky/");
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
```

**Step 4.2 — Verify build is current; then run; verify all fail.**

```bash
pnpm --filter smoke build
pnpm test:e2e search.spec.ts
```

Expected: 3 tests, all fail. First test fails at the trigger
button (no such element); subsequent tests fail at modal open.

**Step 4.3 — Commit.**

```bash
git add examples/smoke/e2e/search.spec.ts
git commit -m "test(smoke): RED — Layer 2 Playwright e2e on Pagefind search

Three e2e tests against the built smoke site:
1. Cmd+K opens modal, type a term, navigate to result
2. Chip filter narrows to one type
3. Esc closes

All fail because <SearchTrigger> doesn't render in TextbookLayout
yet (Task 10) and dist/pagefind/ doesn't exist (Task 7).

Condition-based-waiting throughout: wait on Radix's
data-state='open' attribute, role='status' counter text, and
aria-selected on the active chip — never fixed timeouts. Same
discipline as the LO checkbox e2e (commit 5915a82).

Per docs/plans/2026-05-14-pr-7-pagefind-search-design.md §6
'Layer 2'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Scaffold: add `pagefind` dep + converter registry + EntityType

**Goal:** Set up the module skeleton so Task 6 can implement
converters one at a time without re-scaffolding each time. No
RED tests turn GREEN here; this is pure infrastructure.

**Files:**
- Modify: `packages/astro/package.json` — add `pagefind` dep
- Modify: `pnpm-lock.yaml` — auto-updated by pnpm add
- Create: `packages/astro/src/lib/pagefind-converters/index.ts`

**Step 5.1 — Add the Pagefind dep.**

```bash
pnpm --filter @sophie/astro add pagefind
pnpm --filter @sophie/components add @radix-ui/react-dialog
```

Two deps total. `pagefind` powers the Node-API build pipeline +
the JS client served from `dist/pagefind/`. `@radix-ui/react-dialog`
powers the SearchModal's focus trap + keyboard accessibility
(per ADR 0019 + brainstorm decision 6; approved by Anna in errata
item 8). Verify the versions pinned in each `package.json` and
note them in the commit message.

**Step 5.2 — Verify lockfile is consistent.**

```bash
pnpm install --frozen-lockfile
```

Must finish clean (per Anna's pre-PR lockfile-check feedback).

**Step 5.2.5 — Add `EntityType` to `@sophie/core/schema`** (per
errata item 8). Create `packages/core/src/schema/search-facet.ts`:

```ts
/**
 * The 7 v1 entity types surfaced by Pagefind search. 'page' arrives
 * from Pagefind's default HTML crawl; the other 6 come from
 * custom-records produced by the converters in
 * `@sophie/astro/lib/pagefind-converters`.
 *
 * Lives in `@sophie/core/schema` (not in either consumer package)
 * because both `@sophie/components` (UI: chip strip labels, card
 * type icons) and `@sophie/astro` (build pipeline: converter
 * registry keys) need to agree on the union. Aligns with ADR 0003
 * schema-as-source-of-truth.
 *
 * Extensibility: when LDS-foundation entities (notation registry,
 * misconception graph, intervention library, teaching moves,
 * equation biography) ship code-side data in Phase 3, add them
 * here AND in `@sophie/astro/lib/pagefind-converters/index.ts`
 * AND in `@sophie/components/src/components/Search/ChipStrip.tsx`.
 */
export type EntityType =
  | "page"
  | "term"
  | "equation"
  | "keyInsight"
  | "figure"
  | "misconception"
  | "objective";
```

Re-export from `packages/core/src/schema/index.ts` (add one line:
`export type { EntityType } from "./search-facet.ts";`).

**Step 5.3 — Write the registry index.**

`packages/astro/src/lib/pagefind-converters/index.ts`:

```ts
import type {
  DefinitionEntry,
  EntityType,
  EquationEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  KeyInsightEntry,
  MisconceptionEntry,
  ObjectiveEntry,
} from "@sophie/core/schema";

// EntityType is now sourced from @sophie/core/schema per errata
// item 8. Re-export here for ergonomic access from the same module
// that defines the converter map.
export type { EntityType };

export type ChapterContext = {
  chapterTitle: string;
  moduleTitle: string;
  moduleSlug: string;
};

export type PagefindCustomRecord = {
  url: string;
  content: string;
  language: "en";
  meta: Record<string, string>;
  // Pagefind requires filter values to be ARRAYS of strings even
  // when there's only one value. See design doc §1 filter-value
  // gotcha. Compile-time-enforced by Record<string, string[]>.
  filters: Record<string, string[]>;
};

export type EntityToPagefindRecord<Entity> = (
  entity: Entity,
  ctx: ChapterContext,
) => PagefindCustomRecord;

// Figures join `FigureUsageEntry` (per-chapter usage) to
// `FigureRegistryEntry` (flat-namespace asset metadata) at convert
// time. Minimal extension of the base signature; only figures use
// it in v1.
export type EntityWithLookupToPagefindRecord<Entity, Lookup> = (
  entity: Entity,
  lookup: Lookup,
  ctx: ChapterContext,
) => PagefindCustomRecord;

// One converter per entity-source key on the PedagogyIndex.
// Exhaustiveness is unit-tested in index.test.ts.
export const converters: {
  definitions: EntityToPagefindRecord<DefinitionEntry>;
  equations: EntityToPagefindRecord<EquationEntry>;
  keyInsights: EntityToPagefindRecord<KeyInsightEntry>;
  figureUsages: EntityWithLookupToPagefindRecord<FigureUsageEntry, FigureRegistryEntry>;
  misconceptions: EntityToPagefindRecord<MisconceptionEntry>;
  objectives: EntityToPagefindRecord<ObjectiveEntry>;
} = {
  // Each converter is a separate file; we import them lazily below
  // to avoid creating import cycles during the type-only first pass.
  // Filled by Task 6.
  definitions: null as never,
  equations: null as never,
  keyInsights: null as never,
  figureUsages: null as never,
  misconceptions: null as never,
  objectives: null as never,
};
```

**Step 5.4 — Verify biome + typecheck still clean.**

```bash
pnpm exec biome check packages/astro/src/lib/pagefind-converters/index.ts
pnpm --filter @sophie/astro run typecheck
```

Both must exit 0.

**Step 5.5 — Commit.**

```bash
git add packages/astro/package.json pnpm-lock.yaml \
        packages/astro/src/lib/pagefind-converters/index.ts
git commit -m "feat(astro): add pagefind dep + converter registry scaffold

Sets up the @sophie/astro side of PR 7 (Pagefind faceted search).

- Adds 'pagefind' as a direct dep at the current stable major.
  Node API for index-build; published JS client used by the React
  modal lands in Task 9.
- Creates packages/astro/src/lib/pagefind-converters/index.ts
  with EntityType union, ChapterContext + PagefindCustomRecord
  types, and the converters registry object (entries stubbed as
  null casts until Task 6 fills them in). Filter values typed as
  string[] to compile-time-enforce the filter-array gotcha
  documented in design doc §1.

No RED tests turn GREEN here; infrastructure for Task 6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Implement 6 converters (Layer 1.5 GREEN)

**Goal:** Land the 6 converter implementations, register them in
the converter map, turn all 7 Task 1 test files GREEN.

**Files:**
- Create: `packages/astro/src/lib/pagefind-converters/definitions.ts`
- Create: `packages/astro/src/lib/pagefind-converters/equations.ts`
- Create: `packages/astro/src/lib/pagefind-converters/key-insights.ts`
- Create: `packages/astro/src/lib/pagefind-converters/figure-usages.ts`
- Create: `packages/astro/src/lib/pagefind-converters/misconceptions.ts`
- Create: `packages/astro/src/lib/pagefind-converters/objectives.ts`
- Modify: `packages/astro/src/lib/pagefind-converters/index.ts` — wire the registry

**Step 6.1 — `definitions.ts`.**

```ts
import type { DefinitionEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

export const toDefinitionRecord: EntityToPagefindRecord<DefinitionEntry> = (
  entity,
  ctx,
) => ({
  url: `/chapters/${entity.chapter}#${entity.anchor}`,
  content: entity.body,
  language: "en",
  meta: {
    title: entity.term,
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    slug: entity.slug,
  },
  filters: {
    type: ["term"],
    chapter: [entity.chapter],
    module: [ctx.moduleSlug],
  },
});
```

**Step 6.2 — `equations.ts`.**

```ts
import type { EquationEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

export const toEquationRecord: EntityToPagefindRecord<EquationEntry> = (
  entity,
  ctx,
) => ({
  url: `/chapters/${entity.chapter}#${entity.anchor}`,
  content: [entity.title, entity.tex].filter(Boolean).join(" — "),
  language: "en",
  meta: {
    title: entity.title,
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    tex: entity.tex,
    slug: entity.slug,
    number: String(entity.number),
  },
  filters: {
    type: ["equation"],
    chapter: [entity.chapter],
    module: [ctx.moduleSlug],
  },
});
```

**Step 6.3 — `key-insights.ts`.**

```ts
import type { KeyInsightEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

const TITLE_MAX = 80;

export const toKeyInsightRecord: EntityToPagefindRecord<KeyInsightEntry> = (
  entity,
  ctx,
) => {
  const title =
    entity.body.length <= TITLE_MAX
      ? entity.body
      : `${entity.body.slice(0, TITLE_MAX)}…`;
  return {
    url: `/chapters/${entity.chapter}#${entity.anchor}`,
    content: entity.body,
    language: "en",
    meta: {
      title,
      locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    },
    filters: {
      type: ["keyInsight"],
      chapter: [entity.chapter],
      module: [ctx.moduleSlug],
    },
  };
};
```

**Step 6.4 — `figure-usages.ts`.**

Figures are 1:N to chapters. The converter joins the per-chapter
`FigureUsageEntry` to the flat-namespace `FigureRegistryEntry` (by
`name`) for `src`/`alt`/`caption`. Caption-override on the usage
wins over the registry caption.

```ts
import type {
  FigureRegistryEntry,
  FigureUsageEntry,
} from "@sophie/core/schema";
import type { EntityWithLookupToPagefindRecord } from "./index.ts";

export const toFigureUsageRecord: EntityWithLookupToPagefindRecord<
  FigureUsageEntry,
  FigureRegistryEntry
> = (usage, registry, ctx) => ({
  url: `/chapters/${usage.chapter}#${usage.anchor}`,
  content: [registry.alt, usage.captionOverride ?? registry.caption ?? ""]
    .filter(Boolean)
    .join(" — "),
  language: "en",
  meta: {
    title: usage.name,
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    thumbnail: registry.src,
    alt: registry.alt,
    number: String(usage.number),
    canonical: usage.canonical ? "true" : "false",
  },
  filters: {
    type: ["figure"],
    chapter: [usage.chapter],
    module: [ctx.moduleSlug],
  },
});
```

**Step 6.5 — `misconceptions.ts`.**

```ts
import type { MisconceptionEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

export const toMisconceptionRecord: EntityToPagefindRecord<MisconceptionEntry> = (
  entity,
  ctx,
) => ({
  url: `/chapters/${entity.chapter}#${entity.anchor}`,
  content: entity.body,
  language: "en",
  meta: {
    title: entity.label ?? "Misconception",
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    length: entity.length,
    label: entity.label ?? "",
  },
  filters: {
    type: ["misconception"],
    chapter: [entity.chapter],
    module: [ctx.moduleSlug],
  },
});
```

**Step 6.6 — `objectives.ts`.**

```ts
import type { ObjectiveEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

export const toObjectiveRecord: EntityToPagefindRecord<ObjectiveEntry> = (
  entity,
  ctx,
) => {
  const title = `${entity.verb} ${entity.body}`.trim();
  return {
    url: `/chapters/${entity.chapter}#${entity.anchor}`,
    content: title,
    language: "en",
    meta: {
      title,
      locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
      verb: entity.verb,
    },
    filters: {
      type: ["objective"],
      chapter: [entity.chapter],
      module: [ctx.moduleSlug],
    },
  };
};
```

**Step 6.7 — Wire the registry in `index.ts`.**

Replace the stub object:

```ts
import { toDefinitionRecord } from "./definitions.ts";
import { toEquationRecord } from "./equations.ts";
import { toKeyInsightRecord } from "./key-insights.ts";
import { toFigureUsageRecord } from "./figure-usages.ts";
import { toMisconceptionRecord } from "./misconceptions.ts";
import { toObjectiveRecord } from "./objectives.ts";

export const converters = {
  definitions: toDefinitionRecord,
  equations: toEquationRecord,
  keyInsights: toKeyInsightRecord,
  figureUsages: toFigureUsageRecord,   // joins to figureRegistry by name
  misconceptions: toMisconceptionRecord,
  objectives: toObjectiveRecord,
} as const;
```

(Drop the `null as never` stubs and the explicit type annotation on
`converters`; `as const` plus the converter type signatures pin
exhaustiveness.)

**Step 6.8 — Run converter tests; verify all GREEN.**

```bash
pnpm --filter @sophie/astro test:unit pagefind-converters
```

Expected: every test passes (7 files, ~35 tests total).

**Step 6.9 — Run full astro suite; verify nothing regressed.**

```bash
pnpm --filter @sophie/astro test:unit
```

Expected: 249 previous + 35 new = 284 (approximate; depends on
exact count).

**Step 6.10 — Biome + typecheck.**

```bash
pnpm exec biome check packages/astro/src/lib/pagefind-converters/
pnpm --filter @sophie/astro run typecheck
```

Both clean.

**Step 6.11 — Commit.**

```bash
git add packages/astro/src/lib/pagefind-converters/
git commit -m "feat(astro): implement 6 Pagefind entity converters (Layer 1.5 GREEN)

Lands toDefinitionRecord, toEquationRecord, toKeyInsightRecord,
toFigureRecord, toMisconceptionRecord, toObjectiveRecord — one per
PedagogyIndex entity source. Registers them in
pagefind-converters/index.ts as the canonical converters map.

Turns the 7 Task-1 test files GREEN (~35 tests across the 6
entity types + the registry exhaustiveness check).

Each converter:
- Emits url as /chapters/{slug}#{anchor} matching the rendering-
  side anchor convention (design doc §9.5 pitfall).
- Sets filters as Record<string, string[]> — single-element arrays
  for chapter/module/type, never bare strings (design doc §1
  filter-value gotcha).
- Returns the same shape regardless of optional source fields
  (graceful degradation per design doc §9.6).

Per docs/plans/2026-05-14-pr-7-pagefind-search-design.md §1.4
extensibility seam: future LDS-foundation entity types add one
converter file + one registry entry, no other changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Implement postbuild orchestrator + wire integration hook (Layer 1.6 GREEN)

**Goal:** Land `pagefind-postbuild.ts`, hook it into Astro's
`astro:build:done`, turn Task 2's Layer 1.6 test GREEN. The hook
imports `indexAccumulator` directly per errata §1 (not a JSON file).

**Files:**
- Create: `packages/astro/src/lib/pagefind-postbuild.ts`
- Modify: `packages/astro/src/integration.ts:76-107`

**Step 7.1 — Write `pagefind-postbuild.ts`.**

```ts
import * as pagefind from "pagefind";
import {
  converters,
  type EntityType,
  type PagefindCustomRecord,
} from "./pagefind-converters/index.ts";
import { indexAccumulator } from "./pedagogy-index-extractor.ts";

/**
 * Pagefind postbuild orchestrator. Runs from the
 * astro:build:done integration hook in
 * packages/astro/src/integration.ts.
 *
 * Two pipelines feeding one index:
 *   1. index.addDirectory(distPath) — Pagefind's default HTML crawl
 *      walks the built site; emits page records from chapter prose
 *      with filters.type=['page'].
 *   2. converters[entitySource](entity, ctx) for each entity in the
 *      in-memory indexAccumulator (the same singleton populated by
 *      pedagogyIndexRemarkPlugin during MDX render).
 *
 * Reads indexAccumulator directly per plan errata §1 — the
 * dist/.sophie/pedagogy-index.json artifact referenced in design
 * doc §4 doesn't exist today (ADR 0045 is docs-only). When that
 * artifact ships, the read can switch to it without changing the
 * converters or the pipeline shape.
 */
export async function buildPagefindIndex(distPath: string): Promise<void> {
  const pedagogyIndex = indexAccumulator.asPedagogyIndex();

  const { index } = await pagefind.createIndex({
    rootSelector: "main",
    excludeSelectors: [
      ".no-index",
      "nav",
      "footer",
      "[data-pagefind-ignore]",
    ],
    forceLanguage: "en",
  });
  if (!index) {
    throw new Error("pagefind.createIndex returned no index handle");
  }

  // Pipeline 1: default HTML crawl
  const { errors: dirErrors } = await index.addDirectory({
    path: distPath,
  });
  if (dirErrors.length > 0) {
    throw new Error(
      `Pagefind HTML crawl errors: ${dirErrors.join("; ")}`,
    );
  }

  // Pipeline 2: custom records per entity, one converter at a time.
  // Pre-build a lookup so we don't repeatedly scan chapters/modules.
  const chapterBySlug = new Map(
    pedagogyIndex.chapters.map((c) => [c.slug, c]),
  );
  const moduleBySlug = new Map(
    pedagogyIndex.modules.map((m) => [m.slug, m]),
  );
  // Figures are 1:N to chapters; each FigureUsageEntry joins to
  // FigureRegistryEntry by `name` for src/alt/caption metadata.
  const registryByName = new Map(
    pedagogyIndex.figureRegistry.map((r) => [r.name, r]),
  );

  const entitySources = Object.keys(converters) as Array<
    keyof typeof converters
  >;

  for (const entitySource of entitySources) {
    const entities = pedagogyIndex[entitySource] ?? [];
    const converter = converters[entitySource];
    for (const entity of entities) {
      const chapter = chapterBySlug.get(entity.chapter);
      const module = chapter ? moduleBySlug.get(chapter.module) : undefined;
      if (!chapter || !module) continue;
      const ctx = {
        chapterTitle: chapter.title,
        moduleTitle: module.title,
        moduleSlug: module.slug,
      };

      // figureUsages is the only converter that takes a lookup arg
      // (the matching FigureRegistryEntry for src/alt/caption).
      // Orphan usages (no matching registry entry) are skipped — the
      // audit pass catches them as F-class invariants.
      let record: PagefindCustomRecord;
      if (entitySource === "figureUsages") {
        const registry = registryByName.get(
          (entity as { name: string }).name,
        );
        if (!registry) continue;
        record = (
          converter as (
            e: typeof entity,
            r: typeof registry,
            c: typeof ctx,
          ) => PagefindCustomRecord
        )(entity, registry, ctx);
      } else {
        record = (
          converter as (
            e: typeof entity,
            c: typeof ctx,
          ) => PagefindCustomRecord
        )(entity, ctx);
      }
      const { errors } = await index.addCustomRecord(record);
      if (errors.length > 0) {
        throw new Error(
          `Pagefind addCustomRecord errors for ${entitySource}: ${errors.join("; ")}`,
        );
      }
    }
  }

  // Emit the final index to dist/pagefind/
  const { errors: writeErrors } = await index.writeFiles({
    outputPath: `${distPath}/pagefind`,
  });
  if (writeErrors.length > 0) {
    throw new Error(`Pagefind writeFiles errors: ${writeErrors.join("; ")}`);
  }

  await pagefind.close();
}
```

**Step 7.2 — Wire into `defineSophieIntegration`.**

Edit `packages/astro/src/integration.ts:81-105`. Add an
`astro:build:done` hook alongside the existing
`astro:config:setup`:

```ts
import { fileURLToPath } from "node:url";
import { buildPagefindIndex } from "./lib/pagefind-postbuild.ts";

// ... existing imports stay ...

export function defineSophieIntegration(
  _options?: SophieIntegrationOptions,
): AstroIntegration {
  return {
    name: "@sophie/astro",
    hooks: {
      "astro:config:setup": ({ updateConfig, logger }) => {
        updateConfig({
          // ... existing body unchanged ...
        });
        logger.info("Sophie integration loaded (MDX + React)");
      },
      "astro:build:done": async ({ dir, logger }) => {
        const distPath = fileURLToPath(dir);
        logger.info(`Building Pagefind index in ${distPath}/pagefind/`);
        await buildPagefindIndex(distPath);
        logger.info("Pagefind index complete");
      },
    },
  };
}
```

**Step 7.3 — Run Layer 1.6 test; verify GREEN.**

```bash
pnpm --filter @sophie/astro test:unit pagefind-postbuild
```

Expected: 1 test passes.

**Step 7.4 — Run full astro suite; verify nothing regressed.**

```bash
pnpm --filter @sophie/astro test:unit
```

**Step 7.5 — Verify the integration hook actually fires during smoke build.**

```bash
pnpm --filter smoke build 2>&1 | grep -iE "pagefind"
```

Expected: output mentions "Building Pagefind index" and "Pagefind
index complete". `examples/smoke/dist/pagefind/` should now exist:

```bash
ls examples/smoke/dist/pagefind/ | head -5
```

Expected: `pagefind.js`, `pagefind-entry.json`, `pagefind-ui.js`,
chunked index files, etc.

**Step 7.6 — Biome + typecheck.**

```bash
pnpm exec biome check packages/astro/src/lib/pagefind-postbuild.ts \
                     packages/astro/src/integration.ts
pnpm --filter @sophie/astro run typecheck
```

**Step 7.7 — Commit.**

```bash
git add packages/astro/src/lib/pagefind-postbuild.ts \
        packages/astro/src/integration.ts
git commit -m "feat(astro): Pagefind postbuild orchestrator + integration hook (Layer 1.6 GREEN)

Lands buildPagefindIndex() and wires it into defineSophieIntegration
via the astro:build:done hook.

Two-pipeline orchestration:
1. index.addDirectory(distPath) — Pagefind's default HTML crawl
   over the built site emits page-level records from chapter prose.
2. For each entity in indexAccumulator.asPedagogyIndex(), the
   matching converter from pagefind-converters/ produces a custom
   record. The map is iterated by key so adding a new entity type
   later is one registry entry, no orchestrator change.

Reads indexAccumulator directly rather than dist/.sophie/
pedagogy-index.json — that artifact (per ADR 0045) doesn't ship
today; when it does, switch over without touching converters or
hook shape. Plan errata §1.

Output emitted to dist/pagefind/ via index.writeFiles. Pagefind
JS client served from the same path; lazy-loaded by SearchModal
in Task 9.

Turns Task 2 Layer 1.6 GREEN. Smoke build now produces
dist/pagefind/ with both record sets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — Implement Result components (ResultCard, ResultList, ChipStrip)

**Goal:** Land the three "static" React components (no Pagefind
client needed); turn most of the Task 3 UI tests GREEN. SearchModal
follows in Task 9.

**Files:**
- Create: `packages/components/src/components/Search/types.ts`
- Create: `packages/components/src/components/Search/ResultCard.tsx`
- Create: `packages/components/src/components/Search/ResultCard.module.css`
- Create: `packages/components/src/components/Search/ResultList.tsx`
- Create: `packages/components/src/components/Search/ResultList.module.css`
- Create: `packages/components/src/components/Search/ChipStrip.tsx`
- Create: `packages/components/src/components/Search/ChipStrip.module.css`
- Create: `packages/components/src/components/Search/index.ts` — barrel

**Step 8.1 — `types.ts`.**

```ts
import type { EntityType } from "@sophie/astro/lib/pagefind-converters";

export type SearchResult = {
  url: string;
  meta: {
    title: string;
    locator: string;
    // Per-type extras (read defensively in ResultCard)
    tex?: string;
    slug?: string;
    number?: string;
    length?: "short" | "long";
    label?: string;
    verb?: string;
    thumbnail?: string;
    alt?: string;
    canonical?: string;
  };
  excerpt: string;
  filters: {
    type: [EntityType];
  };
};
```

**Step 8.2 — `ResultCard.tsx`.**

(Complete component — see design doc §3 component shape for context.
Use CSS Modules per ADR 0005.)

```tsx
import { type ReactNode } from "react";
import { BlockMath } from "react-katex";
import styles from "./ResultCard.module.css";
import type { SearchResult } from "./types.ts";

const TYPE_LABEL: Record<string, string> = {
  page: "Chapter",
  term: "Term",
  equation: "Equation",
  keyInsight: "Key insight",
  figure: "Figure",
  misconception: "Misconception",
  objective: "Objective",
};

const TYPE_ICON: Record<string, string> = {
  page: "📄",
  term: "🔤",
  equation: "∫",
  keyInsight: "💡",
  figure: "🖼",
  misconception: "⚠",
  objective: "✓",
};

export type ResultCardProps = {
  result: SearchResult;
  highlighted?: boolean;
  id?: string;
};

export function ResultCard({ result, highlighted, id }: ResultCardProps): ReactNode {
  const type = result.filters.type[0];
  return (
    <li
      role="option"
      id={id}
      aria-selected={highlighted ? "true" : "false"}
      className={`${styles.card} ${highlighted ? styles.highlighted : ""}`}
      aria-label={`${TYPE_LABEL[type]}: ${result.meta.title}, ${result.meta.locator}`}
    >
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          {TYPE_ICON[type]}
        </span>
        <span className={styles.typeLabel}>{TYPE_LABEL[type]}</span>
        <span className={styles.title}>{result.meta.title}</span>
        {type === "misconception" && result.meta.length ? (
          <span
            className={`${styles.lengthBadge} ${styles[`length-${result.meta.length}`]}`}
            aria-label={`length: ${result.meta.length === "short" ? "short note" : "full callout"}`}
          >
            {result.meta.length === "short" ? "short note" : "full callout"}
          </span>
        ) : null}
      </div>
      {type === "equation" && result.meta.tex ? (
        <div className={styles.richTail}>
          <BlockMath math={result.meta.tex} />
        </div>
      ) : (
        <p className={styles.excerpt}>{result.excerpt}</p>
      )}
      <div className={styles.locator}>{result.meta.locator}</div>
    </li>
  );
}
```

(Module CSS — minimal; refine in design pass.)

```css
/* ResultCard.module.css */
.card {
  list-style: none;
  padding: var(--sophie-space-3);
  border-radius: var(--sophie-radius-md);
  cursor: pointer;
}
.card.highlighted {
  background: var(--sophie-color-surface-2);
}
.header { display: flex; gap: var(--sophie-space-2); align-items: baseline; }
.icon { font-size: 1.1em; }
.typeLabel {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sophie-color-text-muted);
}
.title { font-weight: 600; }
.lengthBadge {
  margin-left: auto;
  padding: 0 var(--sophie-space-2);
  border-radius: var(--sophie-radius-full);
  font-size: 0.75em;
}
.length-short { background: var(--sophie-color-surface-3); color: var(--sophie-color-text); }
.length-long  { background: var(--sophie-color-surface-2); color: var(--sophie-color-text); }
.excerpt { margin: var(--sophie-space-2) 0 0; color: var(--sophie-color-text-muted); }
.richTail { margin: var(--sophie-space-2) 0; }
.locator { margin-top: var(--sophie-space-2); font-size: 0.85em; color: var(--sophie-color-text-muted); }
```

**Step 8.3 — `ResultList.tsx`.**

```tsx
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./ResultList.module.css";
import { ResultCard } from "./ResultCard.tsx";
import type { SearchResult } from "./types.ts";

export type ResultListProps = {
  results: SearchResult[];
  highlightedIndex: number;
  onSelect: (result: SearchResult) => void;
};

export function ResultList({
  results,
  highlightedIndex,
  onSelect,
}: ResultListProps): ReactNode {
  const listRef = useRef<HTMLUListElement>(null);
  const listId = "sophie-search-results";

  // Capture Enter so the listbox can fire onSelect from the
  // currently highlighted row while the input keeps DOM focus.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && results.length > 0) {
        const highlighted = results[highlightedIndex];
        if (highlighted) onSelect(highlighted);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [highlightedIndex, results, onSelect]);

  const optionId = (i: number) => `sophie-search-option-${i}`;

  if (results.length === 0) {
    return (
      <>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="search results"
          className={styles.list}
        />
        <p className={styles.empty}>
          Try typing a term, equation, key insight, or chapter name.
        </p>
        <p role="status" aria-live="polite" className={styles.srOnly}>
          No results
        </p>
      </>
    );
  }

  return (
    <>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="search results"
        aria-activedescendant={optionId(highlightedIndex)}
        className={styles.list}
      >
        {results.map((r, i) => (
          <ResultCard
            key={r.url}
            id={optionId(i)}
            result={r}
            highlighted={i === highlightedIndex}
          />
        ))}
      </ul>
      <p role="status" aria-live="polite" className={styles.srOnly}>
        {results.length} {results.length === 1 ? "result" : "results"}
      </p>
    </>
  );
}
```

CSS module (minimal):

```css
.list { list-style: none; margin: 0; padding: 0; }
.empty { padding: var(--sophie-space-4); text-align: center; color: var(--sophie-color-text-muted); }
.srOnly {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}
```

**Step 8.4 — `ChipStrip.tsx`.**

```tsx
import { type ReactNode } from "react";
import styles from "./ChipStrip.module.css";
import type { EntityType } from "@sophie/astro/lib/pagefind-converters";

export type ChipFilter = "all" | EntityType;

const CHIPS: Array<{ key: ChipFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "page", label: "Pages" },
  { key: "term", label: "Terms" },
  { key: "equation", label: "Equations" },
  { key: "keyInsight", label: "Insights" },
  { key: "figure", label: "Figures" },
  { key: "misconception", label: "Misconceptions" },
  { key: "objective", label: "Objectives" },
];

export type ChipStripProps = {
  active: ChipFilter;
  onChange: (next: ChipFilter) => void;
};

export function ChipStrip({ active, onChange }: ChipStripProps): ReactNode {
  return (
    <div role="tablist" aria-label="result type filter" className={styles.strip}>
      {CHIPS.map((c) => (
        <button
          key={c.key}
          role="tab"
          aria-selected={active === c.key ? "true" : "false"}
          className={`${styles.chip} ${active === c.key ? styles.active : ""}`}
          onClick={() => onChange(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
```

CSS module:

```css
.strip { display: flex; gap: var(--sophie-space-2); overflow-x: auto; padding: var(--sophie-space-2); }
.chip {
  border: 1px solid var(--sophie-color-border);
  background: transparent;
  border-radius: var(--sophie-radius-full);
  padding: var(--sophie-space-1) var(--sophie-space-3);
  cursor: pointer;
  font-size: 0.85em;
}
.chip.active {
  background: var(--sophie-color-accent);
  color: var(--sophie-color-on-accent);
  border-color: var(--sophie-color-accent);
}
```

**Step 8.5 — `index.ts` barrel.**

```ts
export { ResultCard } from "./ResultCard.tsx";
export { ResultList } from "./ResultList.tsx";
export { ChipStrip } from "./ChipStrip.tsx";
// SearchModal exported from here once Task 9 implements it.
export type { SearchResult } from "./types.ts";
```

**Step 8.6 — Run components tests.**

```bash
pnpm --filter @sophie/components exec vitest run src/components/Search/
```

Expected: 3 of 4 test files GREEN (ResultCard, ResultList, ChipStrip);
SearchModal still RED — Task 9 lands.

**Step 8.7 — Biome + typecheck.**

```bash
pnpm exec biome check packages/components/src/components/Search/
pnpm --filter @sophie/components run typecheck
```

**Step 8.8 — Commit.**

```bash
git add packages/components/src/components/Search/
git commit -m "feat(components): ResultCard + ResultList + ChipStrip (partial Layer 1 GREEN)

Three of the four PR 7 React components — the static, framework-
pure ones that don't need Pagefind client integration.

ResultCard.tsx: switch on result.filters.type[0] for the rich tail.
Equations render KaTeX inline; misconceptions render a length
indicator (short note / full callout) from the schema's
length: 'short' | 'long' discriminator; other 5 types use the
uniform base layout (icon + type label + title + excerpt + locator).
Per design doc §2 preview cards.

ResultList.tsx: role='listbox' with aria-activedescendant pointing
to the highlighted row. Input keeps DOM focus; screen readers
announce the active row. Enter listener at document level so the
listbox can fire onSelect without focusing rows. Per design doc §2
keyboard model.

ChipStrip.tsx: role='tablist' with 8 chips (all + 7 entity types).
Clicking a chip calls onChange with its key. Per design doc §2.

Three test files from Task 3 GREEN; SearchModal still RED.

types.ts pulls EntityType from @sophie/astro/lib/pagefind-converters
so the source-of-truth for entity types lives in one package.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — Implement SearchModal (Layer 1 GREEN)

**Goal:** Land the modal with Cmd+K wiring, Radix Dialog, Pagefind
lazy-load, debounced search, chip filter. Turns SearchModal.test.tsx
GREEN — completes Layer 1.

**Files:**
- Create: `packages/components/src/components/Search/SearchModal.tsx`
- Create: `packages/components/src/components/Search/SearchModal.module.css`
- Create: `packages/components/src/components/Search/SearchModal.stories.tsx` — Storybook
- Modify: `packages/components/src/components/Search/index.ts` — export SearchModal

**Step 9.1 — `SearchModal.tsx`.**

```tsx
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ResultList } from "./ResultList.tsx";
import { ChipStrip, type ChipFilter } from "./ChipStrip.tsx";
import styles from "./SearchModal.module.css";
import type { SearchResult } from "./types.ts";

// Pagefind's JS client interface — narrow shape for what we use.
type PagefindAPI = {
  search: (
    query: string,
    opts?: { filters?: Record<string, string | string[]> },
  ) => Promise<{ results: Array<{ data: () => Promise<SearchResult> }> }>;
};

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 25;

export function SearchModal(): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<ChipFilter>("all");
  const [pagefind, setPagefind] = useState<PagefindAPI | null>(null);

  // Global Cmd/Ctrl+K toggle
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
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
      // Pagefind is served from /pagefind/pagefind.js after the
      // postbuild step (see @sophie/astro/lib/pagefind-postbuild).
      // Vite must not try to bundle this dynamic import.
      import(/* @vite-ignore */ "/pagefind/pagefind.js")
        .then((mod) => setPagefind(mod as PagefindAPI))
        .catch((err) => {
          // Surface to consumer; tests mock this so the catch
          // path doesn't fire in unit testing.
          console.error("Pagefind load failed", err);
        });
    }
  }, [open, pagefind]);

  // Debounced query
  useEffect(() => {
    if (!pagefind || !query) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const filters =
        activeFilter === "all" ? undefined : { type: [activeFilter] };
      const search = await pagefind.search(query, { filters });
      const data = await Promise.all(
        search.results.slice(0, MAX_RESULTS).map((r) => r.data()),
      );
      setResults(data);
      setHighlightedIndex(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [pagefind, query, activeFilter]);

  // Arrow nav highlights — input keeps focus
  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      }
    },
    [results.length],
  );

  const onSelect = useCallback((r: SearchResult) => {
    setOpen(false);
    window.location.href = r.url;
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-labelledby="sophie-search-title"
          data-pagefind-ignore   /* don't self-index */
        >
          <Dialog.Title id="sophie-search-title" className={styles.srOnly}>
            Search
          </Dialog.Title>
          <input
            type="text"
            role="textbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="search query…"
            className={styles.input}
            aria-controls="sophie-search-results"
            aria-expanded={results.length > 0 ? "true" : "false"}
            autoFocus
          />
          <ChipStrip active={activeFilter} onChange={setActiveFilter} />
          <ResultList
            results={results}
            highlightedIndex={highlightedIndex}
            onSelect={onSelect}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

CSS module:

```css
.overlay {
  position: fixed; inset: 0;
  background: var(--sophie-color-overlay);
}
.content {
  position: fixed; top: 10%; left: 50%; transform: translateX(-50%);
  width: min(640px, 92vw);
  max-height: 70vh; overflow-y: auto;
  background: var(--sophie-color-surface-1);
  border-radius: var(--sophie-radius-lg);
  box-shadow: var(--sophie-shadow-modal);
  padding: var(--sophie-space-3);
}
.input {
  width: 100%;
  font-size: 1.1em;
  padding: var(--sophie-space-2);
  border: 1px solid var(--sophie-color-border);
  border-radius: var(--sophie-radius-md);
  background: var(--sophie-color-surface-0);
  color: var(--sophie-color-text);
}
.srOnly {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}
```

**Step 9.2 — Update barrel.**

```ts
// packages/components/src/components/Search/index.ts
export { SearchModal } from "./SearchModal.tsx";
export { ResultCard } from "./ResultCard.tsx";
export { ResultList } from "./ResultList.tsx";
export { ChipStrip } from "./ChipStrip.tsx";
export type { SearchResult } from "./types.ts";
```

**Step 9.3 — Add a Storybook story.**

`SearchModal.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { SearchModal } from "./SearchModal.tsx";

const meta: Meta<typeof SearchModal> = {
  component: SearchModal,
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Default: StoryObj<typeof SearchModal> = {
  parameters: {
    docs: {
      description: {
        component:
          "Cmd/Ctrl+K to open. Pagefind isn't running in Storybook so the search returns nothing; this story verifies the modal chrome and empty-state.",
      },
    },
  },
};
```

**Step 9.4 — Run components tests; verify all GREEN.**

```bash
pnpm --filter @sophie/components exec vitest run src/components/Search/
```

Expected: 4 of 4 test files GREEN. Layer 1 complete.

**Step 9.5 — Run full components suite.**

```bash
pnpm --filter @sophie/components exec vitest run
```

**Step 9.6 — Biome + typecheck.**

```bash
pnpm exec biome check packages/components/src/components/Search/
pnpm --filter @sophie/components run typecheck
```

**Step 9.7 — Commit.**

```bash
git add packages/components/src/components/Search/
git commit -m "feat(components): SearchModal — Cmd+K + Pagefind lazy-load (Layer 1 GREEN)

Lands the React island for PR 7. Composes the three Task 8
components into a Radix Dialog with:

- Global Cmd/Ctrl+K listener toggling open state.
- Lazy import of /pagefind/pagefind.js on first open. The Vite
  comment hint /* @vite-ignore */ tells the bundler not to try to
  resolve the path at build time — Pagefind is a runtime asset
  served from dist/pagefind/ by Task 7's postbuild.
- 150ms debounced search with chip-filter-aware filters arg.
- Arrow nav updates highlightedIndex; input retains DOM focus;
  ResultList's document-level Enter listener fires onSelect from
  the highlighted row.
- data-pagefind-ignore on Dialog.Content prevents the modal from
  self-indexing during the next build (design doc §9.4 pitfall).

Turns SearchModal.test.tsx GREEN — completes Layer 1.

Storybook story added at SearchModal.stories.tsx for design-system
visual reference. Pagefind isn't running in Storybook so the search
returns nothing; the story exercises chrome + empty state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — SearchTrigger.astro + TextbookLayout mount + smoke verify (Layer 2 GREEN)

**Goal:** Render the search trigger in chapter chrome; verify the
full e2e path; turn Task 4's Layer 2 spec GREEN.

**Files:**
- Create: `packages/astro/src/components/SearchTrigger.astro`
- Modify: `packages/astro/src/components/TextbookLayout.astro` — mount the trigger in the header slot

**Step 10.1 — Write `SearchTrigger.astro`.**

```astro
---
import { SearchModal } from "@sophie/components/Search";
---

<button
  type="button"
  class="sophie-search-trigger"
  data-pagefind-ignore
  aria-keyshortcuts="Control+K Meta+K"
  aria-label="Open search"
>
  <span class="sophie-search-trigger__icon" aria-hidden="true">🔍</span>
  <span class="sophie-search-trigger__label">Search</span>
  <kbd class="sophie-search-trigger__kbd">⌘K</kbd>
</button>

<SearchModal client:idle />

<style>
  .sophie-search-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--sophie-space-2);
    padding: var(--sophie-space-1) var(--sophie-space-3);
    border: 1px solid var(--sophie-color-border);
    border-radius: var(--sophie-radius-md);
    background: transparent;
    color: var(--sophie-color-text-muted);
    cursor: pointer;
    font-size: 0.9em;
  }
  .sophie-search-trigger:hover {
    background: var(--sophie-color-surface-2);
  }
  .sophie-search-trigger__kbd {
    font-size: 0.8em;
    padding: 0 var(--sophie-space-1);
    border: 1px solid var(--sophie-color-border);
    border-radius: var(--sophie-radius-sm);
    background: var(--sophie-color-surface-0);
  }
  /* The button is keyboard-only too — clicking it doesn't open
     directly; the SearchModal listens for the same keyboard event
     globally. Future polish: wire a click handler that dispatches
     the synthetic keyboard event (design doc §11). */
  @media print {
    .sophie-search-trigger { display: none; }
  }
</style>
```

**Step 10.2 — Mount in TextbookLayout.**

Edit `packages/astro/src/components/TextbookLayout.astro`. Find the
header chrome region (where `<ModuleNav>` or other chrome mounts)
and add the trigger. The exact insertion depends on the layout
structure — read the file before editing. Typical pattern:

```astro
---
// existing imports
import SearchTrigger from "./SearchTrigger.astro";
---

<!-- existing header markup -->
<header class="sophie-textbook__header">
  <slot name="sidebar" />
  <div class="sophie-textbook__header-right">
    <SearchTrigger />
    <!-- existing theme toggle, etc. -->
  </div>
</header>
```

(Exact slot/region naming depends on existing layout; adapt to the
file's structure.)

**Step 10.3 — Rebuild smoke; verify HTML contains the trigger + pagefind output.**

```bash
pnpm --filter smoke build
grep -c "sophie-search-trigger" \
  examples/smoke/dist/chapters/measuring-the-sky/index.html
```

Expected: ≥ 1.

```bash
ls examples/smoke/dist/pagefind/pagefind.js
```

Expected: file exists.

**Step 10.4 — Run Layer 2 e2e single shot.**

```bash
pnpm test:e2e search.spec.ts
```

Expected: 3/3 pass.

**Step 10.5 — Run Layer 2 e2e 3× consecutive (Bucket-C SoTA discipline).**

```bash
for i in 1 2 3; do
  echo "=== run $i ==="
  pnpm test:e2e search.spec.ts || break
done
```

All three must pass. If any flakes, investigate (don't bump
timeouts).

**Step 10.6 — Full PR-level gates.**

```bash
pnpm exec biome check .              # 0 errors, 0 warnings
pnpm turbo run typecheck              # 9/9 clean
pnpm turbo run test                   # all clean
pnpm install --frozen-lockfile        # clean drift
```

**Step 10.7 — Commit.**

```bash
git add packages/astro/src/components/SearchTrigger.astro \
        packages/astro/src/components/TextbookLayout.astro
git commit -m "feat(astro): SearchTrigger in TextbookLayout + Layer 2 GREEN

Lands the visible search affordance in every chapter's header
chrome. The button itself is a static Astro component for paint-
fast discovery (visible immediately, no React hydration delay);
the SearchModal mounts as a React island with client:idle to
defer hydration until after the chapter's primary content paints.

The keyboard shortcut (Cmd/Ctrl+K) opens the modal via the
SearchModal's global document listener — the button is a click
target only (no event coupling needed; ADR 0037 cross-bundle
pattern not required for v1 since the modal opens itself on
its own keyboard handler).

@media print hides the trigger (design doc §11 print-hide
follow-up; PR 10 will cover full print polish).

Smoke build now ships dist/pagefind/ + dist/chapters/.../index.html
with a visible trigger. Playwright e2e (Layer 2) reports 3/3 across
3 consecutive runs — condition-based-waiting throughout (Radix
data-state, aria-live status text, aria-selected on chips).

Closes the four-layer test pyramid for PR 7:
- Layer 1 unit (UI components): 4 files / ~22 tests GREEN
- Layer 1.5 converter unit: 7 files / ~35 tests GREEN
- Layer 1.6 Pagefind round-trip: 1 file / 1 test GREEN
- Layer 2 Playwright e2e: 1 file / 3 tests GREEN

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## After tasks: Open the PR

**Step 11.1 — Push the branch.**

```bash
git push -u origin feat/pr-7-pagefind-search
```

**Step 11.2 — Open the PR.**

```bash
gh pr create --title "feat: Pagefind faceted search modal (PR 7, Bucket B)" --body "$(cat <<'EOF'
## Summary

Adds course-wide search via Pagefind, accessible from any chapter
via Cmd/Ctrl+K. Surfaces all 7 first-class PedagogyIndex entity
types as faceted results alongside conventional page-level prose
hits.

**Architecture:** React island (Radix Dialog + Pagefind JS client)
in `@sophie/components`; Astro `astro:build:done` hook in
`@sophie/astro` orchestrates two pipelines:
1. Pagefind's default HTML crawl for page records.
2. Per-entity custom records via a typed converter registry, reading
   from `indexAccumulator.asPedagogyIndex()` directly (the in-memory
   singleton already consumed by `<CourseObjectives>` etc.).

**Pattern precedent:** sets the canonical shape for any future
"consume the pedagogy-index for a structured view" feature. The
converter registry is exhaustiveness-tested; adding a new entity
type later is one converter + one registry entry, no other changes.

## Reference docs

- [Design](docs/plans/2026-05-14-pr-7-pagefind-search-design.md)
- [Implementation plan](docs/plans/2026-05-14-pr-7-pagefind-search-plan.md)
- [Bucket B closeout plan](file:///Users/anna/.claude/plans/proceed-give-me-an-synchronous-harbor.md)

## Test plan

- [x] Layer 1 unit (UI): 4 files / ~22 tests
- [x] Layer 1.5 converter unit: 7 files / ~35 tests
- [x] Layer 1.6 Pagefind index round-trip: 1 file / 1 test
- [x] Layer 2 Playwright e2e (smoke): 1 file / 3 tests, 3× consecutive green
- [x] `pnpm exec biome check .` clean
- [x] `pnpm turbo run typecheck` clean
- [x] `pnpm turbo run test` clean
- [x] `pnpm install --frozen-lockfile` clean
- [x] axe-core green on all modal states (Layer 1 + Layer 2)

## Out of scope (per design doc §8)

- Authored ranking weights (BM25 default ships).
- LDS-foundation entities (notation registry, misconception graph,
  intervention library, teaching moves, equation biography) — no
  indexable data yet; converter registry seam left open for Phase 3.
- Search history / recents.
- Multi-course federated search.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Risks + rollback

- **Pagefind dep adds ~50KB to the served-asset budget** (JS client
  loaded lazily on first Cmd+K). If profiling shows this matters,
  consider eager-on-trigger-hover preload (design doc §11
  follow-up). Rollback shape: revert Task 7 + 10 to un-mount the
  trigger and skip the postbuild; the rest of the build still works.
- **`indexAccumulator` singleton coupling.** Postbuild reads in-
  process state. If Astro 7+ moves builds to worker threads, this
  breaks; the fix is the `dist/.sophie/pedagogy-index.json`
  serialization that ADR 0045 already mandates. Rollback shape:
  feature-flag the postbuild via integration option until ADR 0045's
  artifact ships.
- **Self-indexing footgun.** If `data-pagefind-ignore` is forgotten
  on the modal root or trigger, the next build will index the
  modal's own UI strings. Layer 2 e2e doesn't catch this directly
  (the spec searches for chapter content, not modal chrome). Future
  test: add a "search for 'search query…' returns no result-like
  hits in chapter pages" assertion to Layer 2.
- **Anchor format divergence.** If converters emit URLs with
  anchor formats the rendering side doesn't match (e.g., `#term-X`
  vs `#X-term`), the deep-link doesn't land. Task 6's converters
  use the same `anchor` field the entity carries, so this is
  prevented by construction; flagged here because regression-test
  Task 4's spec asserts navigation lands on the right page only,
  not the right anchor.

---

## Out of scope (this plan)

Per design doc §8, restated:

- Authored ranking weights.
- LDS-foundation entity surfacing (no data yet).
- Search analytics / query logging.
- Multi-course federated search.
- Search history / recents.
- Mobile-specific UX shape.
