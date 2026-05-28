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
  FormativeEntry,
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
 * this same accumulator under their own collections.
 *
 * **Task 7 artifact-scoped refactor (2026-05-27).** A Unit may compose
 * multiple chapter-pass artifacts (`reading.mdx`, `practice.mdx`, future
 * `slides.mdx`); each contributes pedagogy entries to the same `unitId`.
 * Internal map keys carry an `artifactId` segment
 * (`${unit}#${artifactId}#${anchor}`) so the two artifacts don't clobber
 * each other; `clearUnitArtifact(unitId, artifactId)` only drops entries
 * for the artifact being re-extracted. Append-only arrays
 * (`inlineRefUsages`, `equationCitations`, `appendedExtractorFindings`)
 * carry an internal `_artifactId` tag on each stored record; the tag is
 * stripped before serialization so consumer-visible
 * `PedagogyIndex` entry shapes (ADR 0003 / 0073 / 0058) are unchanged.
 *
 * Auto-anchor namespacing: extractors prefix positional auto-anchors
 * with the artifact id (e.g. `practice-form-1`, `reading-omi-1`), so a
 * consumer reading `entry.anchor === "form-1"` can tell which artifact
 * authored it. Explicit author-supplied ids are not prefixed.
 */
const GLOBAL_KEY = "__sophiePedagogyIndex";

/**
 * Internal storage shape for append-only arrays. The `_artifactId` tag
 * is stripped by `asPedagogyIndex()` so the serialized shape stays
 * Zod-schema-compatible (ADR 0003). `clearUnitArtifact` filters by
 * both `entry.unit` and the stored `_artifactId`.
 */
