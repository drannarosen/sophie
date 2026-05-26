import type {
  ArtifactEntry,
  AuditFinding,
  CardEntry,
  ContractValidationEntry,
  DeepDiveEntry,
  DefinitionEntry,
  EquationCitationEntry,
  EquationEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  InlineRefUsageEntry,
  InterventionEntry,
  KeyInsightEntry,
  MisconceptionEntry,
  MultiRepIndexEntry,
  ObjectiveEntry,
  OMIFlowEntry,
  PedagogyIndex,
  RetrievalPromptEntry,
  SectionEntry,
  SkillReviewEntry,
  SpacedReviewEntry,
  TopicEntry,
  UnitEntry,
  WorkedExampleEntry,
} from "@sophie/core/schema";

/**
 * Cross-chapter accumulator — state lives on `globalThis` so it
 * survives across Vite environments within a single Astro build.
 *
 * Why globalThis instead of a module-level `Map`: Astro 6 / Vite 7
 * runs separate environments for client and SSR bundles. Each
 * environment has its own module-resolution graph, so a module-
 * level `new Map()` produces TWO independent maps in the same
 * Node process — one written by the MDX-parsing pass, the other
 * read by the page-rendering pass. `globalThis` is genuinely
 * per-process and bridges the environments. Observed during PR-C1
 * with a `pid` + accumulator-size trace.
 *
 * Per ADR 0038's role-aggregation principle. Future entry types
 * (equations, key-insights, figures, misconceptions) attach to
 * this same accumulator under their own collections; PR-C1 only
 * surfaces definitions.
 */
const GLOBAL_KEY = "__sophiePedagogyIndex";

