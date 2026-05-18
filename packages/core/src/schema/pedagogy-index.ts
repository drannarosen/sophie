import { z } from "zod";
import { AuditFindingSchema } from "./audit.ts";
import { BiographySchema } from "./equation-biography.ts";
import { EquationRegistryEntrySchema } from "./equation-registry.ts";
import { InterventionEntrySchema } from "./intervention.ts";
import { MultiRepIndexEntrySchema } from "./multirep.ts";
import { NonEmptyString, Slug } from "./primitives.ts";
import { ValidationSchema } from "./validation.ts";

/**
 * Pedagogy index — the build-time extraction surface declared by
 * ADR 0038. PR-C1 ships the `definition` role; other entry shapes
 * are declared up-front so the index's shape is locked across the
 * Bucket C PR sequence (PRs C2–C4 materialize the runtime
 * extractors).
 *
 * Canonical anchor prefix convention.
 *
 * Author-supplied identifiers (definitions, equations) use the prefix
 * the author writes. Auto-generated anchors (key-insights, figures,
 * misconceptions) use these short prefixes:
 *
 * | Role          | Prefix  | Source                                                    |
 * |---------------|---------|-----------------------------------------------------------|
 * | Definition    | `def-`  | author-supplied via title/id slug                         |
 * | Equation      | `eq-`   | author-supplied via id slug                               |
 * | Key insight   | `ki-`   | auto: `ki-${counter}`                                     |
 * | Figure        | `fig-`  | auto: `fig-${slug(name)}-${counter}`                      |
 * | Misconception | `misc-` | auto: `misc-${counter}` (auto only)                       |
 * | Chapter       | `ch-`   | passthrough chapter slug                                  |
 * | Objective     | `lo-`   | passthrough author id                                     |
 *
 * Authors can override any auto-generated anchor via explicit `id`
 * props on the source component. The anchor uniqueness invariants
 * (M1, M2, F5, etc.) apply regardless of source.
 */

/**
 * A canonical definition extracted from an `<Aside kind="definition"
 * title="...">` block in a chapter MDX source. Powers the chapter +
 * course glossary consumers, the `<GlossaryTerm>` inline reference,
 * and the audit's duplicate-term invariants.
 */
export const DefinitionEntrySchema = z.object({
  /** Canonical term (from <Aside title>). Required by Aside's Zod refinement. */
  term: NonEmptyString,
  /** URL-safe slug. Auto-generated from `term` via @sophie/core/schema/slugify, overridable via explicit <Aside id>. */
  slug: Slug,
  /** Pre-rendered HTML of the aside body. Embedded by consumers via `set:html`. May be empty. */
  body: z.string(),
  /** Chapter slug containing the source aside. */
  chapter: Slug,
  /** DOM id on the source <details> element; back-link target. */
  anchor: NonEmptyString,
});
export type DefinitionEntry = z.infer<typeof DefinitionEntrySchema>;

/**
 * An equation entry in the pedagogy index per ADR 0060. Mirrors the
 * registry frontmatter contract (`EquationRegistryEntrySchema`) — one
 * declaration per equation, sourced from `src/content/equations/<id>.mdx`.
 * Chapter-side data (which chapter cites this equation, in what order,
 * with what framing prose) lives on `EquationCitationEntrySchema` instead.
 *
 * The optional `biography` field is populated by the registry-body walker
 * (ADR 0046 §R8). Pre-ADR-0060, biographies were authored inline at
 * chapter `<KeyEquation>` callsites; post-ADR-0060, biographies live in
 * the registry MDX body and are extracted once per equation.
 */
export const EquationEntrySchema = EquationRegistryEntrySchema.extend({
  /**
   * Optional EquationBiography per ADR 0046 + 2026-05-17 design hardening.
   * Per-equation opt-in; audit invariants E7/E8/E9 only fire when
   * biography children are present. Surfaces the queryable epistemic layer
   * (`epistemicRole` on every prose sub-entry) that ADR 0058 §2 underwrites.
   * Storage moves from chapter-inline to registry MDX body per ADR 0046 §R8.
   */
  biography: BiographySchema.optional(),
}).strict();
export type EquationEntry = z.infer<typeof EquationEntrySchema>;

