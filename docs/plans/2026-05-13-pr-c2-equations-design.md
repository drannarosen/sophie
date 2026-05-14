---
title: PR-C2 — Equations index + 2 consumers + EqRef
date: 2026-05-13
status: approved
phase: 2 (Bucket C / pedagogy index)
pr-branch: feat/equations-index
predecessor: PR-C1 (#36)
adrs: 0038 (pedagogy index pattern), 0030 (AI-author model), 0039 (Lucide two-adapter)
---

# PR-C2 — Equations index + 2 consumers + EqRef (design doc)

## Context

PR-C2 ships the **second instance of the pedagogy index pattern**
codified by [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md):
the `equation` role. PR-C1 established the machinery (per-build
`indexAccumulator` on `globalThis`, MDX remark plugin, Vite virtual
module, SSR→CSR script-tag transfer, HoverCard inline cross-ref);
PR-C2 extends that machinery to its second role without re-discovering
the architecture. The four PR-C1 implementation realities documented
in [ADR 0038's Revisions section](../website/decisions/0038-pedagogy-index-pattern.md)
carry through unchanged.

Source primitive (shipped Phase 0; unchanged by PR-C2):
[`<KeyEquation id="..." title="...">`](../../packages/components/src/components/KeyEquation/).
Consumers:

| Surface | Role | Implementation |
| --- | --- | --- |
| `<ChapterEquations chapter="..." />` | Alphabetical (default) or appearance-ordered list of one chapter's equations | Astro component in `@sophie/astro` |
| `<CourseEquations />` | Chapter-order (default) or alphabetical list of every chapter's equations + back-links | Astro component in `@sophie/astro` |
| `<EqRef slug="..." />` (self-closing) or `<EqRef slug="...">{children}</EqRef>` | Inline equation cross-reference; HoverCard popover renders title + KaTeX-rendered tex; click navigates to source anchor | React component in `@sophie/components` |
| `/equations` route | Hosts `<CourseEquations />` | Astro page in `examples/smoke/src/pages/` |

PR-C2 also revises the `EquationEntry` schema (PR-C1 shipped a stub):
rename `label` → `title`, make `number` required (per-chapter
auto-assigned by the extractor), add new field `tex` (raw TeX source
of the first `$$` block in the body for client-side KaTeX rendering,
LaTeX export, symbol search, AI-as-STEM-domain dim-analysis). The
`anchor === slug` invariant is documented (extractor controls both).
Adds the `katex@^0.16` direct dep to `@sophie/components` (currently
transitive via `rehype-katex` in `@sophie/astro`).

Equations are pedagogically load-bearing for STEM authoring. The
nine decisions locked in
[the brainstorm overview](./2026-05-13-pr-c2-equations-overview.md)
ripple through every textbook Sophie will ship; this design doc
translates them into concrete file paths, code shapes, and a TDD
test list.

## Decisions locked

| # | Fork | Decision |
| --- | --- | --- |
| 1 | Numbering | Per-chapter auto by appearance order, assigned by `extractEquations` (extractor maintains a per-call counter starting at 1). Schema field `number` is REQUIRED. |
| 2 | Schema alignment | `slug` value = `KeyEquation.id` (no auto-derivation; authors write semantic ids); `title` value = `KeyEquation.title` (rename from stub's `label`); `anchor === slug` for equations (documented invariant; not Zod-refined since the extractor controls both). |
| 3 | Body fields | `body` = full pre-rendered HTML (mdast → hast → html on the full KeyEquation children; matches `DefinitionEntry.body` shape). `tex` = raw TeX source of the FIRST `$$` block in the body (extracted from the math node's `value` attribute). |
| 4 | EqRef popover | Renders `title` + KaTeX `tex` via `katex.renderToString(tex, { displayMode: true, throwOnError: false })`. Click navigates to `/chapters/{chapter}#{anchor}`. Structured `variables` deferred. |
| 5 | One-KE = one-entry | Multiple `$$` blocks in one `<KeyEquation>` stay in `body` as derivation forms; only the first becomes `tex`. Authors split into separate `<KeyEquation>` blocks when a form deserves first-class identity. |
| 6 | Index scope | Only `<KeyEquation>` blocks feed `equations`. Inline `$x$` and bare `$$...$$` stay unindexed (the latter is illustrative; PR-C4+ may add an audit hint, deferred). |
| 7 | Sort defaults | `<ChapterEquations />` alphabetical default + `order="appearance"` opt-in (mirrors `<ChapterGlossary />`). `<CourseEquations />` chapter-order default + `order="alphabetical"` opt-in (DIVERGES from `<CourseGlossary />` per the brainstorm Q7 rationale: equation lookup is topic/chapter-anchored). |
| 8 | Audit invariants here | None elevated to build errors in PR-C2 itself; the extractor THROWS on intra-chapter slug collision (defense in depth, matches PR-C1's pattern) and on `<KeyEquation>` with zero `$$` blocks. The systematic invariants E1/E2/E4/E6 land in PR-C4 alongside definitions' invariants 4/5. |
| 9 | AI surface | No AI-specific schema fields in v1. `tex` + `body` give the four ADR 0030 AI roles enough surface. |
| 10 | KaTeX dependency | Add `katex@^0.16` + `@types/katex@^0.16` as direct deps of `@sophie/components`. Currently transitive via `rehype-katex` in `@sophie/astro`; promoting to direct is honest with pnpm strict-mode (confirmed in-thread 2026-05-13). |
| 11 | React store location | `equations-store.ts` co-located in `packages/components/src/components/EqRef/`. Mirrors the PR-C1 pattern (`definitions-store.ts` in `GlossaryTerm/`). When a third role's React store ships in PR-C3, revisit whether to promote shared store infrastructure to a `runtime/` subpath — designing with 3 concrete shapes in hand beats speculating now (confirmed in-thread 2026-05-13). |
| 12 | EqRef trigger icon | `Sigma` from `lucide-react` (`Σ`, math/sum convention; cross-discipline-neutral; visually distinct from GlossaryTerm's `BookOpen`). Presentational (`aria-hidden`); the link text is the accessible name. Continues PR-C1's pedagogy-side Lucide adoption per ADR 0039 (confirmed in-thread 2026-05-13). |
| 13 | EqRef rendering mode + auto-label | **Dual mode** — `<EqRef slug="X" />` (self-closing) renders `"Eq. {entry.number}"` (per-chapter only; e.g. "Eq. 1"); `<EqRef slug="X">custom text</EqRef>` renders the children verbatim. Both forms render the same popover. **Chapter-index resolution deferred** to multi-chapter scale — migration when needed is render-time-only in `EqRef.tsx` (no data or authoring change). Single-chapter smoke target renders "Eq. 1" / "Eq. 2"; reads naturally (confirmed in-thread 2026-05-13). |

Locked patterns inherited (cite, don't re-litigate): ADRs 0001–0034,
0036 (factory), 0037 (cross-bundle observation — not triggered),
0038 (this PR is the second instance), 0039 (Lucide two-adapter —
EqRef is the second pedagogy-side consumer).

## API design

### `@sophie/core/src/schema/pedagogy-index.ts` — diff

```ts
// BEFORE (PR-C1 stub):
export const EquationEntrySchema = z.object({
  slug: Slug,
  label: NonEmptyString,
  number: z.number().int().positive().optional(),
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
});

// AFTER (PR-C2):
export const EquationEntrySchema = z.object({
  /** Canonical slug = KeyEquation.id prop. Author-explicit, no auto-derivation. */
  slug: Slug,
  /** Human-readable name = KeyEquation.title prop. */
  title: NonEmptyString,
  /** Per-chapter sequential number, assigned by the extractor at appearance order. REQUIRED. */
  number: z.number().int().positive(),
  /** Raw TeX source of the FIRST $$...$$ block in the KeyEquation body. Powers EqRef KaTeX popover, LaTeX export, symbol search, AI dim-analysis. */
  tex: NonEmptyString,
  /** Pre-rendered HTML of the full KeyEquation body (matches DefinitionEntry.body shape). Consumers embed via `set:html`. */
  body: z.string(),
  /** Chapter slug containing the source KeyEquation. */
  chapter: Slug,
  /** DOM id on the source <section>; back-link target. Invariant: anchor === slug for equations. */
  anchor: NonEmptyString,
});
export type EquationEntry = z.infer<typeof EquationEntrySchema>;
```

Changes: rename `label` → `title`; make `number` required; add new
required field `tex` (NonEmptyString — empty TeX means the
KeyEquation had no `$$` block, which is a categorization error
the extractor catches before constructing the entry).

### `@sophie/astro/src/lib/pedagogy-index-extractor.ts` — additions

The existing module structure is preserved; new exports + internals
added alongside the definition machinery.

```ts
// New imports (alongside existing):
import { type EquationEntry } from "@sophie/core/schema";

// Extend AsideAttributes-like reader for KeyEquation:
interface KeyEquationAttributes {
  id?: string;
  title?: string;
}

function readKeyEquationAttributes(node: MdxJsxFlowElement): KeyEquationAttributes {
  const out: KeyEquationAttributes = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (typeof attr.value !== "string") continue;
    if (attr.name === "id") out.id = attr.value;
    if (attr.name === "title") out.title = attr.value;
  }
  return out;
}

/**
 * Extract the raw TeX source of the FIRST `$$...$$` math block in
 * a KeyEquation's children. Walks the children subtree via
 * `unist-util-visit`, returns the `value` of the first `math` node
 * (display math; mdast type from `remark-math`). Returns `null`
 * when no math node exists — caller treats this as the E6
 * categorization error.
 *
 * `math` is the remark-math AST node type for `$$...$$` blocks;
 * `inlineMath` (for `$x$`) is deliberately ignored.
 */
function extractFirstTex(children: ReadonlyArray<unknown>): string | null {
  let found: string | null = null;
  const synthetic = { type: "root" as const, children: children as never };
  visit(synthetic, "math", (node: { value?: string }) => {
    if (found !== null) return false;          // short-circuit on first hit
    if (typeof node.value === "string" && node.value.trim().length > 0) {
      found = node.value;
      return false;
    }
    return undefined;
  });
  return found;
}

/**
 * Pure extractor. Walks an mdast tree, finds JSX elements named
 * "KeyEquation", returns one EquationEntry per match with
 * extractor-assigned `number` (per-chapter sequential, starting at
 * 1, in source order). Throws when:
 *
 *   - A KeyEquation is missing a non-empty `id` or `title` (the
 *     KeyEquation Zod props schema already catches this at the
 *     component layer; this is defense in depth inside the
 *     extractor — mirrors `extractDefinitions`'s explicit guard).
 *   - A KeyEquation contains zero `$$` math blocks (E6
 *     categorization error: should be a Callout, not a KeyEquation).
 *   - Two KeyEquations in the same chapter slug to the same anchor
 *     (intra-chapter slug collision; matches definitions' pattern).
 */
export function extractEquations(
  tree: Root,
  chapterSlug: string
): EquationEntry[] {
  const out: EquationEntry[] = [];
  const seenSlugs = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (el.name !== "KeyEquation") return;
    const attrs = readKeyEquationAttributes(el);

    const id = attrs.id?.trim();
    const title = attrs.title?.trim();
    if (!id) {
      throw new Error(
        `<KeyEquation> in chapter "${chapterSlug}" is missing a non-empty \`id\`.`
      );
    }
    if (!title) {
      throw new Error(
        `<KeyEquation id="${id}"> in chapter "${chapterSlug}" is missing a non-empty \`title\`.`
      );
    }

    const slug = slugify(id);
    if (seenSlugs.has(slug)) {
      throw new Error(
        `Intra-chapter slug collision in chapter "${chapterSlug}": slug "${slug}" is generated by more than one <KeyEquation>. Resolution: change one of the \`id\` props.`
      );
    }
    seenSlugs.add(slug);

    const tex = extractFirstTex(el.children);
    if (tex === null) {
      throw new Error(
        `<KeyEquation id="${id}"> in chapter "${chapterSlug}" contains no \`$$...$$\` math block. Categorization error: KeyEquation must lead with the canonical equation. Resolution: add a \`$$...$$\` block as the first math content, or convert to a <Callout>.`
      );
    }

    counter += 1;
    out.push({
      slug,
      title,
      number: counter,
      tex,
      body: renderChildrenToHtml(el.children),
      chapter: chapterSlug,
      anchor: slug,
    });
  });

  return out;
}

// Extend GlobalIndexState:
interface GlobalIndexState {
  definitions: Map<string, DefinitionEntry>;
  equations: Map<string, EquationEntry>;     // NEW
}

function getGlobalState(): GlobalIndexState {
  const g = globalThis as { [GLOBAL_KEY]?: GlobalIndexState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      definitions: new Map(),
      equations: new Map(),                  // NEW
    };
  }
  return g[GLOBAL_KEY];
}

// Extend IndexAccumulator:
class IndexAccumulator {
  clearChapter(chapterSlug: string): void {
    const state = getGlobalState();
    for (const [slug, entry] of state.definitions) {
      if (entry.chapter === chapterSlug) state.definitions.delete(slug);
    }
    for (const [slug, entry] of state.equations) {            // NEW
      if (entry.chapter === chapterSlug) state.equations.delete(slug);
    }
  }

  addDefinitions(entries: ReadonlyArray<DefinitionEntry>): void { /* unchanged */ }

  /**
   * NEW. Add a chapter's extracted equations. Throws on cross-
   * chapter slug collision (audit invariant E1, defense in depth
   * here; PR-C4 ships the systematic invariant).
   */
  addEquations(entries: ReadonlyArray<EquationEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const existing = state.equations.get(entry.slug);
      if (existing && existing.chapter !== entry.chapter) {
        throw new Error(
          `Equation "${entry.title}" (slug "${entry.slug}") is defined in multiple chapters: "${existing.chapter}" and "${entry.chapter}". Resolution: change one of the \`id\` props.`
        );
      }
    }
    for (const entry of entries) {
      state.equations.set(entry.slug, entry);
    }
  }

  asPedagogyIndex(): PedagogyIndex {
    const state = getGlobalState();
    return {
      definitions: Array.from(state.definitions.values()),
      equations: Array.from(state.equations.values()),         // CHANGED
      keyInsights: [],
      figures: [],
      misconceptions: [],
    };
  }
}
```

Extend the remark plugin to call both extractors per chapter:

```ts
export function pedagogyIndexRemarkPlugin(
  options: PedagogyIndexRemarkPluginOptions = {}
): (tree: Root, file: VFileLike) => void {
  const getChapterSlug = options.getChapterSlug ?? defaultGetChapterSlug;

  return (tree: Root, file: VFileLike) => {
    const filePath = file.path;
    if (!filePath) return;
    const chapterSlug = getChapterSlug(filePath);
    if (!chapterSlug) return;

    indexAccumulator.clearChapter(chapterSlug);
    indexAccumulator.addDefinitions(extractDefinitions(tree, chapterSlug));
    indexAccumulator.addEquations(extractEquations(tree, chapterSlug));   // NEW
  };
}
```

### `@sophie/astro/src/components/ChapterEquations.astro`

```astro
---
import type { EquationEntry } from "@sophie/core/schema";
import { indexAccumulator } from "../lib/pedagogy-index-extractor";

