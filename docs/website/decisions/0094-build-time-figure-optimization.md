---
date: 2026-05-30T00:00:00.000Z
tags:
  - astro
  - images
  - performance
  - build
  - cli
status: accepted-design
---

# ADR 0094: Build-time figure optimization via `astro:assets`

:::{admonition} ADR metadata
- **Status**: accepted-design (implemented — **Approach A, single resolved
  registry**; see the [implementation note](#implementation-note-approach-a))
- **Deciders**: anna
:::

(implementation-note-approach-a)=
:::{admonition} Implementation note — Approach A (single resolved registry)
:class: important
During implementation the **two-module** design sketched below (a stringified
`virtual:sophie/figures` for the client **plus** a separate server-only
`virtual:sophie/figure-assets`) was superseded by **Approach A**: a *single*
`virtual:sophie/figures` module that exports **both** `figures` (resolved
metadata — for an optimized entry, `src`/`width`/`height` are baked from the
`astro:assets` binding, so every plain-string consumer like the FigureRef store
and Pagefind gets the hashed `_astro/` URL) **and** `figureAssets` (the live
`ImageMetadata`, server-only, for `<Picture>`). There is **no**
`virtual:sophie/figure-assets` module. Points 3–4 below are preserved as the
original rationale; the parenthetical *(Approach A: …)* notes record what
actually shipped. The name→file **convention** (point 2) was extracted to
`@sophie/core` (`resolveFigureFile` + `isFigureFile`) as the single authority
shared by the build codegen and the `sophie figures` CLI.
:::

## Context

The astr201 frontend design review (finding **F4** / handoff **B4**) found
`public/figures/` at **269 MB across 224 files** — raw originals up to **72 MB
at 11236 px** shipped to render a ~691 px column. Every figure `<img>` is served
**raw** (no `_astro/` optimization), has **no `srcset`** (≈5× linear over-fetch),
and carries **no `width`/`height`** (`aspect-ratio: auto` → Cumulative Layout
Shift as lazy images resolve). Alt text and captions are excellent — this is
purely a *delivery* problem.

It is **platform-shaped**: every Sophie consumer ships figure assets and hits
this. So the optimization machinery belongs in `@sophie/*`, runs automatically at
the consumer's build, and **never commits converted images** (they are ephemeral
build artifacts). Astro **6.3.7** ships native `astro:assets` (no `@astrojs/image`).

Verified current state (de-risks scope):
- The figures virtual module serializes the registry with `JSON.stringify` at
  config-parse — strings/numbers only, **cannot carry `ImageMetadata`**
  (`packages/astro/src/lib/figures-virtual-module.ts`).
- The React `<Figure>` renders a plain `<img src={withBase(src)}>` and is
  **framework-pure** (no `astro:*`) — it cannot import `astro:assets`
  (`packages/components/src/components/Figure/Figure.tsx`).
- `width`/`height` are **already optional** on `FigureRegistryEntrySchema`
  (`packages/core/src/schema/pedagogy-index-entries/figure.ts`) and emitted by
  `FigureSpecContent.astro` — but the React `<Figure>` / `ChapterFigures` /
  `CourseFigures` ignore them today.
- The **F4 "unused figure" audit already exists** (`orphans.ts:36-54`) — not duplicated.
- The consumer authors `src/content/figures.ts` (metadata; `src` a `public/` URL
  string today) and passes it to `defineSophieIntegration({ figures })`.

## Decision

**Build-time, ephemeral, responsive derivatives via `astro:assets`. The consumer
registry stays metadata-only; the platform owns all machinery.**

1. **Sources tracked, derivatives ephemeral.** Sane-sized masters live in the
   consumer's `src/figures/`; the build emits responsive WebP/AVIF derivatives
   into `dist/_astro/` (gitignored). Nothing converted is committed.

2. **Metadata-only registry; name→file by convention.** `FigureRegistryEntry`
   resolves its asset by registry key → `src/figures/<key>.<ext>` (any supported
   extension), with an optional explicit `file` override. The `src` URL-string
   field becomes optional (legacy/inline escape hatch). No new component API
   (registry-mode by `name`, inline-mode by `src`+`alt` per `Figure.contract.ts`).
   *(Implemented: the convention is `resolveFigureFile(entry, availableFiles)` and
   the supported-extension set is `isFigureFile(name)` — both in
   `@sophie/core/schema`, the single authority shared by the build codegen
   (`integration.ts` + `figures-virtual-module.ts`) and the CLI audit, so the two
   can never disagree about which master backs an entry.)*

3. **Platform codegen emits generated `import` statements.** At config-parse, the
   integration reads `<root>/src/figures/` via Node `fs` and the codegen emits
   **generated `import` statements** so Vite/`astro:assets` tracks + optimizes each
   asset:
   ```js
   import a0 from "/abs/<root>/src/figures/m51.png";       // ImageMetadata, Vite-tracked
   export const figureAssets = { "m51": a0, /* … */ };
   export const figures = { "m51": { name: "m51", alt: "…",
     src: a0.src, width: a0.width, height: a0.height } /* … */ };
   ```
   `ImageMetadata` **cannot** ride a `JSON.stringify`'d literal (the optimizer
   needs a live binding). *(Original design: split into a stringified
   `virtual:sophie/figures` for the client + a server-only
   `virtual:sophie/figure-assets`. **Approach A as shipped:** one
   `virtual:sophie/figures` module exporting both `figures` — with the optimized
   `_astro/` `src`/`width`/`height` baked from the binding so the FigureRef store
   and Pagefind read the optimized URL — and `figureAssets`, the live
   `ImageMetadata` for `<Picture>`.)* Both exports are **non-nullable
   `Record<…>`** (possibly empty when the consumer ships no `src/figures/` dir) —
   the `virtual:sophie/figures` shape, not `course-spec`'s `T | null`. `figures`
   is a *required* integration option (no "not authored yet" null), and no
   dispatcher route imports `figureAssets` (only `FigureImage.astro` does), so
   **R12 does not apply** (consistent with CLAUDE.md's R12 scope note listing
   `virtual:sophie/figures` as non-nullable / R12-exempt).