/**
 * A chapter-side citation of an equation registry entry per ADR 0060.
 * One entry per `<KeyEquation refId="..." />` callsite in chapter MDX.
 * Multiple citations of the same equation across chapters produce N entries;
 * the per-chapter `number` is assigned by the extractor at appearance order.
 *
 * The `framingHtml` field carries optional chapter-specific framing prose
 * from `<KeyEquation refId="...">` children — pre-rendered so the aggregator
 * can embed via `set:html`. The biography itself never lives on a citation;
 * it's resolved from the registry entry at render time via `refId`.
 */
export const EquationCitationEntrySchema = z
  .object({
    /** Chapter slug containing the citation. */
    chapter: Slug,
    /** Registry entry id this citation resolves to (R1 audit target). */
    refId: Slug,
    /** DOM id on the chapter-side `<section>`; back-link target. */
    anchor: NonEmptyString,
    /** Per-chapter sequential number, extractor-assigned at appearance order. */
    number: z.number().int().positive(),
    /** Pre-rendered chapter-specific framing prose from `<KeyEquation>` children. */
    framingHtml: z.string().optional(),
  })
  .strict();
export type EquationCitationEntry = z.infer<typeof EquationCitationEntrySchema>;

/**
 * A key-insight aside (`<Aside kind="key-insight">`) — extracted in
 * PR-C3. Shape locked here.
 */
export const KeyInsightEntrySchema = z.object({
  /** Optional human-readable title (from <Aside title>). NEW in PR-C3. */
  title: z.string().optional(),
  /** Pre-rendered HTML of the aside body. */
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
});
export type KeyInsightEntry = z.infer<typeof KeyInsightEntrySchema>;

/**
 * Registry entry for a figure asset (`<Figure name="..." />` registry
 * mode). The consumer app owns the registry source-of-truth in
 * `src/content/figures.ts`; the extractor never populates this
 * collection — TextbookLayout receives it as a prop and forwards it to
 * the figure-registry SSR setter.
 *
 * Per ADR 0001: figure asset data shape lives in `@sophie/core`. The
 * matching component-runtime types re-export from this module.
 */
export const FigureRegistryEntrySchema = z.object({
  /** Canonical figure name (registry key; flat namespace). */
  name: NonEmptyString,
  /** Image asset URL or local path. */
  src: NonEmptyString,
  /** Alt text for accessibility. */
  alt: NonEmptyString,
  /** Default caption (used when no per-usage override). */
  caption: z.string().optional(),
  /** Attribution / credit text. */
  credit: z.string().optional(),
  /** Optional intrinsic image width in CSS pixels. Forwarded to `<img width>` to reserve layout space and reduce CLS. */
  width: z.number().int().positive().optional(),
  /** Optional intrinsic image height in CSS pixels. Forwarded to `<img height>` to reserve layout space and reduce CLS. */
  height: z.number().int().positive().optional(),
});
export type FigureRegistryEntry = z.infer<typeof FigureRegistryEntrySchema>;

/**
 * Per-chapter usage record for a registry-mode `<Figure name="...">`.
 * Multi-chapter figures produce N usage entries; exactly one should be
 * canonical (default `false`; the extractor sets `true` when the author
 * passes the `canonical` JSX prop).
 */
export const FigureUsageEntrySchema = z.object({
  /** Registry key — must resolve to a FigureRegistryEntry at SSR merge time. */
  name: NonEmptyString,
  chapter: Slug,
  anchor: NonEmptyString,
  /** Per-chapter sequential number, extractor-assigned at appearance order. */
  number: z.number().int().positive(),
  /** Exactly one usage per name should be canonical. Default false set by extractor (not by schema); author opts in via `<Figure name="X" canonical />`. */
  canonical: z.boolean(),
  /** Optional caption override from `<Figure caption="...">` JSX prop; wins over registry caption. */
  captionOverride: z.string().optional(),
});
export type FigureUsageEntry = z.infer<typeof FigureUsageEntrySchema>;

