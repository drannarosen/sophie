import { readFileSync } from "node:fs";
import {
  type EquationRegistryEntry,
  EquationRegistryEntrySchema,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { parse as parseYaml } from "yaml";
import { indexAccumulator } from "./accumulator.ts";
import { extractDeepDives } from "./extractors/deep-dives.ts";
import { extractDefinitions } from "./extractors/definitions.ts";
import { extractEquationCitations } from "./extractors/equation-citations.ts";
import { extractEquationRegistryDeclaration } from "./extractors/equation-registry.ts";
import { extractFigures } from "./extractors/figures.ts";
import { extractInlineRefUsages } from "./extractors/inline-refs.ts";
import { extractInterventions } from "./extractors/interventions.ts";
import { extractKeyInsights } from "./extractors/key-insights.ts";
import { extractMisconceptions } from "./extractors/misconceptions.ts";
import { extractMultiReps } from "./extractors/multireps.ts";
import { extractObjectives } from "./extractors/objectives.ts";
import { extractOMIFlows } from "./extractors/omi-flow.ts";
import { markFirstUseGlossaryTerms } from "./transforms/first-use-glossary.ts";
import { transformIntervention } from "./transforms/intervention.ts";
import { transformLearningObjectives } from "./transforms/learning-objectives.ts";
import { transformMultiRep } from "./transforms/multirep.ts";

/**
 * Default chapter-slug deriver. Matches Astro 6's glob-loader
 * default: the chapter id is the file's BASENAME, without the
 * `.mdx` extension. For
 * `examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx`
 * this yields `"spoiler-alerts"` (matching the URL slug at
 * `/chapters/spoiler-alerts`).
 *
 * Consumer apps with non-default content layouts (e.g. a glob
 * loader configured with `generateId: ...`) pass their own
 * `getChapterSlug` to `pedagogyIndexRemarkPlugin()`.
 */
function defaultGetChapterSlug(filePath: string): string | undefined {
  const match = filePath.match(/[/\\]([^/\\]+)\.mdx$/);
  if (!match) return undefined;
  return match[1];
}

/**
 * Path-detection helpers per ADR 0060. The remark plugin routes
 * `content/chapters/**` and `content/equations/**` to different
 * walkers (chapter citations vs registry declarations); other paths
 * are skipped. Pattern matches both POSIX (`/`) and Windows (`\\`)
 * separators.
 */
const CHAPTER_PATH_RE = /[/\\]content[/\\]chapters[/\\]/;
const EQUATION_REGISTRY_PATH_RE = /[/\\]content[/\\]equations[/\\]/;

function isChapterFilePath(filePath: string): boolean {
  return CHAPTER_PATH_RE.test(filePath);
}

function isEquationRegistryFilePath(filePath: string): boolean {
  return EQUATION_REGISTRY_PATH_RE.test(filePath);
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

    // Chapter pass. Two routes to chapterSlug:
    //   1. Caller-provided `options.getChapterSlug` — consumer apps with
    //      non-standard layouts (e.g. tests passing arbitrary paths)
    //      assert "treat this file as a chapter MDX and use slug X."
    //   2. Default basename-from-path + `content/chapters/**` filter —
    //      avoids mis-typed extraction on `examples/` sandbox files or
    //      docs MDX that aren't part of any chapter collection.
    let chapterSlug: string | undefined;
    if (options.getChapterSlug) {
      chapterSlug = options.getChapterSlug(filePath);
    } else if (isChapterFilePath(filePath)) {
      chapterSlug = defaultGetChapterSlug(filePath);
    }
    if (!chapterSlug) return;

    indexAccumulator.clearChapter(chapterSlug);
    indexAccumulator.addDefinitions(extractDefinitions(tree, chapterSlug));
    indexAccumulator.addEquationCitations(
      extractEquationCitations(tree, chapterSlug)
    );
    indexAccumulator.addKeyInsights(extractKeyInsights(tree, chapterSlug));
    indexAccumulator.addFigureUsages(extractFigures(tree, chapterSlug));
    indexAccumulator.addMisconceptions(
      extractMisconceptions(tree, chapterSlug)
    );
    // ADR 0058 §R-deep-dive — <Callout variant="deep-dive"> tracking
    // (PR-B follow-up to PR-A's renderer surface). The-more-you-know
    // callouts are intentionally NOT walked.
    indexAccumulator.addDeepDives(extractDeepDives(tree, chapterSlug));
    // ADR 0063 — A8 <OMIFlow> composite primitive. Extractor walks
    // future <OMIFlow> JSX and emits OMIFlowEntry rows; no callsites
    // exist yet (the React component lands in PR-B), so this is a
    // no-op until then.
    indexAccumulator.addOMIFlows(extractOMIFlows(tree, chapterSlug));
    indexAccumulator.addObjectives(extractObjectives(tree, chapterSlug));
    indexAccumulator.addInlineRefUsages(
      extractInlineRefUsages(tree, chapterSlug)
    );
    indexAccumulator.addMultiReps(extractMultiReps(tree, chapterSlug));
    // Intervention PR-γ — pair the misconception graph with cognitive-
    // science-grounded remediation moves (ADR 0044). Read-only harvest
    // BEFORE the LO/MultiRep transform passes that mutate the tree;
    // `<Intervention>` is rendered by React via its children, so the
    // extract pass reads body prose from `el.children` un-rewritten.
    indexAccumulator.addInterventions(extractInterventions(tree, chapterSlug));

    // PR 10 print-polish: mark the first <GlossaryTerm> per slug per
    // chapter with `data-first-use="true"`. Downstream GlossaryTerm.tsx
    // reads the prop and renders an inline footnote span; the @media
    // print rules in textbook-layout.css reveal the span in print.
    markFirstUseGlossaryTerms(tree, chapterSlug);

    // Rewrite <LearningObjectives> AST shape so the React island
    // receives a props-driven `objectives` array instead of JSX
    // children (which Astro renders server-side as <astro-slot>
    // HTML, breaking children-mode interactivity). Runs last so all
    // read-only harvesters see the unmutated tree. See
    // docs/plans/2026-05-14-lo-checkbox-remark-extraction-design.md.
    transformLearningObjectives(tree, chapterSlug);
    // Rewrite <MultiRep> AST shape on the same terminal pass — the
    // runtime <MultiRep> dispatches over a `reps` prop populated from
    // serialized child attrs, paralleling the LO pattern. Per the
    // 2026-05-17 MultiRep design hardening §D5.
    transformMultiRep(tree, chapterSlug);
    // Inject `id={anchor}` on every `<Intervention>` so the rendered
    // <aside> carries the same anchor stored in the pedagogy-index
    // entry — hash navigation lands on the rendered DOM and the
    // :target outline fires. Runs after the read-only extractInterventions
    // (above) so the JSX-DFS numbering agrees.
    transformIntervention(tree, chapterSlug);
  };
}
