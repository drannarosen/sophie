import { readFileSync } from "node:fs";
import {
  type EquationRegistryEntry,
  EquationRegistryEntrySchema,
  type TopicEntry,
  TopicEntrySchema,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { parse as parseYaml } from "yaml";
import { indexAccumulator } from "./accumulator.ts";
import { extractDeepDives } from "./extractors/deep-dives.ts";
import { extractDefinitions } from "./extractors/definitions.ts";
import { extractEquationCitations } from "./extractors/equation-citations.ts";
import { extractEquationRegistryDeclaration } from "./extractors/equation-registry.ts";
import { extractFigures } from "./extractors/figures.ts";
import { extractFormative } from "./extractors/formative.ts";
import { extractInlineRefUsages } from "./extractors/inline-refs.ts";
import { extractInterventions } from "./extractors/interventions.ts";
import { extractKeyInsights } from "./extractors/key-insights.ts";
import { extractMisconceptions } from "./extractors/misconceptions.ts";
import { extractMultiReps } from "./extractors/multireps.ts";
import { extractObjectives } from "./extractors/objectives.ts";
import { extractOMIFlows } from "./extractors/omi-flow.ts";
import { extractRetrievalPrompts } from "./extractors/retrieval-prompt.ts";
import { extractSkillReviews } from "./extractors/skill-review.ts";
import { extractSpacedReviews } from "./extractors/spaced-review.ts";
import { extractTopicAndCards } from "./extractors/topic.ts";
import { extractWorkedExamples } from "./extractors/worked-examples.ts";
import { markChapterOpener } from "./transforms/chapter-opener.ts";
import { markFirstUseGlossaryTerms } from "./transforms/first-use-glossary.ts";
import { transformIntervention } from "./transforms/intervention.ts";
import { transformLearningObjectives } from "./transforms/learning-objectives.ts";
import { transformMultiRep } from "./transforms/multirep.ts";
import { transformOMIFlow } from "./transforms/omi-flow.ts";

/**
 * Per-unit artifact filenames that route to the chapter pass. Task 7
 * artifact-scoped pedagogy-index refactor: a single Unit now composes
 * multiple MDX artifacts (`reading.mdx`, `practice.mdx`, future
 * `slides.mdx`) that each contribute pedagogy entries to the same
 * `unitId`. The accumulator keys by `${unit}#${artifactId}#${anchor}`
 * so artifacts within a unit don't clobber each other via
 * `clearUnitArtifact`.
 *
 * Forward-compat: adding a new artifact (e.g. `slides.mdx`) is a one-
 * line extension to `CHAPTER_ARTIFACT_LEAF_RE` below +
 * `defaultGetChapterSlug`'s regex + an audit pass to make sure no
 * extractor needs artifact-specific routing.
 */
const CHAPTER_ARTIFACT_LEAF_RE = /[/\\](reading|practice)\.mdx$/;

/**
 * Default chapter-slug deriver. W2/D4 (Path A) graduation + Task 7
 * artifact-scoped extension: the chapter slug per-callsite extractors
 * carry is the Unit id, which equals the parent-directory name of any
 * chapter-pass artifact under the unit. For
 * `examples/smoke/src/content/sections/foundations/units/measuring-the-sky/practice.mdx`
 * this yields `"measuring-the-sky"` (same as `reading.mdx` under the
 * same unit dir; both files contribute to the same `unitId`).
 *
 * Consumer apps with non-default content layouts pass their own
 * `getChapterSlug` to `pedagogyIndexRemarkPlugin()`.
 */
function defaultGetChapterSlug(filePath: string): string | undefined {
  const match = filePath.match(/[/\\]([^/\\]+)[/\\](?:reading|practice)\.mdx$/);
  if (!match) return undefined;
  return match[1];
}

/**
 * Derive a stable artifact id from a chapter-pass file path (Task 7).
 * The artifact id is the filename stem (`reading.mdx` → `"reading"`,
 * `practice.mdx` → `"practice"`); the accumulator concatenates it into
 * the internal storage key so two artifacts of the same unit don't
 * clobber each other.
 *
 * The stem is read from the last path segment with its extension
 * stripped. This handles both the standard chapter-pass artifacts AND
 * the custom-`getChapterSlug` path (consumer apps / tests passing
 * arbitrary `.mdx` paths) — those still get a deterministic,
 * human-readable artifact id from their filename. Falls back to
 * `"artifact"` only for the degenerate empty-stem case (structurally
 * unreachable for any real file path).
 */
function getArtifactId(filePath: string): string {
  const leaf = filePath.split(/[/\\]/).pop() ?? "";
  const stem = leaf.replace(/\.[^.]+$/, "");
  return stem.length > 0 ? stem : "artifact";
}

/**
 * Path-detection helpers per ADR 0060. The remark plugin routes
 * `content/sections/**` artifact MDX (W2 graduation) and
 * `content/equations/**` registry MDX to different walkers; other
 * paths are skipped. Pattern matches both POSIX (`/`) and Windows
 * (`\\`) separators.
 */
const CHAPTER_PATH_RE = /[/\\]content[/\\]sections[/\\]/;
const EQUATION_REGISTRY_PATH_RE = /[/\\]content[/\\]equations[/\\]/;
const TOPIC_REGISTRY_PATH_RE = /[/\\]content[/\\]topics[/\\]/;

function isChapterFilePath(filePath: string): boolean {
  // Task 7 artifact-scoped routing: both `reading.mdx` AND `practice.mdx`
  // under sections/<sec>/units/<unit>/ route to the chapter pass; the
  // accumulator's artifact-scoped keys (and `clearUnitArtifact`) prevent
  // the two artifacts from clobbering each other's entries. Adding a
  // third chapter-pass artifact (e.g. `slides.mdx`) is a one-line change
  // to `CHAPTER_ARTIFACT_LEAF_RE` + `defaultGetChapterSlug`'s regex
  // (`getArtifactId` derives the stem generically, no change needed).
  return (
    CHAPTER_PATH_RE.test(filePath) && CHAPTER_ARTIFACT_LEAF_RE.test(filePath)
  );
}

function isEquationRegistryFilePath(filePath: string): boolean {
  return EQUATION_REGISTRY_PATH_RE.test(filePath);
}

function isTopicRegistryFilePath(filePath: string): boolean {
  return TOPIC_REGISTRY_PATH_RE.test(filePath);
}

/**
 * Read + validate a topic file's YAML frontmatter per ADR 0079
 * (Design F). Same fs-direct rationale as
 * `readEquationRegistryFrontmatter`: by the time our plugin sees
 * the mdast tree, `remark-frontmatter` + `remark-mdx-frontmatter`
 * have already hoisted the YAML into an ESM export, so re-reading
 * the file gives us the original validated-against-Zod shape.
 */
function readTopicFrontmatter(filePath: string): TopicEntry {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    throw new Error(
      `Topic file "${filePath}" is missing YAML frontmatter. Per ADR 0079, every topic MDX must declare \`id\`, \`label\`, \`summary\`, and a \`cards: [{...}]\` list in frontmatter.`
    );
  }
  const raw = parseYaml(match[1] ?? "");
  const parsed = TopicEntrySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Topic file "${filePath}" has invalid frontmatter. Validation errors: ${parsed.error.message}`
    );
  }
  return parsed.data;
}

/**
 * Read the YAML frontmatter for an equation registry MDX file and
 * validate it against `EquationRegistryEntrySchema`. Returns the
 * typed entry.
 *
 * Why fs-direct rather than walking the mdast `yaml` node: Astro's
 * MDX integration runs `remark-frontmatter` + `remark-mdx-frontmatter`
 * BEFORE our custom remark plugin sees the tree, so the YAML node is
 * already hoisted into an `mdxjsEsm` export const and the original
 * `yaml` node is removed from `tree.children`. Re-reading the source
 * file directly avoids parsing the hoisted ESM AST and gives us the
 * same YAML the content-layer schema validates against.
 */
function readEquationRegistryFrontmatter(
  filePath: string
): EquationRegistryEntry {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    throw new Error(
      `Equation registry file "${filePath}" is missing YAML frontmatter. Per ADR 0060, every registry MDX must declare \`id\`, \`title\`, \`tex\`, and \`symbols\` in frontmatter at the top of the file.`
    );
  }
  const raw = parseYaml(match[1] ?? "");
  const parsed = EquationRegistryEntrySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Equation registry file "${filePath}" has invalid frontmatter. Validation errors: ${parsed.error.message}`
    );
  }
  return parsed.data;
}

/**
 * Read the `chapter` field (Sprint F: display chapter number) from a
 * chapter MDX file's YAML frontmatter. Returns `undefined` for
 * chapters that omit the field — the figure / equation numbering
 * components handle the missing case by rendering within-chapter-only
 * numbers.
 *
 * Same fs-direct rationale as `readEquationRegistryFrontmatter`:
 * `remark-mdx-frontmatter` hoists the YAML into an `mdxjsEsm` export
 * before this remark plugin sees the tree, so the YAML node is gone
 * from `tree.children`.
 */
function readChapterNumberFromFrontmatter(
  filePath: string
): number | undefined {
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return undefined;
  const raw = parseYaml(match[1] ?? "");
  if (raw === null || typeof raw !== "object") return undefined;
  const value = (raw as Record<string, unknown>).chapter;
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

export interface PedagogyIndexRemarkPluginOptions {
  /** Derive a chapter slug from the source file path. Defaults to the
   * standard Astro content-collection layout (see defaultGetChapterSlug). */
  getChapterSlug?: (filePath: string) => string | undefined;
}

interface VFileLike {
  path?: string;
}

/**
 * Remark plugin that wires the pure extractors + `indexAccumulator`
 * into the unified MDX pipeline. Add to `remarkPlugins` in your
 * MDX integration config.
 *
 * Path-detected per ADR 0060:
 *   - `content/chapters/**\/*.mdx` → chapter pass: clear chapter state,
 *     run definition/equation-citation/key-insight/figure/misconception/
 *     objective/inline-ref/multirep/intervention extractors, run the
 *     terminal transform passes (LO/MultiRep/Intervention/markFirstUse).
 *   - `content/equations/**\/*.mdx` → registry pass: parse + validate
 *     frontmatter, walk body for biography children via
 *     `buildBiographyFromChildren`, assemble `EquationEntry`, replace
 *     the registry slot via `addEquations` (keyed by `id`).
 *   - Other paths → skip.
 *
 * The plugin runs read-only extraction passes first (chapter pass) or
 * a single registry-walker pass (registry path). Terminal transforms
 * fire only on the chapter pass; registry MDX bodies are static
 * biography content with no LO/MultiRep/Intervention components.
 */