/**
 * A misconception entry — extracted in PR-C3 from BOTH `<Aside
 * kind="misconception">` (length="short") and `<Callout
 * variant="misconception">` (length="long") source components. The
 * length discriminator is the source-component tag (ADR 0038's
 * role-aggregation principle in concrete form).
 *
 * Both source primitives expose an optional `title` prop; that prop
 * surfaces here as the optional `label` field.
 */
export const MisconceptionEntrySchema = z.object({
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
  /** "short" = from <Aside kind="misconception">; "long" = from <Callout variant="misconception">. */
  length: z.enum(["short", "long"]),
  /** Optional label — from Aside.title OR Callout.title (both source primitives' titles are optional). */
  label: z.string().optional(),
  /**
   * Misconception-graph fields (ADR 0044 Artifact 1).
   *
   * All four are optional. A misconception with no declared
   * relationships is a valid v1 entry; adding relationships is a
   * progressive enhancement. The audit reassembles the full graph
   * at build time from the union of chapter declarations.
   */
  /** Misconceptions that must be addressed in earlier chapters before this one. DAG; ordering-sensitive. Empty list (`[]`) is meaningful — declares "this is a root in the DAG." */
  prerequisite_misconceptions: z.array(NonEmptyString).optional(),
  /** Bidirectional siblings without ordering semantics. Two misconceptions that share conceptual structure or co-occur in student responses. */
  related_misconceptions: z.array(NonEmptyString).optional(),
  /** Notation Registry `concept.id`s this misconception attaches to (ADR 0043). Powers the reverse "misconceptions attached to this concept" index. */
  concept_refs: z.array(NonEmptyString).optional(),
  /** Disciplines this misconception applies to. Defaults to the discipline implied by the course's pedagogy contract. Useful for cross-field misconceptions. */
  discipline_scope: z.array(NonEmptyString).optional(),
});
export type MisconceptionEntry = z.infer<typeof MisconceptionEntrySchema>;

/**
 * A chapter entry — one per chapter in the consumer's Astro
 * `chapters` content collection. Populated at SSR-merge time by
 * `TextbookLayout` from `getCollection('chapters')`; never written by
 * the remark extractor (chapters are consumer-app-owned, like
 * `figureRegistry`). Powers `<ChapterRef>` hover-preview and the
 * `/objectives` course roll-up.
 */
export const ChapterEntrySchema = z.object({
  /** Chapter slug (matches the content-collection entry id). */
  slug: NonEmptyString,
  /** Human-readable chapter title. */
  title: NonEmptyString,
  /** Module slug — FK to `ModuleEntry.slug`. */
  module: NonEmptyString,
  /** Optional in-module ordering. Chapter order within a module is authoring-driven; absent => sort-stable insertion order. */
  order: z.number().int().nonnegative().optional(),
  /** Optional single-paragraph chapter description for hover-preview + roll-up cards. */
  description: z.string().optional(),
  /**
   * Chapter maturity (ADR 0051). Mirrors `ChapterSchema.status`.
   * Required so the audit's CS2 INFO finding (draft chapters present)
   * has a signal to read; routing-level draft-exclusion lives in
   * `@sophie/astro/lib/get-student-chapters.ts`.
   */
  status: z.enum(["draft", "review", "stable"]),
});
export type ChapterEntry = z.infer<typeof ChapterEntrySchema>;

/**
 * A module entry — one per top-level course module in the consumer's
 * Astro `modules` content collection. Populated at SSR-merge time from
 * `getCollection('modules')`. Modules are ordered (the course outline
 * is a sequence), so `order` is required — distinct from chapters,
 * where order within a module is optional.
 */
export const ModuleEntrySchema = z.object({
  /** Module slug (matches the content-collection entry id). */
  slug: NonEmptyString,
  /** Human-readable module title. */
  title: NonEmptyString,
  /** Required course-outline ordering. */
  order: z.number().int().nonnegative(),
  /** Optional single-paragraph module description. */
  description: z.string().optional(),
});
export type ModuleEntry = z.infer<typeof ModuleEntrySchema>;

