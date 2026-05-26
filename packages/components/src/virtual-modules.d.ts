/**
 * Type declarations for Sophie's Vite virtual modules. The Vite
 * plugin in `@sophie/astro` (per ADR 0038) produces these at build
 * time; TypeScript needs the declarations to typecheck consumers
 * that import them.
 */

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
