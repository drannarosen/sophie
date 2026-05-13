---
title: PR-C1 — Definitions index + glossary consumers
date: 2026-05-13
status: approved
phase: 2 (Bucket C / pedagogy index)
pr-branch: feat/glossary-index
predecessor: PR #35 (`<Aside>` margin notes)
adrs: 0038 (pedagogy index pattern), 0039 (Lucide two-adapter)
---

# PR-C1 — Definitions index + glossary consumers (design doc)

## Context

PR-C1 ships the **first instance of the pedagogy index pattern**
codified by [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md):
a build-time `PedagogyIndex` extracted from MDX, aggregated by
pedagogical role, consumed by chapter / course / inline-reference
surfaces via a Vite virtual module.

For PR-C1, the role is **definition**. Source primitive:
[`<Aside kind="definition" title="X">`](../../packages/components/src/components/Aside/)
(shipped PR 6 / #35). Consumers:

| Surface | Role | Implementation |
| --- | --- | --- |
| `<ChapterGlossary />` | Alphabetical (default) or appearance-ordered list of one chapter's definitions | Astro component in `@sophie/astro` |
| `<CourseGlossary />` | Alphabetical list of every chapter's definitions + back-links | Astro component in `@sophie/astro` |
| `<GlossaryTerm name="…">` | Inline term reference with hover popover (definition body) and click-to-anchor navigation | React component in `@sophie/components` (first `lucide-react` + Radix-Popover consumer per ADR 0039) |
| `/glossary` route | Hosts `<CourseGlossary />` | Astro page in `examples/smoke/src/pages/` |

PR-C1 also retires `<MiniGlossary>` from the public API (the
pre-pedagogy-index placeholder shipped before PR 6); migrates the
smoke chapter's 14-term vocabulary block to canonical Aside-based
definitions; tightens the `<Aside>` schema so `kind="definition"`
requires a non-empty `title`; and adds the three audit invariants
that fall naturally out of PR-C1's machinery (the remaining two
invariants defer to PR-C4 per the locked sequence).

This is the load-bearing PR of Bucket C. PRs C2–C4 extend the
same machinery to equations, key-insights, figures,
misconceptions, and learning-objective roll-ups — each adds an
entry type + extractor logic + consumers without re-discovering
the architecture.

## Decisions locked