/**
 * A learning-objective entry — extracted from `<Objective>` flow
 * elements nested inside `<LearningObjectives>` in chapter MDX. The
 * objective `id` is author-supplied and persists across edits (drives
 * the IndexedDB persistence key per ADR 0007); the extractor never
 * auto-generates it. Anchor convention: `lo-${id}` (passthrough).
 */
export const ObjectiveEntrySchema = z.object({
  /** Author-supplied stable id; survives edits to verb/body. */
  id: NonEmptyString,
  /** Pedagogical verb (e.g. "Recognize", "Understand", "Apply"). */
  verb: NonEmptyString,
  /** Pre-rendered HTML of the objective body. Consumers embed via `set:html`. */
  body: NonEmptyString,
  /** Chapter slug containing the source <Objective>. */
  chapter: NonEmptyString,
  /** DOM id; passthrough `lo-${id}`. */
  anchor: NonEmptyString,
});
export type ObjectiveEntry = z.infer<typeof ObjectiveEntrySchema>;

/**
 * Kind discriminator for inline-ref callsites. Mirrors the four
 * inline cross-ref components: `<GlossaryTerm>`, `<EqRef>`,
 * `<FigureRef>`, `<ChapterRef>`. The audit pass uses these to
 * detect undefined targets (D4, E4, F2, C1).
 */
export const InlineRefKindSchema = z.enum([
  "glossary-term",
  "eq-ref",
  "figure-ref",
  "chapter-ref",
]);
export type InlineRefKind = z.infer<typeof InlineRefKindSchema>;

/**
 * An inline-ref callsite — one record per occurrence of an inline
 * cross-ref in a chapter MDX source. Populated by the extractor so
 * the build-time audit pass can detect undefined targets (D4, E4,
 * F2, C1). Append-only by design: the same `refKey` referenced N
 * times yields N entries (useful for usage-count facets later).
 *
 * `refKey` is the looked-up identifier:
 *   - `glossary-term` → `<GlossaryTerm name="X">` → `X`
 *   - `eq-ref`        → `<EqRef slug="X">`       → `X`
 *   - `figure-ref`    → `<FigureRef name="X">`   → `X`
 *   - `chapter-ref`   → `<ChapterRef slug="X">`  → `X`
 */
export const InlineRefUsageEntrySchema = z.object({
  kind: InlineRefKindSchema,
  /** The looked-up name/slug; matched against the target collection. */
  refKey: NonEmptyString,
  /** Origin chapter slug — where the callsite lives. */
  chapter: NonEmptyString,
});
export type InlineRefUsageEntry = z.infer<typeof InlineRefUsageEntrySchema>;

/**
 * A contract document's validation block (ADR 0056) — one entry per
 * ADR or reference doc on disk. Populated by the contract-validations
 * extractor (`packages/astro/src/lib/validation-extractor.ts`); never
 * touched by the chapter MDX remark plugin. Powers audit invariants
 * V1–V7 (per-entry checks against the typed `Validation` block) and
 * is the source-of-truth surface for the eventual `/contracts/`
 * validation-status index page (PR 5).
 *
 * `validation` is optional because PR 6 reaches initial-pass coverage
 * incrementally; until every contract carries a block, V1/V2 surface
 * the gaps. PR 6 promotes V1/V2 from WARNING → ERROR once initial-
 * pass is complete.
 *
 * `lastRevisedDate` is the most recent ISO date parsed out of the
 * doc's Revisions section (canonical `**§N — YYYY-MM-DD —` or the
 * `## Revisions (YYYY-MM-DD — …)` H2-inline shape; mirrors the PR
 * #50 staleness detector). Powers the staleness signal in PR 5; left
 * here on the entry so the audit can surface staleness warnings
 * without re-parsing the source.
 */
export const ContractValidationEntrySchema = z.object({
  /** Repo-root-relative path (e.g. "docs/website/decisions/0001-platform-not-monorepo.md"). */
  path: NonEmptyString,
  /** Parsed validation block; undefined when the doc has no `validation:` frontmatter (V1/V2 fire). */
  validation: ValidationSchema.optional(),
  /** Most recent Revisions-section ISO date, or null if no Revisions section. */
  lastRevisedDate: z.string().nullable(),
});
export type ContractValidationEntry = z.infer<
  typeof ContractValidationEntrySchema