interface ArtifactScopedRecord<T> {
  _artifactId: string;
  entry: T;
}

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
   * Per-artifact `<KeyEquation refId>` citation callsites per ADR 0060.
   * Append-only array; `clearUnitArtifact` filters by `entry.unit` AND
   * the stored `_artifactId`. The tag is internal only — the audit
   * consumes `EquationCitationEntry[]` via `asPedagogyIndex()`, which
   * strips the wrapper.
   */
  equationCitations: ArtifactScopedRecord<EquationCitationEntry>[];
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
   * Per-artifact learning objectives (PR-C4). Keyed by
   * `${unit}#${artifactId}#${anchor}` so two artifacts within the same
   * unit can each declare objectives without clobbering each other
   * (Task 7).
   */
  objectives: Map<string, ObjectiveEntry>;
  /**
   * Consumer-supplied sections collection (Wedge B-followup W1).
   * Populated from `getCollection('sections')`. Same shape as
   * `chapters` / `modules`: last-write-wins, consumer-global, NOT
   * touched by `clearUnitArtifact`. Per ADR 0067 + design doc D1.
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
   * consumer-global, NOT touched by `clearUnitArtifact`.
   */
  artifacts: ReadonlyArray<ArtifactEntry>;
  /**
   * Per-artifact inline-ref callsites (PR-C4). Append-only — the audit
   * consumes the whole list and usage-count facets care about callsite
   * counts, not dedup'd keys. `clearUnitArtifact` filters by
   * `entry.unit` AND the stored `_artifactId`.
   */
  inlineRefUsages: ArtifactScopedRecord<InlineRefUsageEntry>[];
  /**
   * Per-contract validation entries (ADR 0056 PR 3). Populated by
   * `validation/extractor.ts` via `setContractValidations`. Last-write-
   * wins, consumer-global, NOT touched by `clearUnitArtifact` (mirrors
   * `figureRegistry` / `chapters` / `modules` — the contract files
   * are external to chapter MDX so the per-artifact clear pass
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
   * `clearTopic` and per-artifact by `clearUnitArtifact`.
   */
  appendedExtractorFindings: ArtifactScopedRecord<AuditFinding>[];
  /**
   * Per-artifact `<MultiRep>` concept-binding entries (ADR 0043 +
   * 2026-05-17 design hardening). Keyed by `${unit}#${artifactId}#${id}`.
   * Populated by `extractMultiReps`; consumed by audit invariants
   * MR1–MR4/MR6 in PR-δ.
   */
  multiReps: Map<string, MultiRepIndexEntry>;
  /**
   * Per-artifact `<Intervention>` entries (ADR 0044). Keyed by
   * `${unit}#${artifactId}#${anchor}`. Populated by
   * `extractInterventions`.
   */
  interventions: Map<string, InterventionEntry>;
  /**
   * Per-artifact `<Callout variant="deep-dive">` entries (ADR 0058
   * §R-deep-dive). Keyed by `${unit}#${artifactId}#${anchor}`.
   */
  deepDives: Map<string, DeepDiveEntry>;
  /**
   * Per-artifact `<OMIFlow>` callsites (ADR 0063). Keyed by
   * `${unit}#${artifactId}#${anchor}`.
   */
  omiFlows: Map<string, OMIFlowEntry>;
  /**
   * Per-artifact `<WorkedExample>` callsites (ADR 0081 + WS B+D). Keyed
   * by `${unit}#${artifactId}#${anchor}`.
   */
  workedExamples: Map<string, WorkedExampleEntry>;
  /**
   * Per-artifact formative-assessment callsites (ADR 0073 Amendment 1).
   * Keyed by `${unit}#${artifactId}#${anchor}` — Task 7's artifact-
   * scoped split means a unit's `reading.mdx` and `practice.mdx` can
   * each contribute formatives without clobbering each other.
   */
  formatives: Map<string, FormativeEntry>;
  /**
   * Per-artifact `<RetrievalPrompt>` callsites (Wedge B1). Keyed by
   * `${unit}#${artifactId}#${anchor}`.
   */
  retrievalPrompts: Map<string, RetrievalPromptEntry>;
  /**
   * Per-artifact `<SpacedReview>` callsites (Wedge B1). Keyed by
   * `${unit}#${artifactId}#${anchor}`.
   */
  spacedReviews: Map<string, SpacedReviewEntry>;
  /**
   * Per-artifact `<SkillReview>` callsites (Wedge B1). Keyed by
   * `${unit}#${artifactId}#${anchor}`.
   */
  skillReviews: Map<string, SkillReviewEntry>;
  /**
   * Topic entries (ADR 0079). Keyed by topic `id`. Populated by the
   * topic extractor at MDX-compile time from `src/content/topics/
   * <category>/<topic-id>.mdx` frontmatter. Cross-chapter scope —
   * `clearUnitArtifact` does NOT touch topics (registry-sourced like
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
      formatives: new Map(),
      retrievalPrompts: new Map(),
      spacedReviews: new Map(),
      skillReviews: new Map(),
      topics: new Map(),
      cards: new Map(),
    };
  }
  return g[GLOBAL_KEY];
}

/**
 * Build the canonical artifact-scoped storage key (Task 7). All
 * `Map`-backed collections share the same `${unit}#${artifactId}#${tail}`
 * shape; `clearUnitArtifact` strips by the `${unit}#${artifactId}#`
 * prefix.
 */
function makeKey(unit: string, artifactId: string, tail: string): string {
  return `${unit}#${artifactId}#${tail}`;
}

/**
 * Iterate a Map's keys and delete every entry whose key matches the
 * given `${unit}#${artifactId}#` prefix. Centralizes the
 * artifact-scoped Map-clearing pattern used by `clearUnitArtifact`.
 */
function deleteByArtifactPrefix(
  map: Map<string, unknown>,
  unit: string,
  artifactId: string
): void {
  const prefix = `${unit}#${artifactId}#`;
  for (const key of map.keys()) {
    if (key.startsWith(prefix)) map.delete(key);
  }
}