interface GlobalIndexState {
  definitions: Map<string, DefinitionEntry>;
  /**
   * Registry-sourced equation declarations per ADR 0060. Keyed by
   * equation `id` (one entry per `src/content/equations/<id>.mdx`
   * file). NOT chapter-keyed — equations are registry-sourced post-
   * ADR-0060; chapter-side `<KeyEquation refId>` callsites live in
   * `equationCitations` instead.
   */
  equations: Map<string, EquationEntry>;
  /**
   * Per-unit `<KeyEquation refId>` citation callsites per ADR 0060.
   * Append-only array (mirrors `inlineRefUsages`); `clearUnitCitations`
   * filters out entries with the cleared chapter slug.
   */
  equationCitations: EquationCitationEntry[];
  keyInsights: Map<string, KeyInsightEntry>;
  figureUsages: Map<string, FigureUsageEntry>;
  misconceptions: Map<string, MisconceptionEntry>;
  /**
   * Consumer-supplied figure registry (two-tier model, PR-C3 decision
   * #3). Unlike the other collections, this is NOT populated by the
   * MDX extractor — `TextbookLayout` pushes it in via
   * `setFigureRegistry()` at SSR merge time after reading it from the
   * consumer's `content/figures.ts`. `<CourseFigures>` and
   * `<ChapterFigures>` then read it through `asPedagogyIndex()`
   * alongside `figureUsages` to resolve names → image src/alt/caption.
   */
  figureRegistry: ReadonlyArray<FigureRegistryEntry>;
  /**
   * Per-unit learning objectives (PR-C4). Keyed by
   * `${unit}#${anchor}` so different chapters can each declare an
   * objective with the same id (no semantic collision).
   */
  objectives: Map<string, ObjectiveEntry>;
  /**
   * Consumer-supplied sections collection (Wedge B-followup W1).
   * Populated from `getCollection('sections')`. Same shape as
   * `chapters` / `modules`: last-write-wins, consumer-global, NOT
   * touched by `clearUnit`. Per ADR 0067 + design doc D1.
   */
  sections: ReadonlyArray<SectionEntry>;
  /**
   * Consumer-supplied units collection (Wedge B-followup W1).
   * Populated from `getCollection('units')`. Each `UnitEntry` carries
   * `section_id` (parent ref) + `chapter` (reading binding) + optional
   * `lecture` (slides binding) per D7. Same `set*` semantics as
   * `sections`.
   */
  units: ReadonlyArray<UnitEntry>;
  /**
   * Consumer-supplied artifacts collection (Wedge B-followup W2).
   * Populated from `getCollection('artifacts')` per ADR 0067 +
   * design doc D1 (Path A). Discriminated union over `scope`
   * (`unit` | `section`); unit-scope variants carry `unit_id` +
   * `section_id`; section-scope variants carry `section_id` only.
   * Same `set*` semantics as `sections` / `units`: last-write-wins,
   * consumer-global, NOT touched by `clearUnit`.
   */
  artifacts: ReadonlyArray<ArtifactEntry>;
  /**
   * Per-unit inline-ref callsites (PR-C4). Append-only array
   * (NOT a Map) — the audit consumes the whole list and
   * usage-count facets care about callsite counts, not dedup'd keys.
   * `clearUnit` filters out entries with the cleared chapter slug.
   */
  inlineRefUsages: InlineRefUsageEntry[];
  /**
   * Per-contract validation entries (ADR 0056 PR 3). Populated by
   * `validation/extractor.ts` via `setContractValidations`. Last-write-
   * wins, consumer-global, NOT touched by `clearUnit` (mirrors
   * `figureRegistry` / `chapters` / `modules` — the contract files
   * are external to chapter MDX so the per-chapter clear pass
   * doesn't apply).
   */
  contractValidations: ReadonlyArray<ContractValidationEntry>;
  /**
   * Contract-validation findings (V0 + V8; ADR 0056 PR 3). Set
   * atomically with `contractValidations` via `setContractValidations`
   * (last-write-wins, consumer-global).
   */
  contractValidationFindings: ReadonlyArray<AuditFinding>;
  /**
   * Append-mode extractor findings emitted by per-file extractors
   * (e.g., topic extractor's PRA-2 orphan-body-card finding). Stored
   * separately from `contractValidationFindings` so the two sources
   * don't clobber each other regardless of call order; they
   * concatenate at `asPedagogyIndex` time into the canonical
   * `PedagogyIndex.extractorFindings` slot. Cleared per-topic by
   * `clearTopic` and per-chapter by `clearUnit`.
   */
  appendedExtractorFindings: AuditFinding[];
  /**
   * Per-unit `<MultiRep>` concept-binding entries (ADR 0043 +
   * 2026-05-17 design hardening). Keyed by `${unit}#${id}` so
   * different chapters can reuse the auto-derived `mr-<concept>`
   * anchor without collision. Populated by `extractMultiReps`;
   * consumed by audit invariants MR1–MR4/MR6 in PR-δ.
   */
  multiReps: Map<string, MultiRepIndexEntry>;
  /**
   * Per-unit `<Intervention>` entries (ADR 0044). Keyed by
   * `${unit}#${anchor}` so different chapters can reuse the same
   * `intervention-<type>-<idx>` anchor without collision. Populated by
   * `extractInterventions`; consumed by audit invariants MG3/MG4/I1/I2/I3
   * (PR-δ). Per-batch duplicates within a chapter trip the key
   * collision and throw — the extractor's sequential numbering makes
   * this impossible in practice, so the throw is a defense-in-depth
   * guard against future refactors.
   */
  interventions: Map<string, InterventionEntry>;
  /**
   * Per-unit `<Callout variant="deep-dive">` entries (ADR 0058
   * §R-deep-dive). Keyed by `${unit}#${anchor}` so two chapters
   * can each have a `dd-1` auto-anchor without collision. Populated
   * by `extractDeepDives`. The-more-you-know callouts intentionally
   * NOT tracked here.
   */
  deepDives: Map<string, DeepDiveEntry>;
  /**
   * Per-unit `<OMIFlow>` callsites (ADR 0063). Keyed by
   * `${unit}#${anchor}` so two chapters can each have an `omi-1`
   * auto-anchor without collision. Populated by `extractOMIFlows`.
   * One entry per callsite carries all three slot bodies — no
   * separate per-slot rows.
   */
  omiFlows: Map<string, OMIFlowEntry>;
  /**
   * Per-unit `<WorkedExample>` callsites (ADR 0081 + WS B+D). Keyed by
   * `${unit}#${anchor}` so two chapters can each have a `we-1`
   * auto-anchor without collision. Populated by `extractWorkedExamples`.
   * Consumed by WE-1 (units-at-every-step) and WE-2 (Problem + Result
   * completeness) invariants.
   */
  workedExamples: Map<string, WorkedExampleEntry>;
  /**
   * Per-unit `<RetrievalPrompt>` callsites (Wedge B1). Keyed by
   * `${unit}#${anchor}` so two chapters can each have an `rp-1`
   * auto-anchor without collision. Populated by
   * `extractRetrievalPrompts`. Consumed by RET-1 (retrieval-coverage
   * invariant).
   */
  retrievalPrompts: Map<string, RetrievalPromptEntry>;
  /**
   * Per-unit `<SpacedReview>` callsites (Wedge B1). Keyed by
   * `${unit}#${anchor}`. Populated by `extractSpacedReviews`.
   * Consumed by SR-1 (target_id / section_id ref-validity invariant).
   */
  spacedReviews: Map<string, SpacedReviewEntry>;
  /**
   * Per-unit `<SkillReview>` callsites (Wedge B1). Keyed by
   * `${unit}#${anchor}`. Populated by `extractSkillReviews`.
   * Consumed by PRA-1 (prereq-activation invariant).
   */
  skillReviews: Map<string, SkillReviewEntry>;
  /**
   * Topic entries (ADR 0079). Keyed by topic `id`. Populated by the
   * topic extractor at MDX-compile time from `src/content/topics/
   * <category>/<topic-id>.mdx` frontmatter. Cross-chapter scope —
   * `clearUnit` does NOT touch topics (registry-sourced like
   * equations per ADR 0060).
   */
  topics: Map<string, TopicEntry>;
  /**
   * Card entries (ADR 0079). Keyed by `${topic_id}#${id}` so cards
   * from different topics with the same card id don't collide.
   * Populated by the topic extractor from `<SkillReview.Card>` JSX
   * blocks in topic file bodies.
   */
  cards: Map<string, CardEntry>;
}