4. **Render via a new Astro `FigureImage.astro` wrapper.** It imports
   `figures`/`figureAssets` (from `virtual:sophie/figures`) + `astro:assets` and
   renders
   `<Picture formats={['avif','webp']} layout="constrained" … />` (or `<Image>`),
   yielding responsive `srcset` + `sizes` + intrinsic `width`/`height` (kills CLS)
   + `decoding="async"` (also closes review **F10**). It replicates the React
   `<Figure>`'s registry lookup, build-time figure numbering, and caption/credit
   overrides.

5. **Integration point: components-map override in the route (validated).** Astro
   MDX's `<Content components={{…}} />` accepts `.astro` components as values
   (Astro docs; confirmed for `render()` collection entries — Sophie's exact
   path). The route overrides the `Figure` key with the Astro wrapper:
   ```astro
   const components = { ...makeStaticComponents({ figures }), Figure: FigureImage };
   ```
   `FigureImage` is **static** (no client directive), so the precedent constraint
   ("the components map cannot carry *client directives*") does not apply, and the
   auto-import remark fallback is unnecessary. *(An empirical TDD test confirms
   this in Sophie's exact Astro 6.3.7 setup as the first implementation step.)*

6. **Inline mode stays an un-optimized passthrough.** `<Figure src alt>` (arbitrary
   src) keeps the plain React `<img>` escape hatch; registry mode is the optimized
   path. (W2-minimal — no speculative inline-asset resolution.)

   **All server-side image readers migrate to `figureAssets`.** A `src/figures/`
   master has **no public URL** (Astro does not serve `src/`), so `entry.src` is
   meaningless for an optimized figure. Every server-rendered image of a
   registry figure therefore resolves through `figureAssets`'
   `ImageMetadata.{src,width,height}` — not just the reading route's `<Figure>`,
   but also **`FigureSpecContent.astro`** (the `/library/figures/<name>/` page,
   today `<img src={withBase(entry.src)}>`) and **`ChapterLayout.astro`**'s
   pagination-pill thumbnails (`firstFigureThumbnailFor`). *(Implemented: a shared
   `FigureAsset.astro` is the single optimized-vs-legacy decision point — given a
   registry `name` it renders `<Picture>` from `figureAssets[name]`, else falls
   back to a legacy `<img src>`; the gallery readers route through it.)* `entry.src`
   survives **only** as the legacy/inline `public/` escape hatch and for Storybook
   fixtures (where `figureAssets` is absent and the React `<Figure>` registry
   path renders from the fixture's `src`).

7. **Track 2 — `sophie figures` CLI + audit.** A citty `figures` command
   (`packages/cli`) with two subcommands: (a) **downscale** oversized masters to
   **≤2560 px** long edge (~1.85× the largest displayed size; q90 WebP/JPEG/AVIF,
   PNG kept lossless; SVG/GIF skipped). It overwrites source masters, so it is
   **dry-run by default** and writes only with `--write`. (b) **check** for
   **orphan** assets (file, no registry entry) and **missing** assets (registry
   entry with no resolvable master and no legacy `src`) — filesystem checks the
   pure pedagogy-audit can't do. Both reuse `@sophie/core`'s `resolveFigureFile`
   so the audit and the build agree by construction. F4 (unused) already exists
   and is not duplicated.

   **Dependencies.** The CLI calls `sharp` directly → real `dependency` on
   `@sophie/cli`. It loads the consumer's `src/content/figures.ts` (TypeScript) via
   **`jiti`** so the registry imports on every node Astro supports (≥22.12), not
   only those with default-on type stripping (≥22.18/≥23.6) — a new `@sophie/cli`
   dependency. `sharp` placement follows Astro's own pattern (Astro declares it an
   `optionalDependency`): an **optional `peerDependency`** on `@sophie/astro` (a
   zero-install signal — the integration never imports it; the consumer's `astro`
   image service does) and a **direct dependency in the consumer** (robust against
   `optionalDependencies` silent-skip on a native-build failure; matches Astro's
   "run `pnpm add sharp`" guidance).

8. **CI image-cache persistence.** Cold builds run `sharp` over ~180 rasters ×
   widths × formats → persist Astro's image cache (`node_modules/.astro` / `.astro`)
   across CI runs to bound time + memory (CI already fights OOM).

## Rationale

- **Machinery in Sophie, consumers lean** (locked decision): a consumer drops a
  sane-sized source, references it by name, builds — Quarto-grade simplicity plus
  Sophie's interactive components. Platform codegen keeps `figures.ts` metadata-only.
- **`astro:assets` is the SoTA native path** on 6.3.7 — `<Picture layout="constrained">`
  gives `srcset`/`sizes`/intrinsic dims/AVIF+WebP/`decoding=async` with no bespoke
  pipeline. We're not reinventing image optimization.
- **The split is forced, not incidental** — `ImageMetadata` needs a live Vite
  binding; the client island is framework-pure. A server-only generated-import
  module is the only shape that carries it.
- **Structural, not patched** — populates the *existing* `width`/`height` schema
  fields the codebase already defined but never filled.

## Consequences

- **Positive.** Payload ↓ from ~269 MB toward tens of MB; CLS fixed; modern
  formats; F4 (audit) reused; F10 (decoding) closed; figure dims finally populated.
- **Cost.** New `sharp` (optional peer on `@sophie/astro`; direct on `@sophie/cli`
  + consumer) and `jiti` (`@sophie/cli`) dependencies. CI image-cache step
  required. A second export on `virtual:sophie/figures` (`figureAssets`,
  Approach A) + an Astro render wrapper (`FigureImage.astro`) + a route-level
  components override. **Three server-side readers migrate** to `figureAssets`
  (reading `<Figure>`, `FigureSpecContent.astro`, `ChapterLayout` thumbnails) — a
  bounded but real diff beyond the single route the render section first implied.
  The React `<Figure>` remains for inline mode + non-route contexts (Storybook),
  so two render paths coexist by design.
- **Consumer migration (deferred, astr201-side).** `sophie figures` downscales the
  oversized masters; move `public/figures/ → src/figures/`; switch `figures.ts` to
  metadata-only; rebuild. No bespoke consumer optimization code.

## References

- [ADR 0082 — Chapter layout extraction](./0082-chapter-layout-extraction.md) — the
  reading route + `ChapterLayout` that consume `virtual:sophie/figures`.
- [ADR 0092 — Base-path correctness](./0092-base-path-correctness.md) — `withBase`
  (inline-mode passthrough still routes through it).
- [ADR 0080 — Course-spec format](./0080-course-spec-format-v0-1.md) +
  [ADR 0058 — Epistemic component contract](./0058-epistemic-component-contract.md)
  — the figure registry's place in the schema.
- `packages/astro/src/lib/figures-virtual-module.ts` — the codegen (Approach A:
  one module, `figures` + `figureAssets`).
- `packages/core/src/schema/resolve-figure-file.ts` — `resolveFigureFile` +
  `isFigureFile`, the shared name→file / extension authority.
- `packages/cli/src/commands/figures.ts` + `lib/{diff-figures,plan-downscale,load-figure-registry}.ts`
  — the `sophie figures` CLI (jiti registry load; sharp downscale).
- `packages/components/src/components/Figure/Figure.tsx` — the framework-pure React
  `<Figure>` (inline escape hatch).
- Always-register virtual-module pattern — `figureAssets` follows the
  non-nullable `virtual:sophie/figures` shape (possibly-empty object), so **R12**
  (dispatcher null-narrowing, for `T | null` exports) does **not** apply.