| # | Fork | Decision |
| --- | --- | --- |
| 1 | Schema package | `@sophie/core/src/schema/pedagogy-index.ts` — mirrors `chapter.ts` / `module.ts` shape (per ADR 0001's data-shapes-in-core rule) |
| 2 | Extractor location | `@sophie/astro/src/lib/pedagogy-index-extractor.ts` — wired into `sophieMdxOptions.remarkPlugins` (lives in `lib/`, not `components/`, matching `aside-positioning.ts` and `group-headings.ts`) |
| 3 | Index access mechanism | **Vite virtual module `virtual:sophie/pedagogy-index`** — the small Vite plugin lives next to the extractor; consumers `import { definitions } from "virtual:sophie/pedagogy-index"` (HITL Q1 confirmed 2026-05-13) |
| 4 | Aside schema refinement | `AsidePropsSchema.refine(...)` requires non-empty `title` when `kind === "definition"`; other kinds keep `title` optional |
| 5 | Slugify shape | Split into **two functions**: `slugify(s)` (pure; runtime-side `name → slug` lookup) + `slugifyWithCollisions(s, seen)` (preserves the existing MiniGlossary semantics for the extractor's per-chapter collision tracking). Lives at `@sophie/core/src/lib/slugify.ts` |
| 6 | Anchor IDs | Hybrid: default `id={slugify(title)}` on the rendered `<details>` element; authors can override via explicit `<Aside id="…">` |
| 7 | Body rendering | Pre-rendered HTML string at extraction time (overview decision #11). Consumers embed via `set:html={entry.body}` / `dangerouslySetInnerHTML` |
| 8 | Sort order | `<ChapterGlossary />` alphabetical default + `order="appearance"` prop; `<CourseGlossary />` alphabetical only |
| 9 | GlossaryTerm click target | Anchor to canonical aside (`/chapters/<chapter>#<anchor>`); hover popover shows definition body |
| 10 | Aliases / synonyms | None in v1 — exact-match only |
| 11 | Smoke migration shape | **Hybrid**: `<ChapterGlossary />` at line 359 of spoiler-alerts.mdx (preserves orientation-scan pedagogy) + 14 inline `<Aside kind="definition">` blocks at first-mention sites (HITL Q2 confirmed 2026-05-13) |
| 12 | Lucide adapter | Pedagogy-side `lucide-react` per ADR 0039 — PR-C1 brings the dep into `@sophie/components` via `<GlossaryTerm>`'s `BookOpen` (or similar) trigger icon |
| 13 | Audit invariants this PR | Invariants 1 (duplicate term slugs across chapters), 2 (intra-chapter slug collision), 3 (empty title on definition aside) enforced. Invariants 4 (undefined `<GlossaryTerm>` references) + 5 (orphan definitions) defer to PR-C4 |
| 14 | MiniGlossary deprecation | Hard removal — delete `packages/components/src/components/MiniGlossary/`; remove from public exports; delete `examples/smoke/e2e/mini-glossary.spec.ts`. No back-compat shim per [memory `feedback_no_backcompat_prelaunch`](../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md) |

Locked patterns inherited (cite, don't re-litigate): ADRs
0001–0034, 0036 (factory pattern — content-layer twin in 0038),
0037 (cross-bundle observation — not triggered by this PR).

## API design

### `@sophie/core/src/lib/slugify.ts`

```ts
/**
 * Pure slug generator. Lowercases, normalizes Unicode (NFKD),
 * replaces non-alphanumerics with single hyphens, strips edge
 * hyphens. Empty input → "term". Deterministic; no collision
 * tracking.
 *
 * Use for runtime-side lookups (e.g. <GlossaryTerm name="X">
 * resolves "X" to its index entry by slug match).
 */
export function slugify(s: string): string;

/**
 * Collision-tracking slug generator. Same base algorithm as
 * `slugify`, but mutates a `seen: Map<string, number>` to
 * disambiguate repeated slugs within a tracking scope
 * (typically one chapter's extracted definitions). Returns
 * `base`, `base-2`, `base-3`, ... for the 1st, 2nd, 3rd
 * occurrences.
 *
 * Use for the remark plugin's per-chapter extraction pass.
 * Preserves the existing MiniGlossary semantics now retired
 * from that component.
 */
export function slugifyWithCollisions(
  term: string,
  seen: Map<string, number>,
): string;
```

### `@sophie/core/src/schema/pedagogy-index.ts`

```ts
export interface DefinitionEntry {
  term: string;       // canonical title from <Aside title>; required by Zod refinement
  slug: string;       // slugify(title) by default; override via <Aside id>
  body: string;       // pre-rendered HTML of the aside body
  chapter: string;    // chapter slug containing the source aside
  anchor: string;     // DOM id on the rendered <details>
}

// Stub types declared up-front so the schema shape is locked
// before PR-C2/C3 ship; PR-C1's runtime extracts and tests
// Definition only.
export interface EquationEntry { /* PR-C2 */ }
export interface KeyInsightEntry { /* PR-C3 */ }
export interface FigureEntry { /* PR-C3 */ }
export interface MisconceptionEntry { /* PR-C3 */ }

export interface PedagogyIndex {
  definitions: ReadonlyArray<DefinitionEntry>;
  equations: ReadonlyArray<EquationEntry>;
  keyInsights: ReadonlyArray<KeyInsightEntry>;
  figures: ReadonlyArray<FigureEntry>;
  misconceptions: ReadonlyArray<MisconceptionEntry>;
}

export const DefinitionEntrySchema: z.ZodType<DefinitionEntry>;
export const PedagogyIndexSchema: z.ZodType<PedagogyIndex>;
```

### `@sophie/astro/src/lib/pedagogy-index-extractor.ts`

Remark plugin signature + the public extractor API the Vite
plugin and tests both consume:

```ts
import type { Plugin } from "unified";
import type { Root } from "mdast";

/**
 * Per-build accumulator. Module-level singleton; the Vite plugin
 * resolves `virtual:sophie/pedagogy-index` from this. Cleared on
 * HMR invalidation of any chapter MDX.
 */
export const indexAccumulator: {
  definitions: Map<string, DefinitionEntry>;   // keyed by slug; cross-chapter
  clearChapter(chapterSlug: string): void;
  asPedagogyIndex(): PedagogyIndex;
};

/**
 * Pure extraction: walk an mdast tree, find <Aside
 * kind="definition"> JSX flow elements, return DefinitionEntry[].
 * Pure function over an AST; no module-level side effects.
 * Tested directly with synthetic ASTs.
 */
export function extractDefinitions(
  tree: Root,
  chapterSlug: string,
): DefinitionEntry[];

/**
 * The remark plugin: parses a chapter, accumulates its entries,
 * detects intra-chapter slug collisions (throws), detects
 * cross-chapter slug duplicates (throws). Replaces the mdast
 * unchanged (extraction-only; no transformation).
 */
export const pedagogyIndexExtractor: Plugin<[], Root>;
```

The extractor uses `unist-util-visit` over `mdxJsxFlowElement` nodes
with `node.name === "Aside"`. Attributes are parsed by reading
`node.attributes` (mdxJsxAttribute array). For each definition
aside, body content is rendered via `mdast-util-to-hast` +
`hast-util-to-html` (existing transitive deps via the remark
ecosystem; verified during step-7 implementation).

### Vite virtual module plugin

```ts
// packages/astro/src/lib/pedagogy-index-virtual-module.ts
import type { Plugin } from "vite";
import { indexAccumulator } from "./pedagogy-index-extractor";

const VIRTUAL_ID = "virtual:sophie/pedagogy-index";

export function pedagogyIndexVirtualModule(): Plugin {
  return {
    name: "sophie:pedagogy-index",
    resolveId(id) { /* hoist VIRTUAL_ID */ },
    load(id) {
      if (id !== `\0${VIRTUAL_ID}`) return;
      const idx = indexAccumulator.asPedagogyIndex();
      return `export const definitions = ${JSON.stringify(idx.definitions)};
export const equations = ${JSON.stringify(idx.equations)};
export const keyInsights = ${JSON.stringify(idx.keyInsights)};
export const figures = ${JSON.stringify(idx.figures)};
export const misconceptions = ${JSON.stringify(idx.misconceptions)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith(".mdx")) return;
      const mod = server.moduleGraph.getModuleById(`\0${VIRTUAL_ID}`);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
```

Wired in `astro.config.mjs` (smoke target) via `vite: { plugins: [pedagogyIndexVirtualModule()] }`, and exported from
`@sophie/astro` as part of `sophieMdxOptions` so consumer apps
get it automatically.

**Build-order assumption.** Astro 6 eagerly parses every chapter
in a content collection at build init (before any page renders);
the remark plugin in `sophieMdxOptions.remarkPlugins` runs as
part of that pass; therefore the module-level `indexAccumulator`
is fully populated before any consumer page imports the virtual
module. In dev mode Astro parses on demand, but Vite's
`handleHotUpdate` invalidates the virtual module whenever any
`.mdx` changes, so consumers re-resolve against the freshly-
populated accumulator. Verified during step-13 implementation:
add a deliberate ordering test that imports the virtual module
from an Astro page and asserts the accumulator size matches the
content-collection size.

### `<Aside>` Zod refinement

```ts
// packages/components/src/components/Aside/Aside.schema.ts
export const AsidePropsSchema = z
  .object({
    kind: AsideKind.optional(),
    title: z.string().optional(),
    id: z.string().optional(),     // NEW (decision #6)
    children: z.custom<ReactNode>(),
  })
  .refine(
    (props) => props.kind !== "definition" ||
               (typeof props.title === "string" && props.title.trim().length > 0),
    {
      message: '<Aside kind="definition"> requires a non-empty `title` prop',
      path: ["title"],
    },
  );
```

### `<GlossaryTerm>` (React)

```ts
// packages/components/src/components/GlossaryTerm/GlossaryTerm.schema.ts
export const GlossaryTermPropsSchema = z.object({
  name: z.string().min(1),       // resolves to slugify(name) → DefinitionEntry
  children: z.custom<ReactNode>(),   // the displayed term text in prose
});

// packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx
// definitionsBySlug is a per-module-load index built from the
// virtual module's `definitions` array — one-time cost, O(1)
// lookups thereafter. The component doesn't re-index per render.
const definitionsBySlug = new Map(
  definitions.map((d) => [d.slug, d]),
);

export function GlossaryTerm({ name, children }: GlossaryTermProps) {
  const slug = slugify(name);
  const entry = definitionsBySlug.get(slug);
  // If undefined: PR-C4 will turn this into a build-time error
  // (invariant #4). For PR-C1, the component degrades gracefully:
  // render the prose term unchanged with no popover + no link,
  // and emit a console.warn in dev. Non-fatal so in-flight
  // chapter authoring doesn't break the build.

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <a className={styles.term} href={`/chapters/${entry.chapter}#${entry.anchor}`}>
          {children}
          <BookOpen aria-hidden size={12} />
        </a>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.popover}>
          <strong>{entry.term}</strong>
          <div dangerouslySetInnerHTML={{ __html: entry.body }} />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

A11y notes:

- `<Popover.Trigger asChild>` over an `<a>` gets click-through-to-anchor + Popover hover-show without a button-inside-anchor hierarchy violation.
- `BookOpen` from `lucide-react` is presentational (`aria-hidden`); the anchor text is the accessible name.
- Popover opens on focus + hover (Radix default); closes on Escape and outside-click.
- Light/dark variants axe-clean per the established Storybook pattern.

Storybook integration note: the `virtual:sophie/pedagogy-index`
module isn't resolvable from inside Storybook's isolated render
(Storybook doesn't run Astro's Vite config). Stories pass a
hand-crafted `DefinitionEntry` via a `__storybookEntry` prop
that production code ignores; the story's MDX-equivalent prose
context is rendered as plain JSX (no virtual-module lookup).
Mocking-discipline tradeoff is acceptable for this component
because the prop surface is small and the entry shape is
typed by the schema.

### `<ChapterGlossary />` (Astro)

```astro
---
// packages/astro/src/components/ChapterGlossary.astro
import { definitions } from "virtual:sophie/pedagogy-index";

interface Props {
  chapter: string;
  order?: "alphabetical" | "appearance";
}

const { chapter, order = "alphabetical" } = Astro.props;
const entries = definitions.filter(d => d.chapter === chapter);
const sorted = order === "alphabetical"
  ? [...entries].sort((a, b) => a.term.localeCompare(b.term))
  : entries;  // appearance order = remark walk order
---
<dl class="sophie-chapter-glossary">
  {sorted.map((entry) => (
    <Fragment>
      <dt id={`gloss-${entry.slug}`}>{entry.term}</dt>
      <dd set:html={entry.body} />
    </Fragment>
  ))}
</dl>
```

### `<CourseGlossary />` (Astro)

```astro
---
// packages/astro/src/components/CourseGlossary.astro
import { definitions } from "virtual:sophie/pedagogy-index";

const sorted = [...definitions].sort((a, b) => a.term.localeCompare(b.term));
---
<dl class="sophie-course-glossary">
  {sorted.map((entry) => (
    <Fragment>
      <dt id={`gloss-${entry.slug}`}>{entry.term}</dt>
      <dd>
        <div set:html={entry.body} />
        <a class="sophie-course-glossary__backlink"
           href={`/chapters/${entry.chapter}#${entry.anchor}`}>
          defined in <code>{entry.chapter}</code>
        </a>
      </dd>
    </Fragment>
  ))}
</dl>
```

## Files

### New

| Path | Purpose |
| --- | --- |
| `packages/core/src/lib/slugify.ts` | `slugify` + `slugifyWithCollisions` |
| `packages/core/src/lib/slugify.test.ts` | unit tests |
| `packages/core/src/schema/pedagogy-index.ts` | `DefinitionEntry`, `PedagogyIndex` (+ stub types for PR-C2/3) + Zod schemas |
| `packages/core/src/schema/pedagogy-index.test.ts` | unit tests |
| `packages/astro/src/lib/pedagogy-index-extractor.ts` | remark plugin + `extractDefinitions` + `indexAccumulator` |
| `packages/astro/src/lib/pedagogy-index-extractor.test.ts` | unit tests (synthetic AST inputs) |
| `packages/astro/src/lib/pedagogy-index-virtual-module.ts` | Vite plugin |
| `packages/astro/src/components/ChapterGlossary.astro` | per-chapter list consumer |
| `packages/astro/src/components/CourseGlossary.astro` | full-course list consumer |
| `packages/components/src/components/GlossaryTerm/GlossaryTerm.schema.ts` | props schema |
| `packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx` | React component |
| `packages/components/src/components/GlossaryTerm/GlossaryTerm.contract.ts` | component contract (`serialize`, `audit`) |
| `packages/components/src/components/GlossaryTerm/GlossaryTerm.module.css` | scoped styles |
| `packages/components/src/components/GlossaryTerm/GlossaryTerm.test.tsx` | unit tests + axe |
| `packages/components/src/components/GlossaryTerm/GlossaryTerm.stories.tsx` | Storybook |
| `packages/components/src/components/GlossaryTerm/index.ts` | barrel |
| `examples/smoke/src/pages/glossary.astro` | `/glossary` route |
| `examples/smoke/e2e/course-glossary.spec.ts` | e2e |
| `examples/smoke/e2e/chapter-glossary.spec.ts` | e2e |
| `examples/smoke/e2e/glossary-term.spec.ts` | e2e |

### Modified

| Path | Change |
| --- | --- |
| `packages/core/src/schema/index.ts` | export pedagogy-index types |
| `packages/core/src/index.ts` | export `slugify` + `slugifyWithCollisions` |
| `packages/components/src/components/Aside/Aside.schema.ts` | add `.refine()` for definition-title requirement + add `id?: string` prop |
| `packages/components/src/components/Aside/Aside.tsx` | honor `id` prop on the rendered `<details>` (default `slugify(title)` when `kind === "definition"`) |
| `packages/components/src/index.ts` | export `GlossaryTerm` + types; remove `MiniGlossary` exports |
| `packages/astro/src/mdx-config.ts` | register `pedagogyIndexExtractor` in `remarkPlugins` |
| `packages/astro/src/index.ts` | export `pedagogyIndexVirtualModule` |
| `packages/astro/src/icons/index.ts` | docstring fix `"future ADR 0037"` → `"ADR 0039"` (carryover follow-up from the 0039 commit message) |
| `examples/smoke/astro.config.mjs` | add `pedagogyIndexVirtualModule()` to `vite.plugins` |
| `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx` | smoke migration per the table below |

### Deleted

| Path | Reason |
| --- | --- |
| `packages/components/src/components/MiniGlossary/` (entire dir) | Deprecated by `<ChapterGlossary />` + `<CourseGlossary />` |
| `examples/smoke/e2e/mini-glossary.spec.ts` | Component removed |

## Smoke chapter migration (decision #11 — hybrid)

The MiniGlossary block at `spoiler-alerts.mdx:359` is replaced by
`<ChapterGlossary chapter="spoiler-alerts" />`. The 14 vocabulary
terms become inline `<Aside kind="definition" title="…">` blocks
distributed at their first-mention sites in the spoiler prose:

Anchor rule for this chapter: **first prose use** (the
chapter's stated pedagogy is "recognition not retention; every
term reappears later in §1.3 / §1.4 with formal development."
The margin aside serves the "I don't quite know this yet" moment
the reader hits at the spoiler-tour usage). §1.3 / §1.4's
formal-development sections stand alone without additional
asides.

| Term | Anchor (line numbers approximate; finalized in step 21) |
| --- | --- |
| Photon | Spoiler 1 ~line 399 — "Red light at 656 nm" |
| Wavelength (λ) | Spoiler 1 — same paragraph |
| Spectrum | Spoiler 1 — "Detecting specific wavelengths tells you which atoms are present" |
| Emission | Spoiler 1 — "Atoms emit light at specific wavelengths" |
| Absorption | Spoiler 1 deep-dive (Atomic Fingerprint CollapsibleCard) — co-locate |
| Ionized | Spoiler 1 ~line 401 — "heated and **ionized** by nearby hot stars" |
| Neutral | Spoiler 6 ~line 599 — "**Neutral** hydrogen emits at exactly 21 cm" (first physics-bearing use; Spoiler 1's contrast-pair mention pre-dates this but is qualitative) |
| Extinction | Spoiler 1 — "dust... absorb and scatter starlight" |
| Flux | Spoiler 2 ~line 437 — "measure how bright it *appears*" |
| Luminosity | Spoiler 2 — same paragraph |
| Thermal radiation | Spoiler 6 ~line 599 — "Stars emit **thermal radiation** from their hot surfaces" |
| Dark matter | Spoiler 9 ~line 667 — "We infer the presence of **dark matter**" (the chapter's formal development for this term lives in Spoiler 9) |
| Dark energy | Spoiler 10 ~line 727 — "Something is pushing the universe apart faster and faster. We call it **dark energy**." |
| Redshift | Spoiler 10 ~line 721 — "redshift—the Doppler shift we introduced in Spoiler 4. When we spread a galaxy's light into a spectrum, its spectral lines appear shifted toward longer (redder) wavelengths..." (the chapter's detailed unpacking) |

Two additional changes in the same MDX file:

- Line 405's stale `<aside class="margin-note">` ("Key insight:
  Color isn't decoration…") → `<Aside kind="key-insight">` per
  audit P2-NEW-3.
- Add 1–2 inline `<GlossaryTerm name="…">` usages in prose for
  e2e fixture coverage (e.g., the second mention of "parallax"
  in Spoiler 2's prose).

## TDD test list (22 steps; iron law: failing test first)

| # | Test | Production code |
| --- | --- | --- |
| 1 | `slugify("Standard candle")` returns `"standard-candle"`; empty input returns `"term"`; Unicode + punctuation normalized | `packages/core/src/lib/slugify.ts` — pure `slugify` |
| 2 | `slugifyWithCollisions` returns `base`, `base-2`, `base-3` for successive calls with same input + same `seen` map | Same file — `slugifyWithCollisions` |
| 3 | `safeParse({ kind: "definition" })` returns failure with the refinement error message | `Aside.schema.ts` — `.refine()` |
| 4 | `safeParse({ kind: "definition", title: "  " })` (whitespace-only) returns failure | Same refinement (handles `.trim().length === 0`) |
| 5 | `safeParse({ kind: "note" })` (no title) still succeeds | Schema unchanged for other kinds |
| 6 | All current Aside stories + 24 component tests still pass | Regression suite |
| 7 | `PedagogyIndexSchema.parse({...})` accepts a valid index with one DefinitionEntry; rejects malformed entries | `pedagogy-index.ts` + Zod schemas |
| 8 | `extractDefinitions(tree, "ch")` on a synthetic AST with one Aside-definition returns `[{ term, slug, body, chapter: "ch", anchor }]` | `pedagogy-index-extractor.ts` — `extractDefinitions` |
| 9 | Body rendering: an aside with `<p>foo <strong>bar</strong></p>` body produces `body === "<p>foo <strong>bar</strong></p>"` | Same; mdast → hast → html |
| 10 | Two asides in one chapter with the same title throw a clear error citing the chapter + slug | Intra-chapter collision detection |
| 11 | Asides in two different chapters with the same title throw a cross-chapter duplicate error | Cross-chapter accumulator |
| 12 | Explicit `<Aside id="custom-slug">` overrides the auto-slug | Extractor reads `id` attribute |
| 13 | Vite plugin's `load(VIRTUAL_ID)` returns valid JS exposing `definitions`/`equations`/etc. | `pedagogy-index-virtual-module.ts` |
| 14 | Vite plugin invalidates the virtual module on `.mdx` hot update | `handleHotUpdate` |
| 15 | `<GlossaryTerm name="Standard candle">` resolves to the matching definition by slug; renders trigger + Popover | `GlossaryTerm.tsx` |
| 16 | GlossaryTerm: clicking the trigger navigates to `/chapters/<chapter>#<anchor>` | href correctness |
| 17 | GlossaryTerm: axe-clean across all 4 view-mode + 2 theme combinations | Storybook test-runner + axe |
| 18 | `<ChapterGlossary chapter="ch" />` renders all asides for the chapter, alphabetical by default | `ChapterGlossary.astro` |
| 19 | `<ChapterGlossary chapter="ch" order="appearance" />` renders in source order | Same component |
| 20 | `<CourseGlossary />` renders all definitions alphabetically with back-links | `CourseGlossary.astro` |
| 21 | Smoke chapter migration: spoiler-alerts.mdx has 14 definition asides + `<ChapterGlossary />`; MiniGlossary gone | Content edits |
| 22 | e2e: `/glossary` page lists 14 definitions; clicking one navigates to canonical anchor; `<GlossaryTerm>` hover popover shows the body | `course-glossary.spec.ts` + `chapter-glossary.spec.ts` + `glossary-term.spec.ts` |

Plus a final regression sweep: full Playwright suite green (~85
cases = 87 prior − 14 mini-glossary + ~12 new).

Unit-test budget target: **~30 new vitest cases**
(slugify ~5, schema ~5, extractor ~10, virtual module ~3,
GlossaryTerm component ~7).

## Verification (superpowers:verification-before-completion)

Before opening the PR; all must be green with **zero biome warnings**:

```bash
pnpm install --frozen-lockfile   # validates lockfile (saved memory `feedback_pre_pr_lockfile_check`)
pnpm exec biome check .          # ZERO warnings + ZERO errors
pnpm exec turbo run typecheck    # all 6 workspace packages
pnpm exec turbo run test:unit    # ~321 prior + ~30 new = ~351 green
pnpm exec turbo run build        # smoke target builds end-to-end
pnpm test:e2e                    # ~85 green
pnpm exec turbo run test --filter=@sophie/components   # Storybook + axe
```

E2E verification via Playwright MCP / browser:

1. `cd examples/smoke && pnpm dev`.
2. Navigate to `/chapters/spoiler-alerts`:
   - `<ChapterGlossary />` shows 14 definitions alphabetically.
   - Each `<Aside kind="definition">` docks in the right column at its source paragraph (PR 6 behavior preserved).
   - Inline `<GlossaryTerm>` shows hover popover with definition body; clicking navigates to canonical anchor.
3. Navigate to `/glossary`:
   - `<CourseGlossary />` lists 14 definitions alphabetically.
   - Each entry has a "defined in: spoiler-alerts" back-link.
4. Light / dark / default / focused / wide all axe-clean.

## Out of scope (deferred)

- Audit invariants 4 + 5 (undefined `<GlossaryTerm>` references; orphan definitions) — PR-C4.
- Equations / key-insights / figures / misconceptions index collections — PRs C2 + C3.
- Aliases / synonyms on `<GlossaryTerm name>` — deferred to v2 per decision #10.
- LO course roll-up — PR-C4.
- Faceted search consuming the index — Bucket B PR 7 (post-Bucket-C).
- `lucide-react` adoption in other `@sophie/components` (KeyEquation expander, etc.) — separate mechanical PR per ADR 0039's "Triggers" + audit P2-NEW-2.

## References

- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) — the pattern this PR is the first instance of.
- [ADR 0039](../website/decisions/0039-lucide-two-adapter-convention.md) — Lucide adapter convention; PR-C1 is the first pedagogy-side consumer.
- [Bucket C overview](./2026-05-13-bucket-c-pedagogy-index-overview.md) — round-1 + round-2 brainstorm + locked schema.
- [PR 6 Aside design doc](./2026-05-13-aside-design.md) — the source primitive this PR makes indexable.
- [Bucket B PR 6 audit](../reviews/2026-05-13-bucket-b-pr6-audit.md) — current state (A+, 96/100); P2-NEW-3 closes via the line-405 migration here.
- [overview.md §1](../website/overview.md) — the AI-author model this infrastructure makes concrete.