function getGlobalState(): GlobalIndexState {
  const g = globalThis as { [GLOBAL_KEY]?: GlobalIndexState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      definitions: new Map(),
      equations: new Map(),
      equationCitations: [],
      keyInsights: new Map(),
      figureUsages: new Map(),
      misconceptions: new Map(),
      figureRegistry: [],
      objectives: new Map(),
      sections: [],
      units: [],
      artifacts: [],
      inlineRefUsages: [],
      contractValidations: [],
      contractValidationFindings: [],
      appendedExtractorFindings: [],
      multiReps: new Map(),
      interventions: new Map(),
      deepDives: new Map(),
      omiFlows: new Map(),
      workedExamples: new Map(),
      retrievalPrompts: new Map(),
      spacedReviews: new Map(),
      skillReviews: new Map(),
      topics: new Map(),
      cards: new Map(),
    };
  }
  return g[GLOBAL_KEY];
}

class IndexAccumulator {
  /**
   * Drop all entries for a given chapter. Called by the remark
   * plugin before re-extracting a chapter (so re-parses don't
   * accumulate stale entries).
   */
  clearUnit(unitId: string): void {
    const state = getGlobalState();
    for (const [key, entry] of state.definitions) {
      if (entry.unit === unitId) {
        state.definitions.delete(key);
      }
    }
    // Post-ADR-0060: equations are registry-sourced (one declaration per
    // `src/content/equations/<id>.mdx`), NOT chapter-keyed. The chapter-
    // clear pass drops the chapter's citations instead — declarations
    // are managed by `clearEquations` (full registry reset) or by
    // re-running the registry walker which overwrites by `id`.
    state.equationCitations = state.equationCitations.filter(
      (c) => c.unit !== unitId
    );
    for (const [key, entry] of state.keyInsights) {
      if (entry.unit === unitId) {
        state.keyInsights.delete(key);
      }
    }
    for (const [key, entry] of state.figureUsages) {
      if (entry.unit === unitId) {
        state.figureUsages.delete(key);
      }
    }
    for (const [key, entry] of state.misconceptions) {
      if (entry.unit === unitId) {
        state.misconceptions.delete(key);
      }
    }
    for (const [key, entry] of state.objectives) {
      if (entry.unit === unitId) {
        state.objectives.delete(key);
      }
    }
    // Inline-ref usages are stored as a plain array (append-only). Filter
    // out the cleared chapter's entries. `chapters` and `modules` are
    // consumer-global (mirror `figureRegistry`) and are NOT touched here.
    state.inlineRefUsages = state.inlineRefUsages.filter(
      (u) => u.unit !== unitId
    );
    for (const [key, entry] of state.multiReps) {
      if (entry.unit === unitId) {
        state.multiReps.delete(key);
      }
    }
    for (const [key, entry] of state.interventions) {
      if (entry.unit === unitId) {
        state.interventions.delete(key);
      }
    }
    for (const [key, entry] of state.deepDives) {
      if (entry.unit === unitId) {
        state.deepDives.delete(key);
      }
    }
    for (const [key, entry] of state.omiFlows) {
      if (entry.unit === unitId) {
        state.omiFlows.delete(key);
      }
    }
    for (const [key, entry] of state.workedExamples) {
      if (entry.unit === unitId) {
        state.workedExamples.delete(key);
      }
    }
    for (const [key, entry] of state.retrievalPrompts) {
      if (entry.unit === unitId) {
        state.retrievalPrompts.delete(key);
      }
    }
    for (const [key, entry] of state.spacedReviews) {
      if (entry.unit === unitId) {
        state.spacedReviews.delete(key);
      }
    }
    for (const [key, entry] of state.skillReviews) {
      if (entry.unit === unitId) {
        state.skillReviews.delete(key);
      }
    }
    // Filter out any append-mode extractor findings whose location
    // points at this chapter so re-parses don't accumulate stale
    // findings. Findings without a `location.unit` survive (they're
    // not chapter-scoped); contractValidationFindings are managed
    // separately by `setContractValidations`.
    state.appendedExtractorFindings = state.appendedExtractorFindings.filter(
      (f) => f.location?.unit !== unitId
    );
  }

