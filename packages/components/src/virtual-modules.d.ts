/**
 * Type declarations for Sophie's Vite virtual modules. The Vite
 * plugin in `@sophie/astro` (per ADR 0038) produces these at build
 * time; TypeScript needs the declarations to typecheck consumers
 * that import them.
 */

/**
 * Minimal augmentation of Vite's `import.meta.env` so `utils/with-base.ts`
 * can read `import.meta.env.BASE_URL` (the consumer's Astro `base`,
 * replaced at the consumer's Vite build time for both the SSR render and
 * the client-island bundle) without pulling in `vite/client`'s DOM/HMR
 * ambient types — and without an `astro:*` import (ADR 0001 framework
 * purity). `import.meta.env` is a Vite primitive, not an Astro one.
 * Structurally compatible with Vite's own `ImportMetaEnv` (which also
 * declares `BASE_URL: string`), so no conflict when the consumer merges.
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

declare module "virtual:sophie/course-spec" {
  import type { CourseSpec } from "@sophie/core/schema";

  /**
   * Consumer's parsed `course.sophie.yaml`, or `null` when the
   * consumer hasn't authored a spec yet. Importers must handle the
   * null case explicitly (skip __setCourseSpec, skip the script
   * tag). Per the course-info projection design (2026-05-26).
   */
  export const courseSpec: CourseSpec | null;
}