class IndexAccumulator {
  /**
   * Drop all entries for a given (unit, artifact) pair (Task 7). Called
   * by the remark plugin before re-extracting a chapter-pass MDX
   * artifact, so re-parses don't accumulate stale entries — but
   * entries from OTHER artifacts of the same unit (e.g. `reading.mdx`
   * when re-extracting `practice.mdx`) survive.
   */
  clearUnitArtifact(unitId: string, artifactId: string): void {
    const state = getGlobalState();
    deleteByArtifactPrefix(
      state.definitions as Map<string, unknown>,
      unitId,
      artifactId
    );
    // Post-ADR-0060: equations are registry-sourced (one declaration per
    // `src/content/equations/<id>.mdx`), NOT artifact-keyed. The chapter-
    // clear pass drops the artifact's citations instead.
    state.equationCitations = state.equationCitations.filter(
      (r) => !(r.entry.unit === unitId && r._artifactId === artifactId)
    );
    deleteByArtifactPrefix(
      state.keyInsights as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.figureUsages as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.misconceptions as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.objectives as Map<string, unknown>,
      unitId,
      artifactId
    );
    state.inlineRefUsages = state.inlineRefUsages.filter(
      (r) => !(r.entry.unit === unitId && r._artifactId === artifactId)
    );
    deleteByArtifactPrefix(
      state.multiReps as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.interventions as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.deepDives as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.omiFlows as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.workedExamples as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.formatives as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.retrievalPrompts as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.spacedReviews as Map<string, unknown>,
      unitId,
      artifactId
    );
    deleteByArtifactPrefix(
      state.skillReviews as Map<string, unknown>,
      unitId,
      artifactId
    );
    // Filter out any append-mode extractor findings whose stored
    // artifact tag points at this artifact so re-parses don't accumulate
    // stale findings. Findings without an `entry.location.unit` survive
    // (they're not chapter-scoped); contractValidationFindings are
    // managed separately by `setContractValidations`.
    state.appendedExtractorFindings = state.appendedExtractorFindings.filter(
      (r) =>
        !(r.entry.location?.unit === unitId && r._artifactId === artifactId)
    );
  }

