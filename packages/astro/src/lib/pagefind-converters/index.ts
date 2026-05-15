import type {
  DefinitionEntry,
  EntityType,
  EquationEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  KeyInsightEntry,
  MisconceptionEntry,
  ObjectiveEntry,
} from "@sophie/core/schema";

export type { EntityType };

export type ChapterContext = {
  chapterTitle: string;
  moduleTitle: string;
  moduleSlug: string;
};

export type PagefindCustomRecord = {
  url: string;
  content: string;
  language: "en";
  meta: Record<string, string>;
  // Pagefind requires filter values to be arrays of strings even when
  // there's only one value (design doc §1 filter-value gotcha).
  // Record<string, string[]> compile-time-enforces the shape.
  filters: Record<string, string[]>;
};

export type EntityToPagefindRecord<Entity> = (
  entity: Entity,
  ctx: ChapterContext
) => PagefindCustomRecord;

// Figures join `FigureUsageEntry` (per-chapter usage) to
// `FigureRegistryEntry` (flat-namespace asset metadata) at convert
// time. Minimal extension of the base signature; only figures use
// it in v1.
export type EntityWithLookupToPagefindRecord<Entity, Lookup> = (
  entity: Entity,
  lookup: Lookup,
  ctx: ChapterContext
) => PagefindCustomRecord;

// One converter per entity-source key on the PedagogyIndex.
// Exhaustiveness is unit-tested in index.test.ts.
export const converters: {
  definitions: EntityToPagefindRecord<DefinitionEntry>;
  equations: EntityToPagefindRecord<EquationEntry>;
  keyInsights: EntityToPagefindRecord<KeyInsightEntry>;
  figureUsages: EntityWithLookupToPagefindRecord<
    FigureUsageEntry,
    FigureRegistryEntry
  >;
  misconceptions: EntityToPagefindRecord<MisconceptionEntry>;
  objectives: EntityToPagefindRecord<ObjectiveEntry>;
} = {
  definitions: null as never,
  equations: null as never,
  keyInsights: null as never,
  figureUsages: null as never,
  misconceptions: null as never,
  objectives: null as never,
};