  /**
   * Add a chapter's extracted definitions. Per ADR 0086 a slug MAY be
   * defined in multiple chapters (deliberate cross-lecture reinforcement);
   * stored keyed by `${unit}#${slug}` so every chapter's own definition is
   * retained (mirrors figure usages keyed by `${unit}#${anchor}`). The
   * retained invariant mirrors F3: at most one chapter may mark a given
   * slug `canonical` (the one the `/library/glossary` room shows).
   * Intra-chapter slug collisions are caught upstream in `extractDefinitions`.
   */
  addDefinitions(entries: ReadonlyArray<DefinitionEntry>): void {
    const state = getGlobalState();
    // Two-pass: detect a cross-chapter multiple-canonical conflict BEFORE
    // mutating, so a batch that throws on entry N leaves 0..N-1 unwritten.
    const seenCanonicalSlugs = new Map<string, string>(); // slug -> unit
    for (const entry of entries) {
      if (!entry.canonical) continue;
      for (const existing of state.definitions.values()) {
        if (
          existing.slug === entry.slug &&
          existing.canonical &&
          existing.unit !== entry.unit
        ) {
          throw new Error(
            `Definition slug "${entry.slug}" ("${entry.term}") is marked canonical in multiple chapters: "${existing.unit}" and "${entry.unit}". Resolution: remove \`canonical\` from one of them.`
          );
        }
      }
      const prior = seenCanonicalSlugs.get(entry.slug);
      if (prior !== undefined && prior !== entry.unit) {
        throw new Error(
          `Definition slug "${entry.slug}" ("${entry.term}") is marked canonical in multiple chapters: "${prior}" and "${entry.unit}". Resolution: remove \`canonical\` from one of them.`
        );
      }
      seenCanonicalSlugs.set(entry.slug, entry.unit);
    }
    for (const entry of entries) {
      state.definitions.set(`${entry.unit}#${entry.slug}`, entry);
    }
  }

