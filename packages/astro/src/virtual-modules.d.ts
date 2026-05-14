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
    FigureEntry,
    KeyInsightEntry,
    MisconceptionEntry,
  } from "@sophie/core/schema";

  export const definitions: ReadonlyArray<DefinitionEntry>;
  export const equations: ReadonlyArray<EquationEntry>;
  export const keyInsights: ReadonlyArray<KeyInsightEntry>;
  export const figures: ReadonlyArray<FigureEntry>;
  export const misconceptions: ReadonlyArray<MisconceptionEntry>;
}