const { equations } = indexAccumulator.asPedagogyIndex();

/**
 * `<ChapterEquations chapter="..." order="..." />` — Astro consumer
 * of the build-time pedagogy index (ADR 0038). Renders the chapter's
 * key equations as a `<dl>`. Mirrors `<ChapterGlossary>`'s shape:
 * alphabetical default, `order="appearance"` opt-in (per overview
 * decision #12; ChapterEquations follows the chapter-consumer rule).
 *
 * Bodies pre-rendered HTML; embedded via `set:html`. Pure Astro;
 * no client JS.
 */
export interface Props {
  chapter: string;
  order?: "alphabetical" | "appearance";
  heading?: string;
}

const { chapter, order = "alphabetical", heading } = Astro.props;

const inChapter: EquationEntry[] = equations.filter(
  (e) => e.chapter === chapter
);

const sorted =
  order === "alphabetical"
    ? [...inChapter].sort((a, b) => a.title.localeCompare(b.title))
    : [...inChapter].sort((a, b) => a.number - b.number);
---

{heading && <h2 class='sophie-chapter-equations__heading'>{heading}</h2>}
{
  sorted.length === 0 ? (
    <p class='sophie-chapter-equations__empty'>No key equations in this chapter yet.</p>
  ) : (
    <dl class='sophie-chapter-equations' data-sophie-chapter-equations=''>
      {sorted.map((entry) => (
        <Fragment>
          <dt id={`eq-${entry.slug}`} class='sophie-chapter-equations__term'>
            <span class='sophie-chapter-equations__number'>Eq. {entry.number}</span>
            <span class='sophie-chapter-equations__title'>{entry.title}</span>
          </dt>
          <dd class='sophie-chapter-equations__body' set:html={entry.body} />
        </Fragment>
      ))}
    </dl>
  )
}
```

### `@sophie/astro/src/components/CourseEquations.astro`

```astro
---
import type { EquationEntry } from "@sophie/core/schema";
import { indexAccumulator } from "../lib/pedagogy-index-extractor";

