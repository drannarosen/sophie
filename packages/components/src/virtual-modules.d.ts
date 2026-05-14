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
