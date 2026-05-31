/**
 * Type declarations for Sophie's Vite virtual modules. The Vite
 * plugin in this package (ADR 0038) produces these at build time;
 * TypeScript needs the declarations to typecheck consumers that
 * import them (e.g. `<TextbookLayout>`'s frontmatter wiring the
 * glossary store).
 */

/**
 * Minimal augmentation of Vite's `import.meta.env` so `lib/with-base.ts`
 * can read `import.meta.env.BASE_URL` (the consumer's Astro `base`,
 * replaced at the consumer's Vite build time) without pulling in
 * `vite/client`'s DOM/HMR ambient types. Structurally compatible with
 * Vite's own `ImportMetaEnv` (which also declares `BASE_URL: string`),
 * so no conflict when the consumer's build merges the two.
 */
interface ImportMetaEnv {
  readonly BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:sophie/pedagogy-index" {
  import type {
    DefinitionEntry,
    EquationEntry,
    FigureRegistryEntry,
    FigureUsageEntry,
    KeyInsightEntry,
    MisconceptionEntry,
  } from "@sophie/core/schema";

  export const definitions: ReadonlyArray<DefinitionEntry>;
  export const equations: ReadonlyArray<EquationEntry>;
  export const keyInsights: ReadonlyArray<KeyInsightEntry>;
  export const figureRegistry: ReadonlyArray<FigureRegistryEntry>;
  export const figureUsages: ReadonlyArray<FigureUsageEntry>;
  export const misconceptions: ReadonlyArray<MisconceptionEntry>;
}

declare module "virtual:sophie/figures" {
  import type { FigureRegistryEntry } from "@sophie/core/schema";
  import type { ImageMetadata } from "astro";

  /**
   * Consumer-supplied figure registry (a name-indexed map). Populated
   * by `defineSophieIntegration({ figures })` per ADR 0082; backed by
   * `figuresVirtualModule()` in `packages/astro/src/lib/`.
   *
   * Per ADR 0094 (Approach A): for an **optimized** entry (master in
   * `src/figures/`), `src`/`width`/`height` are the build-resolved
   * `astro:assets` values (hashed `_astro/` URL + intrinsic dims). This
   * is the map the SSR-setter → FigureRef store + accumulator → pagefind
   * paths read, so the optimized URL reaches every string consumer.
   */
  export const figures: Record<string, FigureRegistryEntry>;

  /**
   * Live `astro:assets` `ImageMetadata` for each optimized entry, keyed
   * by registry name (ADR 0094). Server-only; consumed by
   * `FigureImage.astro`'s `<Picture>` for full responsive `srcset`.
   * Non-nullable, possibly-empty (matches `figures`); legacy/inline
   * entries are absent. R12 (dispatcher null-narrowing) does not apply.
   */
  export const figureAssets: Record<string, ImageMetadata>;
}

declare module "virtual:sophie/course-spec" {
  import type { CourseSpec } from "@sophie/core/schema";

  /**
   * Consumer's parsed `course.sophie.yaml`. Populated by
   * `defineSophieIntegration` via `courseSpecVirtualModule()`. Always
   * registered — `null` when the consumer hasn't authored a spec yet
   * (TextbookLayout + chrome components handle null explicitly).
   * Course-info projection design (2026-05-26).
   */
  export const courseSpec: CourseSpec | null;
}

declare module "virtual:sophie/assignments" {
  import type { AssignmentRegistry } from "@sophie/core/schema";

  /**
   * Consumer's parsed `assignments.sophie.yaml`. Populated by
   * `defineSophieIntegration` via `assignmentsVirtualModule()`. Always
   * registered — `null` when the consumer hasn't authored a registry
   * yet (the Solutions reveal gate stays fail-closed for every
   * chapter). Gated-solutions design (ADR 0096, generalized in
   * Amendment 1).
   */
  export const assignments: AssignmentRegistry | null;
}