const { equations } = indexAccumulator.asPedagogyIndex();

/**
 * `<CourseEquations order="..." />` — full-textbook equation index.
 * Chapter-order default (per brainstorm Q7: equation lookup is
 * topic/chapter-anchored). `order="alphabetical"` opt-in.
 *
 * Diverges from `<CourseGlossary />`'s alphabetical-only; matches
 * print-textbook "Index of Equations" convention.
 */
export interface Props {
  order?: "chapter" | "alphabetical";
  heading?: string;
}

const { order = "chapter", heading } = Astro.props;

const sorted: EquationEntry[] =
  order === "alphabetical"
    ? [...equations].sort((a, b) => a.title.localeCompare(b.title))
    : [...equations].sort((a, b) =>
        a.chapter === b.chapter
          ? a.number - b.number
          : a.chapter.localeCompare(b.chapter)
      );
---

{heading && <h2 class='sophie-course-equations__heading'>{heading}</h2>}
<dl class='sophie-course-equations' data-sophie-course-equations=''>
  {sorted.map((entry) => (
    <Fragment>
      <dt id={`eq-${entry.slug}`} class='sophie-course-equations__term'>
        <span class='sophie-course-equations__number'>Eq. {entry.number}</span>
        <span class='sophie-course-equations__title'>{entry.title}</span>
      </dt>
      <dd class='sophie-course-equations__body'>
        <div set:html={entry.body} />
        <a class='sophie-course-equations__backlink'
           href={`/chapters/${entry.chapter}#${entry.anchor}`}>
          defined in <code>{entry.chapter}</code>
        </a>
      </dd>
    </Fragment>
  ))}
