/**
 * Type declarations for Sophie's Vite virtual modules. The Vite
 * plugin in this package (ADR 0038) produces these at build time;
 * TypeScript needs the declarations to typecheck consumers that
 * import them (e.g. `<TextbookLayout>`'s frontmatter wiring the
 * glossary store).
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

declare module "virtual:sophie/figures" {
  import type { FigureRegistryEntry } from "@sophie/core/schema";

  /**
   * Consumer-supplied figure registry (a name-indexed map). Populated
   * by `defineSophieIntegration({ figures })` per ADR 0082; backed by
   * `figuresVirtualModule()` in `packages/astro/src/lib/`.
   */
  export const figures: Record<string, FigureRegistryEntry>;
}