  /**
   * Add registry-sourced equation declarations per ADR 0060. One entry
   * per `src/content/equations/<id>.mdx` file. Keyed by `id`; last-write-
   * wins (re-parsing the same registry MDX overwrites). No cross-chapter
   * collision check because equations are no longer chapter-keyed —
   * each registry file's `id` is the canonical identifier.
   */
  addEquations(entries: ReadonlyArray<EquationEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.equations.set(entry.id, entry);
    }
  }

  /**
   * Drop ALL registry-sourced equation declarations (full reset). Called
   * when the equation registry is re-loaded wholesale (e.g., during HMR
   * after a registry-file deletion). Distinct from `clearUnit`, which
   * does NOT touch `equations` post-ADR-0060.
   */
  clearEquations(): void {
    const state = getGlobalState();
    state.equations.clear();
  }

  /**
   * Add a chapter's extracted `<KeyEquation refId>` citation entries per
   * ADR 0060. Append-only; the per-chapter clear path is
   * `clearUnitCitations(unitId)`.
   */
  addEquationCitations(entries: ReadonlyArray<EquationCitationEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.equationCitations.push(entry);
    }
  }

  /**
   * Drop a chapter's `<KeyEquation refId>` citations. Called by the
   * remark plugin's chapter pass before re-extracting (mirrors
   * `inlineRefUsages` clearing semantics).
   */
  clearUnitCitations(unitId: string): void {
    const state = getGlobalState();
    state.equationCitations = state.equationCitations.filter(
      (c) => c.unit !== unitId
    );
  }

  /**
   * Add a chapter's extracted key-insights. Key-insights are
   * chapter-local: anchors only need to be unique within a chapter
   * (intra-chapter collisions are caught by `extractKeyInsights`
   * before they reach the accumulator), so no cross-chapter
   * validation is required. Keyed by `${unit}#${anchor}` so two
   * different chapters can both have e.g. anchor "ki-1"
   * without collision.
   */
  addKeyInsights(entries: ReadonlyArray<KeyInsightEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.keyInsights.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted figure usages. F3 invariant (PR-C3
   * decisions row 10): exactly one canonical usage per figure name
   * across the whole textbook. Two-pass shape: detect any cross-
   * chapter multiple-canonical conflict BEFORE mutating, so a batch
   * that throws on entry N leaves entries 0..N-1 unwritten.
   *
   * Keyed by `${unit}#${anchor}`; multiple `<Figure name="X">`
   * usages in one chapter coexist via distinct auto-generated anchors
   * (`fig-x-1`, `fig-x-2`, ...).
   */
  addFigureUsages(entries: ReadonlyArray<FigureUsageEntry>): void {
    const state = getGlobalState();
    // Two-pass: detect cross-chapter multiple-canonical (F3) BEFORE
    // mutating. Also catches multiple canonical usages within the
    // SAME incoming batch by comparing against earlier entries already
    // queued for write.
    const seenCanonicalNames = new Map<string, string>(); // name -> chapter
    for (const entry of entries) {
      if (!entry.canonical) continue;
      // Compare against existing accumulator state.
      for (const existing of state.figureUsages.values()) {
        if (existing.name === entry.name && existing.canonical) {
          throw new Error(
            `F3 invariant: multiple <Figure name="${entry.name}" canonical /> usages — found in chapter "${existing.unit}" and chapter "${entry.unit}". Resolution: remove \`canonical\` from one of them.`
          );
        }
      }
      // Also detect within the incoming batch.
      const prior = seenCanonicalNames.get(entry.name);
      if (prior !== undefined && prior !== entry.unit) {
        throw new Error(
          `F3 invariant: multiple <Figure name="${entry.name}" canonical /> usages — found in chapter "${prior}" and chapter "${entry.unit}". Resolution: remove \`canonical\` from one of them.`
        );
      }
      seenCanonicalNames.set(entry.name, entry.unit);
    }
    for (const entry of entries) {
      state.figureUsages.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted misconceptions. M2 invariant (PR-C3
   * decisions row 10): explicit-id-derived anchors must be unique
   * across chapters. Auto-anchors of the shape `misc-${N}`
   * are inherently chapter-scoped (each chapter restarts its counter
   * at 1) and are NOT subject to the cross-chapter check — two
   * chapters can each have a `misc-1` without conflict.
   *
   * Two-pass shape: validate the whole batch BEFORE mutating, so a
   * collision in entry N leaves entries 0..N-1 unwritten (mirrors
   * `addDefinitions` / `addEquations` / `addFigureUsages`).
   *
   * Keyed by `${unit}#${anchor}` so the same anchor can coexist
   * across chapters when permitted (auto-anchors).
   *
   * Note on intra-batch dedup: unlike `addFigureUsages` (which guards
   * against same-name canonical figures within a single batch via
   * `seenCanonicalNames`), this method has no intra-batch check.
   * Safe because the batch is always single-chapter (see callsite
   * `indexAccumulator.addMisconceptions(extractMisconceptions(tree, slug))`)
   * and `extractMisconceptions` already enforces M1 (intra-chapter
   * anchor uniqueness) via `seenAnchors` before this method ever
   * runs. If the calling shape ever changes to multi-chapter batches,
   * mirror the `addFigureUsages` two-map pattern.
   */
  addMisconceptions(entries: ReadonlyArray<MisconceptionEntry>): void {
    const state = getGlobalState();
    // M2: cross-chapter slug collision check (only for EXPLICIT id-
    // derived anchors, not for auto-anchors which are chapter-scoped).
    for (const entry of entries) {
      // Match only the literal auto-anchor shape `misc-${counter}`.
      // `startsWith("misc-")` would also skip explicit ids like
      // `misc-orbital`, silently bypassing M2 cross-chapter validation.
      if (/^misc-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.misconceptions.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `Misconception slug "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". (M2 invariant.) Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.misconceptions.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Push the consumer-supplied figure registry into the accumulator
   * (two-tier model, PR-C3 decision #3). Unlike the other accumulator
   * setters, the registry doesn't come from an MDX walk — it comes
   * from the consumer's `content/figures.ts` via TextbookLayout's
   * `figureRegistry` prop. `<CourseFigures>` and `<ChapterFigures>`
   * read it back through `asPedagogyIndex()` to resolve figure names
   * to image src/alt/caption. Called from TextbookLayout's frontmatter
   * before the slot renders so consumers see a populated registry.
   */
  setFigureRegistry(entries: ReadonlyArray<FigureRegistryEntry>): void {
    const state = getGlobalState();
    state.figureRegistry = entries;
  }

  /**
   * Add a chapter's extracted objectives. Keyed by
   * `${unit}#${anchor}`; different chapters can each declare an
   * objective with the same `id` (no semantic collision at this layer
   * — chapter scope is part of the key). Single-chapter batch
   * invariant: `extractObjectives` already enforces O1 (duplicate-id-
   * within-chapter) via `seenIds`, mirroring `addMisconceptions`'s
   * comment. No cross-chapter id-collision check.
   */
  addObjectives(entries: ReadonlyArray<ObjectiveEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.objectives.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Push the consumer-supplied sections collection into the accumulator
   * (Wedge B-followup W1). Per ADR 0067 + design doc D1. Same shape as
   * `setFigureRegistry`: last-write-wins, consumer-global, NOT touched
   * by `clearUnit`. Called from `TextbookLayout.astro` frontmatter
   * once per build after `getCollection('sections')` resolves.
   */
  setSections(entries: ReadonlyArray<SectionEntry>): void {
    const state = getGlobalState();
    state.sections = entries;
  }

  /**
   * Push the consumer-supplied units collection into the accumulator
   * (Wedge B-followup W1). Per ADR 0067 + design doc D1 + D7. Same
   * shape as `setSections`.
   */
  setUnits(entries: ReadonlyArray<UnitEntry>): void {
    const state = getGlobalState();
    state.units = entries;
  }

  /**
   * Push the consumer-supplied artifacts collection into the
   * accumulator (Wedge B-followup W2). Per ADR 0067 + design doc D1.
   * Same shape as `setSections` / `setUnits`: last-write-wins,
   * consumer-global, NOT touched by `clearUnit`. Called from
   * `TextbookLayout.astro` frontmatter once per build after
   * `getCollection('artifacts')` resolves.
   */
  setArtifacts(entries: ReadonlyArray<ArtifactEntry>): void {
    const state = getGlobalState();
    state.artifacts = entries;
  }

  /**
   * Append a chapter's inline-ref callsites. Append-only — the audit
   * consumes the whole list and usage-count facets later care about
   * callsite counts, not dedup'd keys. `clearUnit` filters out
   * entries with the cleared chapter slug to keep re-parses idempotent.
   */
  addInlineRefUsages(entries: ReadonlyArray<InlineRefUsageEntry>): void {
    const state = getGlobalState();
    state.inlineRefUsages.push(...entries);
  }

  /**
   * Push the contract-validations extraction result into the
   * accumulator (ADR 0056 PR 3). Called from TextbookLayout's
   * frontmatter once per build after `extractContractValidations`
   * resolves. Mirrors `setFigureRegistry` / `setSections` /
   * `setUnits` / `setArtifacts` semantics: last-write-wins,
   * consumer-global, NOT touched by `clearUnit` (contract files
   * are external to chapter MDX). Both arrays are written atomically
   * so the audit always sees
   * a coherent {entries, findings} pair.
   */
  setContractValidations(
    entries: ReadonlyArray<ContractValidationEntry>,
    findings: ReadonlyArray<AuditFinding>
  ): void {
    const state = getGlobalState();
    state.contractValidations = entries;
    state.contractValidationFindings = findings;
  }

  /**
   * Add a chapter's extracted MultiRep bindings. Keyed by
   * `${unit}#${id}` so different chapters can reuse the auto-
   * derived `mr-<concept>` anchor without collision. Within-chapter
   * duplicate concept bindings (two `<MultiRep concept="x">` in one
   * chapter sharing an auto-anchor) trip the key collision and throw.
   * Cross-chapter same-concept bindings are valid by design (the
   * audit-time MR6 invariant handles cross-chapter equivalent_to
   * resolution; concept reuse across chapters is fine).
   */
  addMultiReps(entries: ReadonlyArray<MultiRepIndexEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const key = `${entry.unit}#${entry.id}`;
      const existing = state.multiReps.get(key);
      if (existing) {
        throw new Error(
          `MultiRep id collision: chapter "${entry.unit}" has two <MultiRep> bindings sharing anchor "${entry.id}" (concepts "${existing.concept}" and "${entry.concept}"). Resolution: change one of the \`id\` props.`
        );
      }
    }
    for (const entry of entries) {
      const key = `${entry.unit}#${entry.id}`;
      state.multiReps.set(key, entry);
    }
  }

  /**
   * Add a chapter's extracted `<Intervention>` entries (ADR 0044).
   * Keyed by `${unit}#${anchor}` so different chapters can reuse
   * the same `intervention-<type>-<idx>` anchor without collision.
   * Within-chapter duplicate anchors trip the key collision and throw
   * — the extractor's sequential numbering makes this impossible in
   * practice, so the throw is a defense-in-depth guard against future
   * refactors.
   */
  addInterventions(entries: ReadonlyArray<InterventionEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const key = `${entry.unit}#${entry.anchor}`;
      const existing = state.interventions.get(key);
      if (existing) {
        throw new Error(
          `Intervention anchor collision: chapter "${entry.unit}" has two <Intervention> blocks sharing anchor "${entry.anchor}". Resolution: this should never happen with sequential extractor numbering — file a bug.`
        );
      }
    }
    for (const entry of entries) {
      const key = `${entry.unit}#${entry.anchor}`;
      state.interventions.set(key, entry);
    }
  }

  /**
   * Add a chapter's extracted deep-dives. D2 invariant: explicit-id-
   * derived anchors must be unique across chapters. Auto-anchors of
   * the shape `dd-${N}` are chapter-scoped (each chapter restarts its
   * counter at 1) and are NOT subject to the cross-chapter check.
   *
   * Two-pass shape mirroring `addMisconceptions` (M2): validate the
   * whole batch BEFORE mutating so a collision in entry N leaves
   * entries 0..N-1 unwritten.
   *
   * Keyed by `${unit}#${anchor}` so the same anchor can coexist
   * across chapters when permitted (auto-anchors). The intra-chapter
   * uniqueness check (D1) lives in `extractDeepDives` before this
   * method ever runs.
   */
  addDeepDives(entries: ReadonlyArray<DeepDiveEntry>): void {
    const state = getGlobalState();
    // D2: cross-chapter slug collision check for EXPLICIT id-derived
    // anchors only. `/^dd-\d+$/` matches only the literal auto-anchor
    // shape (`dd-1`, `dd-42`); explicit ids like `dd-orbital` or
    // `distance-ladder` still validate.
    for (const entry of entries) {
      if (/^dd-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.deepDives.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `Deep-dive anchor "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". (D2 invariant.) Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.deepDives.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted <OMIFlow> callsites (ADR 0063).
   * Cross-chapter OMIFlow anchor invariant: explicit-id-derived
   * anchors must be unique across chapters. Auto-anchors of the shape
   * `omi-${N}` are chapter-scoped (each chapter restarts its counter
   * at 1) and NOT subject to the cross-chapter check.
   *
   * Two-pass validate-then-mutate mirrors `addDeepDives` (D2 shape):
   * a collision in entry N leaves entries 0..N-1 unwritten so the
   * audit-error message identifies a single offender.
   */
  addOMIFlows(entries: ReadonlyArray<OMIFlowEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      if (/^omi-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.omiFlows.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `OMIFlow anchor "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". (Cross-chapter OMIFlow invariant.) Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.omiFlows.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted `<WorkedExample>` callsites (ADR 0081 +
   * WS B+D). Auto-anchors of the shape `we-${N}` are chapter-scoped
   * (each chapter restarts its counter at 1) and NOT subject to cross-
   * chapter collision checks. Explicit-id-derived anchors (and
   * title-derived `we-${slug(title)}` anchors) are subject to the
   * cross-chapter uniqueness check.
   */
  addWorkedExamples(entries: ReadonlyArray<WorkedExampleEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      if (/^we-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.workedExamples.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `WorkedExample anchor "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". Resolution: change one of the \`id\`/\`title\` props to disambiguate.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.workedExamples.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted `<RetrievalPrompt>` entries (Wedge B1).
   * Anchors are auto-generated (`rp-${counter}`) and chapter-scoped, so
   * no cross-chapter collision check is required; the intra-chapter
   * uniqueness check lives in `extractRetrievalPrompts` before this
   * method runs. Keyed by `${unit}#${anchor}` so two chapters can
   * each have an `rp-1` without collision.
   */
  addRetrievalPrompts(entries: ReadonlyArray<RetrievalPromptEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.retrievalPrompts.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted `<SpacedReview>` entries (Wedge B1).
   * Same chapter-scoped semantics as `addRetrievalPrompts`.
   */
  addSpacedReviews(entries: ReadonlyArray<SpacedReviewEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.spacedReviews.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a chapter's extracted `<SkillReview>` entries (Wedge B1).
   * Same chapter-scoped semantics as `addRetrievalPrompts`.
   */
  addSkillReviews(entries: ReadonlyArray<SkillReviewEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.skillReviews.set(`${entry.unit}#${entry.anchor}`, entry);
    }
  }

  /**
   * Add a topic entry (ADR 0079). Keyed by topic `id`; re-adding
   * with the same id overwrites (last-write-wins, mirroring the
   * `addEquations` registry pattern per ADR 0060). Cross-chapter
   * scope — `clearUnit` does not affect topics.
   */
  addTopic(entry: TopicEntry): void {
    const state = getGlobalState();
    state.topics.set(entry.id, entry);
  }

  /**
   * Add card entries (ADR 0079). Keyed by `${topic_id}#${id}` so
   * cards from different topics with the same card id don't
   * collide. Typically called once per topic file with the
   * topic's full card list from `extractTopicAndCards`.
   */
  addCards(entries: ReadonlyArray<CardEntry>): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.cards.set(`${entry.topic_id}#${entry.id}`, entry);
    }
  }

  /**
   * Drop a topic and all its cards. Called by the topic-collection
   * iteration before re-extracting a topic file (so re-parses don't
   * accumulate stale cards if a card is removed from the file).
   * Also drops any topic-scoped append-mode findings (e.g., PRA-2
   * orphan-body-card findings emitted by the topic extractor).
   */
  clearTopic(topicId: string): void {
    const state = getGlobalState();
    state.topics.delete(topicId);
    for (const [key, entry] of state.cards) {
      if (entry.topic_id === topicId) {
        state.cards.delete(key);
      }
    }
    state.appendedExtractorFindings = state.appendedExtractorFindings.filter(
      (f) => f.location?.unit !== topicId
    );
  }

  /**
   * Append per-file extractor findings (ADR 0079 + ADR 0056). Used
   * by extractors that need to surface audit-level findings whose
   * cause is structurally invisible from the populated PedagogyIndex
   * (e.g., the topic extractor's PRA-2 orphan-body-card finding —
   * the extractor refuses to materialize the orphan card, so the
   * audit phase can't see the drift via index.cards alone).
   *
   * Findings flow through `PedagogyIndex.extractorFindings` and are
   * surfaced by `passthroughExtractorFindings` in the audit runner.
   * Last-write-DOES-NOT-win: appends accumulate across calls.
   * `clearUnit` and `clearTopic` filter by `location.unit` so
   * re-parses stay idempotent.
   */
  addExtractorFindings(entries: ReadonlyArray<AuditFinding>): void {
    const state = getGlobalState();
    state.appendedExtractorFindings.push(...entries);
  }

  /**
   * Snapshot the current accumulator state as a PedagogyIndex.
   * Equations populate from PR-C2 onward; keyInsights, figureUsages,
   * and misconceptions populate from PR-C3 onward. `figureRegistry`
   * comes from the consumer app via `setFigureRegistry()` (called by
   * TextbookLayout at SSR merge time, PR-C3 decisions row 3 two-tier
   * model); empty until that setter fires.
   */
  asPedagogyIndex(): PedagogyIndex {
    const state = getGlobalState();
    return {
      definitions: Array.from(state.definitions.values()),
      equations: Array.from(state.equations.values()),
      equationCitations: state.equationCitations.slice(),
      keyInsights: Array.from(state.keyInsights.values()),
      figureRegistry: state.figureRegistry,
      figureUsages: Array.from(state.figureUsages.values()),
      misconceptions: Array.from(state.misconceptions.values()),
      objectives: Array.from(state.objectives.values()),
      inlineRefUsages: state.inlineRefUsages.slice(),
      contractValidations: state.contractValidations,
      extractorFindings: [
        ...state.contractValidationFindings,
        ...state.appendedExtractorFindings,
      ],
      multiReps: Array.from(state.multiReps.values()),
      interventions: Array.from(state.interventions.values()),
      deepDives: Array.from(state.deepDives.values()),
      omiFlows: Array.from(state.omiFlows.values()),
      workedExamples: Array.from(state.workedExamples.values()),
      retrievalPrompts: Array.from(state.retrievalPrompts.values()),
      spacedReviews: Array.from(state.spacedReviews.values()),
      skillReviews: Array.from(state.skillReviews.values()),
      topics: Array.from(state.topics.values()),
      cards: Array.from(state.cards.values()),
      sections: state.sections,
      units: state.units,
      artifacts: state.artifacts,
    };
  }
}

export const indexAccumulator = new IndexAccumulator();

/**
 * Test-only helper: wipe ALL accumulator state in one call. Use in a
 * vitest `beforeEach` to remove cross-test ordering coupling. Not for
 * production use — `clearUnit` is the production-shape API (it
 * preserves entries from other chapters and is what the remark plugin
 * calls); `resetIndexAccumulator` blows away every collection,
 * including the consumer-supplied `figureRegistry`, which a build
 * never wants.
 */
export function resetIndexAccumulator(): void {
  const state = getGlobalState();
  state.definitions.clear();
  state.equations.clear();
  state.equationCitations = [];
  state.keyInsights.clear();
  state.figureUsages.clear();
  state.misconceptions.clear();
  state.figureRegistry = [];
  state.objectives.clear();
  state.sections = [];
  state.units = [];
  state.artifacts = [];
  state.inlineRefUsages = [];
  state.contractValidations = [];
  state.contractValidationFindings = [];
  state.appendedExtractorFindings = [];
  state.multiReps.clear();
  state.interventions.clear();
  state.deepDives.clear();
  state.omiFlows.clear();
  state.workedExamples.clear();
  state.retrievalPrompts.clear();
  state.spacedReviews.clear();
  state.skillReviews.clear();
  state.topics.clear();
  state.cards.clear();
}