export function pedagogyIndexRemarkPlugin(
  options: PedagogyIndexRemarkPluginOptions = {}
): (tree: Root, file: VFileLike) => void {
  return (tree: Root, file: VFileLike) => {
    const filePath = file.path;
    if (!filePath) return;

    // Registry path: assemble one EquationEntry from frontmatter + body
    // biography, replace the registry slot.
    if (isEquationRegistryFilePath(filePath)) {
      const frontmatter = readEquationRegistryFrontmatter(filePath);
      const entry = extractEquationRegistryDeclaration(tree, frontmatter);
      indexAccumulator.addEquations([entry]);
      return;
    }

    // Topic-registry path (ADR 0079): assemble one TopicEntry +
    // CardEntry[] from the topic file's frontmatter + body
    // <SkillReview.Card> blocks; clear stale cards before re-adding so
    // file re-parses (e.g., during dev-server HMR) don't accumulate
    // removed cards.
    if (isTopicRegistryFilePath(filePath)) {
      const frontmatter = readTopicFrontmatter(filePath);
      const { topic, cards, findings } = extractTopicAndCards(
        tree,
        frontmatter
      );
      indexAccumulator.clearTopic(topic.id);
      indexAccumulator.addTopic(topic);
      indexAccumulator.addCards(cards);
      // Topic findings are registry-sourced (not chapter-pass), so they
      // carry the sentinel empty artifact id; `clearTopic` filters them
      // by `location.unit === topicId`, not by artifact (Task 7).
      if (findings.length > 0)
        indexAccumulator.addExtractorFindings("", findings);
      return;
    }

    // Chapter pass. Two routes to unitId:
    //   1. Caller-provided `options.getChapterSlug` — consumer apps with
    //      non-standard layouts (e.g. tests passing arbitrary paths)
    //      assert "treat this file as a chapter MDX and use slug X."
    //   2. Default basename-from-path + `content/chapters/**` filter —
    //      avoids mis-typed extraction on `examples/` sandbox files or
    //      docs MDX that aren't part of any chapter collection.
    let unitId: string | undefined;
    if (options.getChapterSlug) {
      unitId = options.getChapterSlug(filePath);
    } else if (isChapterFilePath(filePath)) {
      unitId = defaultGetChapterSlug(filePath);
    }
    if (!unitId) return;

    // Task 7 — derive the artifact id (filename stem) once per chapter
    // pass and thread it to every accumulator add* call so two
    // artifacts of the same unit (`reading.mdx`, `practice.mdx`) don't
    // clobber each other. The artifact id lives ONLY in the
    // accumulator's internal storage key (`${unit}#${artifactId}#
    // ${anchor}`), never in the serialized `entry.anchor` — page URLs
    // are already artifact-scoped (`/units/X/reading#ki-1` vs
    // `/units/X/practice#ki-1`), so positional auto-anchors stay clean.
    const artifactId = getArtifactId(filePath);

    // Sprint F — read the chapter's display `chapter` number from
    // frontmatter once per chapter pass and thread it to extractors
    // that need it (figures today; key-equations in Sprint E). When
    // absent, extractors fall back to within-chapter-only numbering.
    const chapterNumber = readChapterNumberFromFrontmatter(filePath);

    indexAccumulator.clearUnitArtifact(unitId, artifactId);
    indexAccumulator.addDefinitions(
      unitId,
      artifactId,
      extractDefinitions(tree, unitId)
    );
    // ADR 0038 § A2.6 — CL1 emits ERROR findings for <KeyEquation>
    // callsites missing a `client:*` hydration directive. Same wrapper-
    // shape return convention as `extractOMIFlows` /
    // `extractInlineRefUsages`.
    const equationCitationResult = extractEquationCitations(
      tree,
      unitId,
      chapterNumber
    );
    indexAccumulator.addEquationCitations(
      unitId,
      artifactId,
      equationCitationResult.entries
    );
    indexAccumulator.addExtractorFindings(
      artifactId,
      equationCitationResult.findings
    );
    indexAccumulator.addKeyInsights(
      unitId,
      artifactId,
      extractKeyInsights(tree, unitId)
    );
    indexAccumulator.addFigureUsages(
      unitId,
      artifactId,
      extractFigures(tree, unitId, chapterNumber)
    );
    indexAccumulator.addMisconceptions(
      unitId,
      artifactId,
      extractMisconceptions(tree, unitId)
    );
    // ADR 0058 §R-deep-dive — <Callout variant="deep-dive"> tracking
    // (PR-B follow-up to PR-A's renderer surface). The-more-you-know
    // callouts are intentionally NOT walked.
    indexAccumulator.addDeepDives(
      unitId,
      artifactId,
      extractDeepDives(tree, unitId)
    );
    // ADR 0063 — A8 <OMIFlow> composite primitive. Extractor walks
    // <OMIFlow> JSX and emits OMIFlowEntry rows plus OF-3 WARNING
    // findings for any unknown JSX children (post-W4c R7 doctrine).
    const omiResult = extractOMIFlows(tree, unitId);
    indexAccumulator.addOMIFlows(unitId, artifactId, omiResult.entries);
    indexAccumulator.addExtractorFindings(artifactId, omiResult.findings);
    // ADR 0081 + WS B+D — <WorkedExample> extractor. Counts slot
    // children + emits WE-3 WARNING findings for any unknown JSX
    // children (R7 doctrine, mirrors OMIFlow's OF-3). Audit-time
    // invariants WE-1 / WE-2 consume the per-entry `slots` summary.
    const workedExampleResult = extractWorkedExamples(tree, unitId);
    indexAccumulator.addWorkedExamples(
      unitId,
      artifactId,
      workedExampleResult.entries
    );
    indexAccumulator.addExtractorFindings(
      artifactId,
      workedExampleResult.findings
    );
    // ADR 0073 Amendment 1 — formative-assessment extractor. One entry
    // per formative-parent callsite; AS-1 / AS-4 / AS-5 ERROR findings
    // are pushed at extract-time (count-bearing detection the
    // materialized answer can't carry); AS-2 / AS-3 are derived in the
    // audit phase by `checkFormative`.
    const formativeResult = extractFormative(tree, unitId);
    indexAccumulator.addFormatives(unitId, artifactId, formativeResult.entries);
    indexAccumulator.addExtractorFindings(artifactId, formativeResult.findings);
    // Wedge B1 retrieval-family extractors. Each emits one entry per
    // matching JSX flow element; pure read pass (no mutation). PRA-1
    // (prereq activation), RET-1 (retrieval coverage), and SR-1
    // (SpacedReview ref validity) consume these in the audit phase.
    indexAccumulator.addRetrievalPrompts(
      unitId,
      artifactId,
      extractRetrievalPrompts(tree, unitId)
    );
    indexAccumulator.addSpacedReviews(
      unitId,
      artifactId,
      extractSpacedReviews(tree, unitId)
    );
    indexAccumulator.addSkillReviews(
      unitId,
      artifactId,
      extractSkillReviews(tree, unitId)
    );
    indexAccumulator.addObjectives(
      unitId,
      artifactId,
      extractObjectives(tree, unitId)
    );
    // ADR 0038 § A2.6 — CL1 audit invariant emits ERROR findings for
    // store-backed inline-refs missing a `client:*` hydration directive.
    // Findings ride PedagogyIndex.extractorFindings and surface as
    // build errors via passthroughExtractorFindings.
    const inlineRefResult = extractInlineRefUsages(tree, unitId);
    indexAccumulator.addInlineRefUsages(
      unitId,
      artifactId,
      inlineRefResult.usages
    );
    indexAccumulator.addExtractorFindings(artifactId, inlineRefResult.findings);
    // #191 — `extractMultiReps` now also returns inline-ref usages for
    // each `<RepFigure>` / `<RepEquation>` child so MultiRep references
    // count toward F4 (orphan figure) + R-series equation invariants.
    const multiRepResult = extractMultiReps(tree, unitId);
    indexAccumulator.addMultiReps(unitId, artifactId, multiRepResult.entries);
    indexAccumulator.addInlineRefUsages(
      unitId,
      artifactId,
      multiRepResult.inlineRefUsages
    );
    // Intervention PR-γ — pair the misconception graph with cognitive-
    // science-grounded remediation moves (ADR 0044). Read-only harvest
    // BEFORE the LO/MultiRep transform passes that mutate the tree;
    // `<Intervention>` is rendered by React via its children, so the
    // extract pass reads body prose from `el.children` un-rewritten.
    indexAccumulator.addInterventions(
      unitId,
      artifactId,
      extractInterventions(tree, unitId)
    );

    // PR 10 print-polish: mark the first <GlossaryTerm> per slug per
    // chapter with `data-first-use="true"`. Downstream GlossaryTerm.tsx
    // reads the prop and renders an inline footnote span; the @media
    // print rules in textbook-layout.css reveal the span in print.
    markFirstUseGlossaryTerms(tree, unitId);

    // Sprint H follow-up — stamp `data-chapter-opener="true"` on the
    // first non-chrome h2 so the chapter-opening ornament rule in
    // textbook-layout.css fires. Done at remark-time (not as raw HTML
    // wrapper in MDX) so the heading stays markdown-syntax and remains
    // visible to Astro's heading extractor for the in-page ToC.
    markChapterOpener(tree);

    // Rewrite <LearningObjectives> AST shape so the React island
    // receives a props-driven `objectives` array instead of JSX
    // children (which Astro renders server-side as <astro-slot>
    // HTML, breaking children-mode interactivity). Runs last so all
    // read-only harvesters see the unmutated tree. See
    // docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md.
    transformLearningObjectives(tree, unitId);
    // Rewrite <MultiRep> AST shape on the same terminal pass — the
    // runtime <MultiRep> dispatches over a `reps` prop populated from
    // serialized child attrs, paralleling the LO pattern. Per the
    // 2026-05-17 MultiRep design hardening §D5.
    transformMultiRep(tree, unitId);
    // Inject `id={anchor}` on every `<Intervention>` so the rendered
    // <aside> carries the same anchor stored in the pedagogy-index
    // entry — hash navigation lands on the rendered DOM and the
    // :target outline fires. Runs after the read-only extractInterventions
    // (above) so the JSX-DFS numbering agrees.
    transformIntervention(tree, unitId);
    // Hoist <OMIFlow> slot children into explicit observable/model/
    // inference props (ADR 0063). The slot marker components return
    // null at runtime; without this transform Astro's MDX integration
    // discards the slot bodies before the outer <OMIFlow> runs. Same
    // shape + same shared parser as extractOMIFlows (above).
    transformOMIFlow(tree, unitId);
  };
}