>;

/**
 * The full pedagogy index — one per build. Consumers read it via
 * the `virtual:sophie/pedagogy-index` module exposed by
 * @sophie/astro's Vite plugin.
 */
export const PedagogyIndexSchema = z.object({
  definitions: z.array(DefinitionEntrySchema).readonly(),
  equations: z.array(EquationEntrySchema).readonly(),
  /**
   * Per-chapter `<KeyEquation refId="..." />` citation entries per ADR 0060.
   * One entry per chapter-side callsite; the declaration data lives on
   * `equations[]`. Audit invariants R1 (dangling refId) and R2 (orphan
   * declaration) consume the citation/declaration cross-product. Defaults
   * to `[]` so consumer apps on the pre-registry path keep working through
   * the cutover.
   */
  equationCitations: z
    .array(EquationCitationEntrySchema)
    .readonly()
    .default([]),
  keyInsights: z.array(KeyInsightEntrySchema).readonly(),
  /** Consumer-app-owned asset data, forwarded into the index at SSR-merge time. */
  figureRegistry: z.array(FigureRegistryEntrySchema).readonly(),
  /** Per-chapter usage records, populated by the extractor (renamed from `figures` in PR-C3). */
  figureUsages: z.array(FigureUsageEntrySchema).readonly(),
  misconceptions: z.array(MisconceptionEntrySchema).readonly(),
  /** Consumer-app-owned chapter metadata, forwarded from `getCollection('chapters')`. */
  chapters: z.array(ChapterEntrySchema).readonly(),
  /** Consumer-app-owned module metadata, forwarded from `getCollection('modules')`. */
  modules: z.array(ModuleEntrySchema).readonly(),
  /** Per-chapter learning objectives, populated by the extractor. */
  objectives: z.array(ObjectiveEntrySchema).readonly(),
  /** Per-chapter inline-ref callsites — populated by the extractor for the audit pass. */
  inlineRefUsages: z.array(InlineRefUsageEntrySchema).readonly(),
  /**
   * Per-chapter MultiRep concept-binding entries (ADR 0043 +
   * 2026-05-17 design hardening). Populated by `extractMultiReps`;
   * consumed by audit invariants MR1–MR4/MR6 (and NR1–NR4 via the
   * Notation Registry loader, PR-δ). Defaults to `[]` so consumer
   * apps that don't author MultiRep bindings yet keep working.
   */
  multiReps: z.array(MultiRepIndexEntrySchema).readonly().default([]),
  /**
   * Per-chapter `<Intervention>` callsite entries (ADR 0044 +
   * 2026-05-17 design hardening). Populated by `extractInterventions`;
   * consumed by audit invariants MG3/MG4/I1/I2/I3 (PR-δ). Defaults to
   * `[]` so consumer apps that don't pair misconceptions with
   * interventions yet keep working unchanged.
   */
  interventions: z.array(InterventionEntrySchema).readonly().default([]),
  /**
   * Per-contract validation entries (ADR 0056). One entry per ADR
   * (`docs/website/decisions/*.md`) and per reference doc
   * (`docs/website/reference/*.md`). Powers audit invariants V1–V7
   * and the validation-status index page (PR 5). Defaults to `[]`
   * so consumer apps that don't wire the contract-validations
   * extractor keep working unchanged.
   */
  contractValidations: z
    .array(ContractValidationEntrySchema)
    .readonly()
    .default([]),
  /**
   * Findings surfaced by the contract-validations extractor itself —
   * specifically V0 (schema parse failure of a `validation:` block,
   * ERROR) and V8 (unknown key inside the `validation:` block, INFO).
   * Distinct from V1–V7 (audit-layer invariants on typed `Validation`)
   * because the extractor has access to the *raw* frontmatter shape
   * before schema-parsing, whereas the audit only sees already-typed
   * inputs. Flow into the audit report at the top of `runPedagogyAudit`
   * so all findings surface in one place. Defaults to `[]`.
   */
  extractorFindings: z.array(AuditFindingSchema).readonly().default([]),
});
export type PedagogyIndex = z.infer<typeof PedagogyIndexSchema>;
