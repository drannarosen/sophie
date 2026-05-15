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
import { toDefinitionRecord } from "./definitions.ts";
import { toEquationRecord } from "./equations.ts";
import { toFigureUsageRecord } from "./figure-usages.ts";
import { toKeyInsightRecord } from "./key-insights.ts";
import { toMisconceptionRecord } from "./misconceptions.ts";
import { toObjectiveRecord } from "./objectives.ts";

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

// Compile-time exhaustiveness: the registry's value types must satisfy
// the per-entity converter signatures, and the key set must match the
// PedagogyIndex entity-source keys (asserted in index.test.ts).
type ConverterRegistry = {
  definitions: EntityToPagefindRecord<DefinitionEntry>;
  equations: EntityToPagefindRecord<EquationEntry>;
  keyInsights: EntityToPagefindRecord<KeyInsightEntry>;
  figureUsages: EntityWithLookupToPagefindRecord<
    FigureUsageEntry,
    FigureRegistryEntry
  >;
  misconceptions: EntityToPagefindRecord<MisconceptionEntry>;
  objectives: EntityToPagefindRecord<ObjectiveEntry>;
};

export const converters = {
  definitions: toDefinitionRecord,
  equations: toEquationRecord,
  keyInsights: toKeyInsightRecord,
  figureUsages: toFigureUsageRecord,
  misconceptions: toMisconceptionRecord,
  objectives: toObjectiveRecord,
} as const satisfies ConverterRegistry;
