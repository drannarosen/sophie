export { type Chapter, ChapterSchema } from "./chapter.js";
export { type Figure, FigureSchema } from "./figure.js";
export { type Module, ModuleSchema } from "./module.js";
export { chaptersForModule } from "./module-nav.js";
export {
  type DefinitionEntry,
  DefinitionEntrySchema,
  type EquationEntry,
  EquationEntrySchema,
  type FigureEntry,
  FigureEntrySchema,
  type KeyInsightEntry,
  KeyInsightEntrySchema,
  type MisconceptionEntry,
  MisconceptionEntrySchema,
  type PedagogyIndex,
  PedagogyIndexSchema,
} from "./pedagogy-index.js";
export { LangTag, NonEmptyString, Slug } from "./primitives.js";
export { type Section, SectionSchema } from "./section.js";
export { slugify, slugifyWithCollisions } from "./slugify.js";