</dl>
```

### `@sophie/components/src/components/EqRef/equations-store.ts`

Mirrors `definitions-store.ts` exactly (script-tag id changes, type
changes, function names change; otherwise identical shape).

```ts
import type { EquationEntry } from "@sophie/core/schema";

const SCRIPT_ID = "sophie-pedagogy-equations";

let equationsBySlug: Map<string, EquationEntry> = new Map();
let hydratedFromScript = false;

function hydrateFromScriptTagIfPresent(): void {
  if (hydratedFromScript) return;
  if (typeof document === "undefined") return;
  const el = document.getElementById(SCRIPT_ID);
  const raw = el?.textContent;
  if (!raw) { hydratedFromScript = true; return; }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new TypeError(`Expected an array of EquationEntry; got ${typeof parsed}`);
    }
    const entries = parsed as ReadonlyArray<EquationEntry>;
    equationsBySlug = new Map(entries.map((e) => [e.slug, e]));
  } catch (err) {
    if (typeof process === "undefined" || process.env?.NODE_ENV !== "production") {
      console.error(
        "[EqRef] Failed to parse `sophie-pedagogy-equations` script payload; <EqRef> will fall back to bare prose for every lookup on this page.",
        err
      );
    }
  }
  hydratedFromScript = true;
}

export function __setEquations(entries: ReadonlyArray<EquationEntry>): void {
  hydratedFromScript = true;
  equationsBySlug = new Map(entries.map((e) => [e.slug, e]));
}

