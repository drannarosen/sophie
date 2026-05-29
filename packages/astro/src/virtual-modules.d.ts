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

  /**
   * Consumer-supplied figure registry (a name-indexed map). Populated
   * by `defineSophieIntegration({ figures })` per ADR 0082; backed by
   * `figuresVirtualModule()` in `packages/astro/src/lib/`.
   */
  export const figures: Record<string, FigureRegistryEntry>;
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
