import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * Inline-content pedagogy entries — definitions, key-insights,
 * misconceptions. The three roles share an authoring shape (extracted
 * from `<Aside kind="X">` flow elements with optional title/id and
 * required body) and live together so the AI-authoring template
 * surface is one file.
 *
 * ADR 0058 §2 (epistemic component contract) covers all three:
 *   - definition  → observable / inference (terminological grounding)
 *   - key-insight → inference (the "so what" of a chapter)
 *   - misconception → uncertainty (the durable wrong-model alert)
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