export function lookupEquation(slug: string): EquationEntry | undefined {
  hydrateFromScriptTagIfPresent();
  return equationsBySlug.get(slug);
}
```

### `@sophie/components/src/components/EqRef/EqRef.schema.ts`

```ts
import type { ReactNode } from "react";
import { z } from "zod";

export const EqRefPropsSchema = z.object({
  /** Canonical slug — matches an EquationEntry.slug in the pedagogy index. */
  slug: z.string().min(1),
  /** Optional custom link text. When omitted, renders `Eq. <number>`. */
  children: z.custom<ReactNode>().optional(),
});

export type EqRefProps = z.infer<typeof EqRefPropsSchema>;
```

### `@sophie/components/src/components/EqRef/EqRef.tsx`

```tsx
import * as HoverCard from "@radix-ui/react-hover-card";
import katex from "katex";
import { Sigma } from "lucide-react";
import { useMemo } from "react";
import type { EqRefProps } from "./EqRef.schema.ts";
import { lookupEquation } from "./equations-store.ts";
import styles from "./EqRef.module.css.js";

/**
 * `<EqRef slug="..." />` or `<EqRef slug="...">custom text</EqRef>` —
 * the equation analog of `<GlossaryTerm>`. PR-C2 first instance of
 * the inline equation cross-reference. Renders an inline anchor;
 * HoverCard exposes the title + KaTeX-rendered tex preview.
 *
 * Trigger text: when `children` is omitted, renders "Eq. {number}"
 * derived from the index entry. When `children` is provided,
 * renders the children verbatim (e.g. for in-prose mentions like
 * "see the inverse-square law"). Both forms render the same popover.
 *
 * On miss (no matching equation): renders children unchanged with
 * no anchor / popover; dev-only console.warn flags authoring drift.
 * PR-C4's audit invariant E4 elevates this to a build error.
 */