  /**
   * Add an artifact's extracted definitions. Artifact-scoped via the
   * keying scheme (Task 7). Per ADR 0086 a slug MAY be defined in
   * multiple chapters (deliberate cross-lecture reinforcement). The
   * F3-mirror invariant: at most one chapter may mark a given slug
   * `canonical`. Intra-artifact slug collisions are caught upstream in
   * `extractDefinitions`. Intra-unit cross-artifact collisions are
   * caught below.
   */
  addDefinitions(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<DefinitionEntry>
  ): void {
    const state = getGlobalState();
    // Two-pass: detect cross-chapter multiple-canonical conflict BEFORE
    // mutating.
    const seenCanonicalSlugs = new Map<string, string>();
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
    // Task 7 — intra-unit cross-artifact slug-collision check.
    // Definitions don't have a numeric auto-anchor shape (the slug
    // derives from title or explicit `id`), so any same-slug
    // collision within a unit across artifacts is an authoring error.
    for (const entry of entries) {
      for (const otherKey of state.definitions.keys()) {
        const parts = otherKey.split("#");
        if (parts.length < 3) continue;
        const otherUnit = parts[0];
        const otherArtifact = parts[1];
        const otherSlug = parts.slice(2).join("#");
        if (
          otherUnit === entry.unit &&
          otherArtifact !== artifactId &&
          otherSlug === entry.slug
        ) {
          throw new Error(
            `Definition slug "${entry.slug}" defined in two artifacts of unit "${entry.unit}": "${otherArtifact}" and "${artifactId}". Resolution: change one of the \`id\` props or move the duplicate term.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.definitions.set(makeKey(entry.unit, artifactId, entry.slug), entry);
    }
  }

  /**
   * Add registry-sourced equation declarations per ADR 0060. One entry
   * per `src/content/equations/<id>.mdx` file. Keyed by `id`; last-write-
   * wins. NOT artifact-scoped — equations are registry-sourced.
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
   * after a registry-file deletion). Distinct from `clearUnitArtifact`,
   * which does NOT touch `equations` post-ADR-0060.
   */
  clearEquations(): void {
    const state = getGlobalState();
    state.equations.clear();
  }

  /**
   * Add an artifact's extracted `<KeyEquation refId>` citation entries
   * per ADR 0060. Append-only with internal `_artifactId` tag so
   * `clearUnitArtifact` can drop only the artifact being re-extracted
   * (Task 7).
   */
  addEquationCitations(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<EquationCitationEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.equationCitations.push({ _artifactId: artifactId, entry });
    }
  }

  /**
   * Add an artifact's extracted key-insights. Key-insights are
   * chapter-local: anchors only need to be unique within an artifact
   * (intra-chapter collisions are caught by `extractKeyInsights`
   * before they reach the accumulator). Keyed by
   * `${unit}#${artifactId}#${anchor}`.
   */
  addKeyInsights(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<KeyInsightEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.keyInsights.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Add an artifact's extracted figure usages. F3 invariant: exactly
   * one canonical usage per figure name across the whole textbook.
   * Two-pass shape (validate-then-mutate) so a batch that throws on
   * entry N leaves entries 0..N-1 unwritten. Keyed by
   * `${unit}#${artifactId}#${anchor}` (Task 7).
   */
  addFigureUsages(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<FigureUsageEntry>
  ): void {
    const state = getGlobalState();
    const seenCanonicalNames = new Map<string, string>();
    for (const entry of entries) {
      if (!entry.canonical) continue;
      for (const existing of state.figureUsages.values()) {
        if (existing.name === entry.name && existing.canonical) {
          throw new Error(
            `F3 invariant: multiple <Figure name="${entry.name}" canonical /> usages — found in chapter "${existing.unit}" and chapter "${entry.unit}". Resolution: remove \`canonical\` from one of them.`
          );
        }
      }
      const prior = seenCanonicalNames.get(entry.name);
      if (prior !== undefined && prior !== entry.unit) {
        throw new Error(
          `F3 invariant: multiple <Figure name="${entry.name}" canonical /> usages — found in chapter "${prior}" and chapter "${entry.unit}". Resolution: remove \`canonical\` from one of them.`
        );
      }
      seenCanonicalNames.set(entry.name, entry.unit);
    }
    for (const entry of entries) {
      state.figureUsages.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Add an artifact's extracted misconceptions. M2 invariant:
   * explicit-id-derived anchors must be unique across chapters.
   * Auto-anchors of the shape `misc-${N}` are now artifact-namespaced
   * (e.g. `practice-misc-1`) at extract time, so the legacy auto-
   * anchor literal-shape allowance is no longer load-bearing for
   * cross-artifact disambiguation; the M2 cross-chapter check still
   * applies to explicit ids. Task 7: intra-unit cross-artifact same-
   * explicit-anchor authoring is rejected.
   */
  addMisconceptions(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<MisconceptionEntry>
  ): void {
    const state = getGlobalState();
    // M2 cross-chapter check: only for explicit (non-auto) anchors.
    // After Task 7, auto-anchors are artifact-prefixed at extract time
    // (`${artifact}-misc-${N}`), so the literal `/^misc-\d+$/` shape
    // matches only legacy auto-anchors that wouldn't reach here — but
    // the test still serves as a safety net for any future extractor
    // that emits the bare shape.
    for (const entry of entries) {
      if (/^misc-\d+$/.test(entry.anchor)) continue;
      // Cross-chapter (different unit) — original M2 invariant.
      for (const existing of state.misconceptions.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `Misconception slug "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". (M2 invariant.) Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    // Task 7 — intra-unit cross-artifact explicit-anchor collision.
    // Mirrors §4 of the task: same authored explicit id in two
    // artifacts of one unit is an authoring error.
    for (const entry of entries) {
      // Skip the artifact-namespaced auto-anchor shapes.
      if (/^(reading|practice)-misc-\d+$/.test(entry.anchor)) continue;
      if (/^misc-\d+$/.test(entry.anchor)) continue;
      for (const otherKey of state.misconceptions.keys()) {
        const parts = otherKey.split("#");
        if (parts.length < 3) continue;
        const otherUnit = parts[0];
        const otherArtifact = parts[1];
        const otherAnchor = parts.slice(2).join("#");
        if (
          otherUnit === entry.unit &&
          otherArtifact !== artifactId &&
          otherAnchor === entry.anchor
        ) {
          throw new Error(
            `Misconception anchor "${entry.anchor}" defined in two artifacts of unit "${entry.unit}": "${otherArtifact}" and "${artifactId}". Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.misconceptions.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Push the consumer-supplied figure registry into the accumulator
   * (two-tier model, PR-C3 decision #3). Last-write-wins, consumer-
   * global, NOT touched by `clearUnitArtifact`.
   */
  setFigureRegistry(entries: ReadonlyArray<FigureRegistryEntry>): void {
    const state = getGlobalState();
    state.figureRegistry = entries;
  }

  /**
   * Add an artifact's extracted objectives. Keyed by
   * `${unit}#${artifactId}#${anchor}`. Single-artifact batch invariant:
   * `extractObjectives` already enforces O1 (duplicate-id-within-
   * chapter) via `seenIds`. Cross-artifact within a unit: the same
   * `id` in two artifacts of the same unit produces two distinct keys
   * (different `artifactId` segment) — by current design objectives
   * are tied to a single artifact's reading and the audit's existing
   * cross-unit checks remain.
   */
  addObjectives(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<ObjectiveEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.objectives.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Push the consumer-supplied sections collection (Wedge B-followup
   * W1). Per ADR 0067 + design doc D1. Last-write-wins, consumer-
   * global, NOT touched by `clearUnitArtifact`.
   */
  setSections(entries: ReadonlyArray<SectionEntry>): void {
    const state = getGlobalState();
    state.sections = entries;
  }

  /**
   * Push the consumer-supplied units collection (Wedge B-followup W1).
   */
  setUnits(entries: ReadonlyArray<UnitEntry>): void {
    const state = getGlobalState();
    state.units = entries;
  }

  /**
   * Push the consumer-supplied artifacts collection (Wedge B-followup
   * W2). Last-write-wins, consumer-global, NOT touched by
   * `clearUnitArtifact`.
   */
  setArtifacts(entries: ReadonlyArray<ArtifactEntry>): void {
    const state = getGlobalState();
    state.artifacts = entries;
  }

  /**
   * Append an artifact's inline-ref callsites. Append-only with
   * internal `_artifactId` tag so `clearUnitArtifact` filters
   * precisely (Task 7).
   */
  addInlineRefUsages(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<InlineRefUsageEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.inlineRefUsages.push({ _artifactId: artifactId, entry });
    }
  }

  /**
   * Push the contract-validations extraction result into the
   * accumulator (ADR 0056 PR 3). Last-write-wins, consumer-global,
   * NOT touched by `clearUnitArtifact`.
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
   * Add an artifact's extracted MultiRep bindings. Keyed by
   * `${unit}#${artifactId}#${id}`. Within-artifact duplicate concept
   * bindings trip the key collision and throw. Task 7: same explicit
   * id in two artifacts of one unit also throws.
   */
  addMultiReps(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<MultiRepIndexEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const key = makeKey(entry.unit, artifactId, entry.id);
      const existing = state.multiReps.get(key);
      if (existing) {
        throw new Error(
          `MultiRep id collision: chapter "${entry.unit}" artifact "${artifactId}" has two <MultiRep> bindings sharing anchor "${entry.id}" (concepts "${existing.concept}" and "${entry.concept}"). Resolution: change one of the \`id\` props.`
        );
      }
      // Task 7 cross-artifact intra-unit explicit-id collision.
      // Skip the auto-derived `mr-<concept>` shape — MultiRep auto-
      // anchors derive from `concept`, not from a positional counter,
      // so cross-artifact `mr-velocity` in both reading & practice is
      // legitimate semantic reuse (same concept), not authoring drift.
      // Explicit author-set `id=` collisions still throw.
      if (entry.id !== `mr-${entry.concept}`) {
        for (const otherKey of state.multiReps.keys()) {
          const parts = otherKey.split("#");
          if (parts.length < 3) continue;
          const otherUnit = parts[0];
          const otherArtifact = parts[1];
          const otherAnchor = parts.slice(2).join("#");
          if (
            otherUnit === entry.unit &&
            otherArtifact !== artifactId &&
            otherAnchor === entry.id
          ) {
            throw new Error(
              `MultiRep id "${entry.id}" defined in two artifacts of unit "${entry.unit}": "${otherArtifact}" and "${artifactId}". Resolution: change one of the \`id\` props.`
            );
          }
        }
      }
    }
    for (const entry of entries) {
      state.multiReps.set(makeKey(entry.unit, artifactId, entry.id), entry);
    }
  }

  /**
   * Add an artifact's extracted `<Intervention>` entries (ADR 0044).
   * Keyed by `${unit}#${artifactId}#${anchor}`. Within-artifact
   * duplicate anchors trip the key collision and throw — the
   * extractor's sequential numbering makes this impossible in practice.
   */
  addInterventions(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<InterventionEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      const key = makeKey(entry.unit, artifactId, entry.anchor);
      const existing = state.interventions.get(key);
      if (existing) {
        throw new Error(
          `Intervention anchor collision: chapter "${entry.unit}" artifact "${artifactId}" has two <Intervention> blocks sharing anchor "${entry.anchor}". Resolution: this should never happen with sequential extractor numbering — file a bug.`
        );
      }
    }
    for (const entry of entries) {
      const key = makeKey(entry.unit, artifactId, entry.anchor);
      state.interventions.set(key, entry);
    }
  }

  /**
   * Add an artifact's extracted deep-dives. D2 invariant: explicit-id-
   * derived anchors must be unique across chapters. Task 7 adds an
   * intra-unit cross-artifact check for explicit anchors.
   */
  addDeepDives(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<DeepDiveEntry>
  ): void {
    const state = getGlobalState();
    // D2 (cross-chapter, explicit anchors only). Auto-anchors after
    // Task 7 are artifact-prefixed at extract time.
    for (const entry of entries) {
      if (/^dd-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-dd-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.deepDives.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `Deep-dive anchor "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". (D2 invariant.) Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    // Task 7 — intra-unit cross-artifact explicit-anchor collision.
    for (const entry of entries) {
      if (/^dd-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-dd-\d+$/.test(entry.anchor)) continue;
      for (const otherKey of state.deepDives.keys()) {
        const parts = otherKey.split("#");
        if (parts.length < 3) continue;
        const otherUnit = parts[0];
        const otherArtifact = parts[1];
        const otherAnchor = parts.slice(2).join("#");
        if (
          otherUnit === entry.unit &&
          otherArtifact !== artifactId &&
          otherAnchor === entry.anchor
        ) {
          throw new Error(
            `Deep-dive anchor "${entry.anchor}" defined in two artifacts of unit "${entry.unit}": "${otherArtifact}" and "${artifactId}". Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.deepDives.set(makeKey(entry.unit, artifactId, entry.anchor), entry);
    }
  }

  /**
   * Add an artifact's extracted `<OMIFlow>` callsites (ADR 0063).
   * Cross-chapter explicit-anchor uniqueness + Task 7's intra-unit
   * cross-artifact explicit-anchor uniqueness.
   */
  addOMIFlows(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<OMIFlowEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      if (/^omi-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-omi-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.omiFlows.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `OMIFlow anchor "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". (Cross-chapter OMIFlow invariant.) Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      if (/^omi-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-omi-\d+$/.test(entry.anchor)) continue;
      for (const otherKey of state.omiFlows.keys()) {
        const parts = otherKey.split("#");
        if (parts.length < 3) continue;
        const otherUnit = parts[0];
        const otherArtifact = parts[1];
        const otherAnchor = parts.slice(2).join("#");
        if (
          otherUnit === entry.unit &&
          otherArtifact !== artifactId &&
          otherAnchor === entry.anchor
        ) {
          throw new Error(
            `OMIFlow anchor "${entry.anchor}" defined in two artifacts of unit "${entry.unit}": "${otherArtifact}" and "${artifactId}". Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.omiFlows.set(makeKey(entry.unit, artifactId, entry.anchor), entry);
    }
  }

  /**
   * Add an artifact's extracted `<WorkedExample>` callsites (ADR 0081 +
   * WS B+D). Cross-chapter explicit-anchor uniqueness + Task 7's
   * intra-unit cross-artifact explicit-anchor uniqueness.
   */
  addWorkedExamples(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<WorkedExampleEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      if (/^we-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-we-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.workedExamples.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `WorkedExample anchor "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". Resolution: change one of the \`id\`/\`title\` props to disambiguate.`
          );
        }
      }
    }
    for (const entry of entries) {
      if (/^we-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-we-\d+$/.test(entry.anchor)) continue;
      for (const otherKey of state.workedExamples.keys()) {
        const parts = otherKey.split("#");
        if (parts.length < 3) continue;
        const otherUnit = parts[0];
        const otherArtifact = parts[1];
        const otherAnchor = parts.slice(2).join("#");
        if (
          otherUnit === entry.unit &&
          otherArtifact !== artifactId &&
          otherAnchor === entry.anchor
        ) {
          throw new Error(
            `WorkedExample anchor "${entry.anchor}" defined in two artifacts of unit "${entry.unit}": "${otherArtifact}" and "${artifactId}". Resolution: change one of the \`id\`/\`title\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.workedExamples.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Add an artifact's extracted formative-assessment callsites (ADR
   * 0073 Amendment 1). Cross-chapter explicit-anchor uniqueness + Task
   * 7's intra-unit cross-artifact explicit-anchor uniqueness — the
   * latter is the load-bearing check for `<MCQ id="foo">` authored in
   * BOTH `reading.mdx` and `practice.mdx` of the same unit.
   */
  addFormatives(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<FormativeEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      if (/^form-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-form-\d+$/.test(entry.anchor)) continue;
      for (const existing of state.formatives.values()) {
        if (existing.unit !== entry.unit && existing.anchor === entry.anchor) {
          throw new Error(
            `Formative anchor "${entry.anchor}" defined in multiple chapters: "${existing.unit}" and "${entry.unit}". Resolution: change one of the \`id\` props to disambiguate.`
          );
        }
      }
    }
    for (const entry of entries) {
      if (/^form-\d+$/.test(entry.anchor)) continue;
      if (/^(reading|practice)-form-\d+$/.test(entry.anchor)) continue;
      for (const otherKey of state.formatives.keys()) {
        const parts = otherKey.split("#");
        if (parts.length < 3) continue;
        const otherUnit = parts[0];
        const otherArtifact = parts[1];
        const otherAnchor = parts.slice(2).join("#");
        if (
          otherUnit === entry.unit &&
          otherArtifact !== artifactId &&
          otherAnchor === entry.anchor
        ) {
          throw new Error(
            `Formative anchor "${entry.anchor}" defined in two artifacts of unit "${entry.unit}": "${otherArtifact}" and "${artifactId}". Resolution: change one of the \`id\` props.`
          );
        }
      }
    }
    for (const entry of entries) {
      state.formatives.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Add an artifact's extracted `<RetrievalPrompt>` entries (Wedge B1).
   * Anchors are auto-generated (`${artifact}-rp-${counter}` post Task
   * 7); the artifact-prefix makes cross-artifact collisions
   * structurally impossible.
   */
  addRetrievalPrompts(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<RetrievalPromptEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.retrievalPrompts.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Add an artifact's extracted `<SpacedReview>` entries (Wedge B1).
   * Auto-generated anchors (`${artifact}-sp-${counter}` post Task 7).
   */
  addSpacedReviews(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<SpacedReviewEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.spacedReviews.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Add an artifact's extracted `<SkillReview>` entries (Wedge B1).
   * Auto-generated anchors (`${artifact}-sk-${counter}` post Task 7).
   */
  addSkillReviews(
    _unitId: string,
    artifactId: string,
    entries: ReadonlyArray<SkillReviewEntry>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.skillReviews.set(
        makeKey(entry.unit, artifactId, entry.anchor),
        entry
      );
    }
  }

  /**
   * Add a topic entry (ADR 0079). Keyed by topic `id`; cross-chapter
   * scope — `clearUnitArtifact` does not affect topics.
   */
  addTopic(entry: TopicEntry): void {
    const state = getGlobalState();
    state.topics.set(entry.id, entry);
  }

  /**
   * Add card entries (ADR 0079). Keyed by `${topic_id}#${id}`.
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
   * Topic-scoped append-mode findings (e.g., PRA-2 orphan-body-card
   * findings) are filtered by location.unit === topicId; topic
   * findings carry no artifact tag (registry-sourced) so the filter
   * here is a literal `entry.location?.unit === topicId` check that
   * ignores the wrapper's `_artifactId`.
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
      (r) => r.entry.location?.unit !== topicId
    );
  }

  /**
   * Append per-file extractor findings (ADR 0079 + ADR 0056). Findings
   * flow through `PedagogyIndex.extractorFindings` and are surfaced by
   * `passthroughExtractorFindings` in the audit runner. Wrapped with
   * an internal `_artifactId` tag so `clearUnitArtifact` filters
   * precisely (Task 7). Topic-extractor findings supply
   * `artifactId = ""` (registry-sourced, not chapter-pass); the
   * `clearTopic` path filters them by `location.unit === topicId`
   * directly.
   */
  addExtractorFindings(
    artifactId: string,
    entries: ReadonlyArray<AuditFinding>
  ): void {
    const state = getGlobalState();
    for (const entry of entries) {
      state.appendedExtractorFindings.push({ _artifactId: artifactId, entry });
    }
  }

  /**
   * Snapshot the current accumulator state as a PedagogyIndex.
   * Append-only collections (inlineRefUsages, equationCitations,
   * appendedExtractorFindings) strip their internal `_artifactId`
   * wrappers here so the serialized shape stays Zod-schema-clean
   * (ADR 0003).
   */
  asPedagogyIndex(): PedagogyIndex {
    const state = getGlobalState();
    return {
      definitions: Array.from(state.definitions.values()),
      equations: Array.from(state.equations.values()),
      equationCitations: state.equationCitations.map((r) => r.entry),
      keyInsights: Array.from(state.keyInsights.values()),
      figureRegistry: state.figureRegistry,
      figureUsages: Array.from(state.figureUsages.values()),
      misconceptions: Array.from(state.misconceptions.values()),
      objectives: Array.from(state.objectives.values()),
      inlineRefUsages: state.inlineRefUsages.map((r) => r.entry),
      contractValidations: state.contractValidations,
      extractorFindings: [
        ...state.contractValidationFindings,
        ...state.appendedExtractorFindings.map((r) => r.entry),
      ],
      multiReps: Array.from(state.multiReps.values()),
      interventions: Array.from(state.interventions.values()),
      deepDives: Array.from(state.deepDives.values()),
      omiFlows: Array.from(state.omiFlows.values()),
      workedExamples: Array.from(state.workedExamples.values()),
      formatives: Array.from(state.formatives.values()),
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
 * vitest `beforeEach` to remove cross-test ordering coupling.
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
  state.formatives.clear();
  state.retrievalPrompts.clear();
  state.spacedReviews.clear();
  state.skillReviews.clear();
  state.topics.clear();
  state.cards.clear();
}