export function EqRef({ slug, children }: EqRefProps) {
  const entry = lookupEquation(slug);

  // KaTeX render must happen unconditionally per React rules-of-
  // hooks; the `entry?.tex ?? ""` guard keeps it safe when the
  // entry is missing.
  const texHtml = useMemo(() => {
    if (!entry?.tex) return "";
    return katex.renderToString(entry.tex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
  }, [entry?.tex]);

  if (!entry) {
    if (typeof process === "undefined" || process.env?.NODE_ENV !== "production") {
      console.warn(
        `[EqRef] No equation found for slug "${slug}". Rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  const href = `/chapters/${entry.chapter}#${entry.anchor}`;
  const linkText = children ?? `Eq. ${entry.number}`;

  return (
    <HoverCard.Root openDelay={150} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <a className={styles.trigger} href={href}>
          {linkText}
          <Sigma aria-hidden className={styles.icon} focusable={false} size={12} />
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          className={styles.popover}
          collisionPadding={8}
          data-sophie-equation-popover=''
          sideOffset={6}
        >
          <strong className={styles.title}>
            <span className={styles.number}>Eq. {entry.number}</span>
            {entry.title}
          </strong>
          <div
            className={styles.tex}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: tex is rendered by katex.renderToString from extractor-captured TeX source (not user-supplied content). ADR 0038 + design decision #10.
            dangerouslySetInnerHTML={{ __html: texHtml }}
          />
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
```

### `@sophie/components/src/components/EqRef/EqRef.contract.ts`

```ts
import type { ComponentContract } from "../../contract/types.ts";
import { type EqRefProps, EqRefPropsSchema } from "./EqRef.schema.ts";
import { EqRef } from "./EqRef.tsx";

// EqRef is content-only (read-only index lookup). No per-instance
// state. `state: null` mirrors KeyEquation's contract.
export const eqRefContract: ComponentContract<EqRefProps, null> = {
  Component: EqRef,
  schema: EqRefPropsSchema,
  serialize: (props) => ({ type: "eq-ref", props, state: null }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
```

### `TextbookLayout.astro` — extend the SSR→CSR transfer

The layout already populates the glossary store and emits a script
tag for definitions. Mirror the same pattern for equations:

```astro
---
// Existing imports + glossary wiring stays unchanged.
import { __setEquations, __setGlossaryDefinitions } from "@sophie/components";
import { indexAccumulator } from "../lib/pedagogy-index-extractor";

const chapters = await getCollection("chapters");
await Promise.all(chapters.map((c) => render(c)));
const pedagogy = indexAccumulator.asPedagogyIndex();

__setGlossaryDefinitions(pedagogy.definitions);
__setEquations(pedagogy.equations);                          // NEW

const pedagogyDefinitionsJson = JSON.stringify(pedagogy.definitions).replace(/</g, "\\u003c");
const pedagogyEquationsJson  = JSON.stringify(pedagogy.equations ).replace(/</g, "\\u003c");   // NEW
---

<script is:inline id='sophie-pedagogy-definitions' type='application/json' set:html={pedagogyDefinitionsJson} />
<script is:inline id='sophie-pedagogy-equations'   type='application/json' set:html={pedagogyEquationsJson} />   <!-- NEW -->
```

### `examples/smoke/src/pages/equations.astro`

```astro
---
import { CourseEquations, TextbookLayout } from "@sophie/astro";
---

<TextbookLayout>
  <h1>Equations</h1>
  <CourseEquations heading="Key Equations (by chapter)" />
</TextbookLayout>
```

## Files

### New

| Path | Purpose |
| --- | --- |
| `packages/astro/src/components/ChapterEquations.astro` | Per-chapter list consumer (alphabetical default + appearance opt-in) |
| `packages/astro/src/components/CourseEquations.astro` | Full-course list consumer (chapter-order default + alphabetical opt-in) |
| `packages/components/src/components/EqRef/EqRef.schema.ts` | Zod props schema |
| `packages/components/src/components/EqRef/EqRef.tsx` | React component (HoverCard + KaTeX) |
| `packages/components/src/components/EqRef/EqRef.contract.ts` | Component contract (`serialize`, `audit`) |
| `packages/components/src/components/EqRef/EqRef.module.css` | Scoped styles (trigger + popover + icon) |
| `packages/components/src/components/EqRef/EqRef.test.tsx` | Unit tests + axe |
| `packages/components/src/components/EqRef/EqRef.stories.tsx` | Storybook (imports `katex/dist/katex.min.css`) |
| `packages/components/src/components/EqRef/equations-store.ts` | Setter + lookup + script-tag auto-hydrate |
| `packages/components/src/components/EqRef/index.ts` | Barrel |
| `examples/smoke/src/pages/equations.astro` | `/equations` route |
| `examples/smoke/e2e/chapter-equations.spec.ts` | E2E |
| `examples/smoke/e2e/course-equations.spec.ts` | E2E |
| `examples/smoke/e2e/eq-ref.spec.ts` | E2E |

### Modified

| Path | Change |
| --- | --- |
| `packages/core/src/schema/pedagogy-index.ts` | `EquationEntrySchema` diff: rename `label`→`title`, make `number` required, add `tex` (NonEmptyString) |
| `packages/core/src/schema/pedagogy-index.test.ts` | Add equation schema tests (valid entry, missing-field rejections) |
| `packages/astro/src/lib/pedagogy-index-extractor.ts` | Add `extractEquations`, extend `IndexAccumulator` (`addEquations`, extend `clearChapter`, extend `asPedagogyIndex`), wire into remark plugin |
| `packages/astro/src/lib/pedagogy-index-extractor.test.ts` | Add equation extractor + accumulator tests |
| `packages/astro/src/components/TextbookLayout.astro` | Extend SSR→CSR transfer: `__setEquations` + `<script id="sophie-pedagogy-equations">` |
| `packages/components/src/index.ts` | Export `EqRef`, `EqRefPropsSchema`, `EqRefProps`, `__setEquations` |
| `packages/components/package.json` | Add `katex@^0.16`, `@types/katex@^0.16` (Decision #10) |
| `packages/components/.storybook/pedagogy-index-fixture.ts` | Extend the storybook fixture with sample `equations` entries |
| `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx` | Add 2 `<EqRef>` cites (one self-closing, one with children) for e2e fixture coverage |
| `pnpm-lock.yaml` | Lockfile re-resolution from the new direct deps |

### Deleted

None.

## Smoke chapter migration

Two `<EqRef>` cites added to `spoiler-alerts.mdx` for e2e fixture
coverage, one of each rendering mode:

| Cite | Location (approximate) | Mode | Renders as |
| --- | --- | --- | --- |
| `<EqRef slug="inverse-square-law" client:load />` | After the inverse-square-law KeyEquation block (~line 291), in the existing "Connection to Spoiler 2" prose | Self-closing | "Eq. 1" |
| `<EqRef slug="wiens-law" client:load>Wien's law</EqRef>` | In the Spoiler 6 prose around the Wien's-law KeyEquation (~line 1080–1085) where the chapter introduces the temperature–wavelength relationship | Children | "Wien's law" |

Both must use `client:load` so React hydration attaches the
HoverCard handlers (consistent with `<Predict>`,
`<ConfidenceCheck>`, `<InteractiveCallout>`, `<GlossaryTerm>`
already in the chapter MDX).

## TDD test list (~17 unit + ~8 e2e; iron law: failing test first)

| # | Test | Production code |
| --- | --- | --- |
| 1 | `EquationEntrySchema.parse({...})` accepts a valid entry with all required fields | `pedagogy-index.ts` schema diff |
| 2 | `EquationEntrySchema.safeParse(entry without number).success === false` | `number` required |
| 3 | `EquationEntrySchema.safeParse(entry with tex: "")` fails | `tex: NonEmptyString` |
| 4 | `EquationEntrySchema.safeParse(entry with title: "")` fails | `title: NonEmptyString` |
| 5 | `extractEquations(tree, "ch")` on a synthetic AST with one KeyEquation returns `[{slug, title, number: 1, tex, body, chapter: "ch", anchor: slug}]` | `extractEquations` |
| 6 | `extractEquations` extracts `tex` from the FIRST `$$` block when the body contains multiple `$$` blocks (only the first; subsequent forms stay in `body`) | `extractFirstTex` |
| 7 | `extractEquations` on three KeyEquations in chapter "ch" produces `number: 1, 2, 3` in source order | Per-chapter counter |
| 8 | Two KeyEquations with the same `id` in one chapter throw an intra-chapter collision error citing the chapter + slug | Defense-in-depth guard |
| 9 | A KeyEquation with NO `$$` block throws "no math content" / E6 categorization error | Defense-in-depth guard |
| 10 | `indexAccumulator.addEquations` validates the whole batch before mutating (cross-chapter collision in entry 2 leaves entry 1 unwritten) | Two-pass shape preserved from `addDefinitions` |
| 11 | `indexAccumulator.clearChapter("ch")` removes both definitions AND equations for `chapter === "ch"`; entries from other chapters stay | Extended `clearChapter` |
| 12 | `indexAccumulator.asPedagogyIndex()` returns populated `equations` array (was empty `[]` in PR-C1) | Extended `asPedagogyIndex` |
| 13 | `pedagogyIndexRemarkPlugin` parses a chapter and populates BOTH definitions AND equations | Extended remark plugin |
| 14 | `equations-store`: `__setEquations(entries)` followed by `lookupEquation(slug)` returns the entry | `equations-store.ts` |
| 15 | `equations-store`: hydrates from `<script id="sophie-pedagogy-equations">` on first lookup when no SSR setter was called (jsdom + injected script) | Script-tag auto-hydrate |
| 16 | `<EqRef slug="X">` renders HoverCard.Root → Trigger asChild → anchor with `href="/chapters/ch/#X"`; popover content includes "Eq. N" + title + a KaTeX-rendered display-math span | `EqRef.tsx` render |
| 17 | `<EqRef slug="X" />` (self-closing) renders link text "Eq. N"; `<EqRef slug="X">Wien's law</EqRef>` renders link text "Wien's law" | Children-vs-default branch |
| 18 | `<EqRef slug="nonexistent">{children}</EqRef>` (miss): renders children as plain text, no anchor, no popover, dev console.warn fires | Miss-fallback branch |
| 19 | `<EqRef>` axe-clean across all 4 view-mode + 2 theme combinations | Storybook test-runner + axe |
| 20 | **E2E**: smoke target build succeeds; `/equations` route renders | `examples/smoke/e2e/course-equations.spec.ts` |
| 21 | **E2E**: `/chapters/spoiler-alerts` renders `<ChapterEquations>` (if added — verify; otherwise verify the chapter's two KeyEquations render correctly post-extractor changes) | `chapter-equations.spec.ts` |
| 22 | **E2E**: `<CourseEquations />` default order = chapter-order ("spoiler-alerts" entries appear in number-1 → number-2 order); `<CourseEquations order="alphabetical" />` reorders to "Inverse-Square Law" before "Wien's Law" | `course-equations.spec.ts` |
| 23 | **E2E**: `<ChapterEquations order="appearance">` renders in number order (matches source order); default alphabetical reorders | `chapter-equations.spec.ts` |
| 24 | **E2E**: hovering `<EqRef slug="inverse-square-law" />` in the smoke chapter opens HoverCard; rendered KaTeX block is visible; popover dismisses on pointerleave / Escape | `eq-ref.spec.ts` (Playwright MCP) |
| 25 | **E2E**: clicking `<EqRef slug="inverse-square-law" />` navigates to `/chapters/spoiler-alerts#inverse-square-law`; the page scrolls to the KeyEquation block | `eq-ref.spec.ts` |
| 26 | **E2E**: `pnpm dev` HMR — edit a `<KeyEquation title>` in spoiler-alerts.mdx; verify the index updates within ~1s (Vite invalidates the virtual module + dev page re-renders) | `eq-ref.spec.ts` |
| 27 | **E2E**: bare-prose fallback — temporarily reference `<EqRef slug="does-not-exist">fake</EqRef>` from a fixture page; renders "fake" as plain text + a dev-mode console warning | `eq-ref.spec.ts` |

Unit-test budget target: **17 new vitest cases**
(schema ~4, extractor + accumulator ~9, equations-store ~2,
EqRef component ~2). Plus 8 e2e cases on top of PR-C1's ~85.

Plus a final regression sweep: full Playwright suite green
(~85 prior + ~8 new = ~93 green); existing 351-ish vitest cases
still green.

## Verification (superpowers:verification-before-completion)

Before opening the PR; all must be green with **zero biome warnings**:

```bash
pnpm install --frozen-lockfile      # validates lockfile (memory `feedback_pre_pr_lockfile_check`)
pnpm exec biome check .             # ZERO warnings + ZERO errors
pnpm exec turbo run typecheck       # all 6 workspace packages
pnpm exec turbo run test:unit       # ~351 prior + 17 new = ~368 green
pnpm exec turbo run build           # smoke target builds end-to-end
pnpm test:e2e                       # ~93 green
pnpm exec turbo run test --filter=@sophie/components  # Storybook + axe
```

E2E verification via Playwright MCP / browser:

1. `cd examples/smoke && pnpm dev`.
2. Navigate to `/chapters/spoiler-alerts`:
   - Both KeyEquations (`inverse-square-law`, `wiens-law`) render
     unchanged in the chapter body (no visual regression from PR-C1).
   - Inline `<EqRef slug="inverse-square-law" />` renders "Eq. 1"
     with the `Σ` icon; hovering shows HoverCard with the KaTeX-
     rendered equation; clicking navigates to the source anchor.
   - Inline `<EqRef slug="wiens-law">Wien's law</EqRef>` renders
     "Wien's law" with the icon; same popover behavior.
3. Navigate to `/equations`:
   - `<CourseEquations />` shows both entries in chapter-order
     ("spoiler-alerts" / Eq. 1 → Eq. 2).
   - Each entry has a "defined in spoiler-alerts" back-link that
     anchors to the source KeyEquation.
4. Light / dark / default / focused / wide all axe-clean
   (`<EqRef>` popover specifically: contrast against both
   backgrounds; HoverCard portal escapes the contextual stacking
   context cleanly).

## Out of scope (deferred)

- Audit invariants E1, E2, E4, E6 as systematic build errors —
  PR-C4. The extractor's defense-in-depth THROW for E2 and E6 is
  this PR's contribution; the systematic walk over the populated
  index lands later.
- `<ChapterEquations />` placement in the smoke chapter — adding
  a chapter-end equation summary is a content authoring decision,
  not a platform PR. If Anna wants it in the smoke target for
  visual verification of `<ChapterEquations />`, add a line to the
  bottom of `spoiler-alerts.mdx`; otherwise the e2e relies on a
  dedicated test page.
- Structured `variables?: Array<{symbol, definition}>` field +
  EqRef popover variable-defs render — deferred per brainstorm Q4.
- `forms: string[]` / `derives_from: Slug[]` schema fields —
  brainstorm Q5 YAGNI.
- `<CourseEquations />` faceting / grouping by topic — PR 7
  (faceted search) consumes the index for cross-role faceting.
- E5 orphan-equation WARNING and E7 KaTeX syntax-check
  invariants — deferred indefinitely per brainstorm Q8.
- AI-author hooks beyond `tex` + `body` (units, prerequisites,
  group families) — brainstorm Q9.

## References

- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) —
  the pattern this PR is the second instance of. PR-C2 inherits all
  four Revisions-section realities (globalThis, virtual-module
  bypass, script-tag SSR→CSR, HoverCard).
- [ADR 0039](../website/decisions/0039-lucide-two-adapter-convention.md) —
  Lucide two-adapter convention; `<EqRef>` is the second pedagogy-
  side consumer after `<GlossaryTerm>`.
- [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md) —
  AI-as-primary-author model; `tex` + `body` are the four roles'
  schema surface.
- [PR-C2 overview (this PR's parent)](./2026-05-13-pr-c2-equations-overview.md) —
  brainstorm-locked decisions; this design doc is its concrete
  expression.
- [PR-C1 design doc](./2026-05-13-pr-c1-glossary-index-design.md) —
  the precedent for shape (frontmatter, sections, TDD table,
  verification cadence).
- [PR #36](https://github.com/drannarosen/sophie/pull/36) — PR-C1
  baseline (the machinery PR-C2 extends).
- [`packages/components/src/components/KeyEquation/`](../../packages/components/src/components/KeyEquation/) —
  source primitive (Phase 0; unchanged).
- [Bucket C overview](./2026-05-13-bucket-c-pedagogy-index-overview.md) —
  parent design; equation row in the schema map.
