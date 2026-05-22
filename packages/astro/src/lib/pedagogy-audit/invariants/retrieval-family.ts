import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Wedge B1 retrieval-family audit invariants.
 *
 *   - **PRA-1** (Prereq Activation; WARN): every distinct `topic:`
 *     target_id surfaced via `<RetrievalPrompt>` or `<SpacedReview>`
 *     in a chapter should also have a `<SkillReview>` surface in the
 *     same chapter, signaling that the prereq concept was bridged.
 *     The full Unit-aware shape from the Wedge B1 plan §6 (every
 *     `UnitEntry.prereqs[]` has ≥1 SkillReview in the same Section or
 *     a prior one) is deferred until Section/Unit data lands in
 *     `PedagogyIndex`; this chapter-level approximation is the
 *     useful authoring nudge available against the current index.
 *
 *   - **RET-1** (Retrieval Coverage; INFO): every chapter with
 *     substantive pedagogy content (definitions, equations,
 *     key-insights, etc.) but zero retrieval-family surfaces emits an
 *     INFO finding suggesting recall opportunities are missing. The
 *     plan's word-count-per-surface ratio is deferred — chapter body
 *     text isn't carried in `PedagogyIndex` at audit time; this
 *     binary presence check is the useful nudge available now.
 *
 *   - **SR-1** (SpacedReview validity; ERROR): every
 *     `<SpacedReview target="prefix:slug">` callsite uses a known
 *     prefix (`eq:`/`gl:`/`misc:`/`lo:`/`ki:`/`topic:`); every
 *     `<SpacedReview section="...">` callsite is acknowledged as
 *     deferred (no Section collection in `PedagogyIndex` yet, so the
 *     section_id ref-validity check is skipped with a clarifying
 *     comment in the source). Misformed prefix-typed refs are reported
 *     as ERROR.
 */

const KNOWN_TARGET_PREFIXES = new Set([
  "eq",
  "gl",
  "misc",
  "lo",
  "ki",
  "topic",
]);

/**
 * Returns the prefix (left of the first `:`) when the string parses
 * as a prefix-typed pedagogy-graph ref; otherwise undefined.
 */
function parseTargetPrefix(target_id: string): string | undefined {
  const idx = target_id.indexOf(":");
  if (idx <= 0) return undefined;
  if (idx === target_id.length - 1) return undefined;
  return target_id.slice(0, idx);
}

export function checkRetrievalFamily(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  checkPRA1(index, sink);
  checkRET1(index, sink);
  checkSR1(index, sink);
}

/**
 * PRA-1: every distinct `topic:` target_id referenced via
 * RetrievalPrompt or SpacedReview in a chapter should also have a
 * SkillReview surface in the same chapter.
 */
function checkPRA1(index: PedagogyIndex, sink: FindingSink): void {
  // Build per-chapter sets of topic refs that:
  //   - appear in RetrievalPrompt OR SpacedReview targets
  //   - appear in SkillReview targets (the "covered" set)
  const topicRefsByChapter = new Map<string, Set<string>>();
  const skillCoverByChapter = new Map<string, Set<string>>();

  function addRef(map: Map<string, Set<string>>, chapter: string, ref: string) {
    let s = map.get(chapter);
    if (s === undefined) {
      s = new Set();
      map.set(chapter, s);
    }
    s.add(ref);
  }

  for (const e of index.retrievalPrompts) {
    if (parseTargetPrefix(e.target_id) === "topic") {
      addRef(topicRefsByChapter, e.chapter, e.target_id);
    }
  }
  for (const e of index.spacedReviews) {
    if (
      e.target_id !== undefined &&
      parseTargetPrefix(e.target_id) === "topic"
    ) {
      addRef(topicRefsByChapter, e.chapter, e.target_id);
    }
  }
  for (const e of index.skillReviews) {
    if (parseTargetPrefix(e.target_id) === "topic") {
      addRef(skillCoverByChapter, e.chapter, e.target_id);
    }
  }

  for (const [chapter, topicRefs] of topicRefsByChapter) {
    const covered = skillCoverByChapter.get(chapter) ?? new Set<string>();
    for (const ref of topicRefs) {
      if (covered.has(ref)) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "PRA-1",
        message: `PRA-1: chapter "${chapter}" surfaces topic prereq "${ref}" via <RetrievalPrompt> or <SpacedReview> but has no matching <SkillReview target="${ref}"> to bridge the prereq. Resolution: add a <SkillReview target="${ref}"> earlier in the chapter, or remove the reference if the prereq is genuinely off-scope.`,
        location: { chapter },
      });
    }
  }
}

/**
 * RET-1: every chapter with substantive pedagogy content but zero
 * retrieval-family surfaces emits an INFO finding.
 */
function checkRET1(index: PedagogyIndex, sink: FindingSink): void {
  // "Substantive pedagogy content" proxy: at least one of definitions,
  // equationCitations, keyInsights, misconceptions, deepDives, or omiFlows
  // in the chapter. Chapters that have only navigation entries (chapter
  // metadata, learning objectives) without any inline pedagogy aren't
  // candidates for retrieval coverage — they're roadmap-shaped.
  const chaptersWithContent = new Set<string>();
  for (const e of index.definitions) chaptersWithContent.add(e.chapter);
  for (const e of index.equationCitations) chaptersWithContent.add(e.chapter);
  for (const e of index.keyInsights) chaptersWithContent.add(e.chapter);
  for (const e of index.misconceptions) chaptersWithContent.add(e.chapter);
  for (const e of index.deepDives) chaptersWithContent.add(e.chapter);
  for (const e of index.omiFlows) chaptersWithContent.add(e.chapter);

  const chaptersWithRetrieval = new Set<string>();
  for (const e of index.retrievalPrompts) chaptersWithRetrieval.add(e.chapter);
  for (const e of index.spacedReviews) chaptersWithRetrieval.add(e.chapter);
  for (const e of index.skillReviews) chaptersWithRetrieval.add(e.chapter);

  // Sort for deterministic finding order across runs.
  const offenders = [...chaptersWithContent]
    .filter((c) => !chaptersWithRetrieval.has(c))
    .sort();
  for (const chapter of offenders) {
    sink.info.push({
      severity: "INFO",
      code: "RET-1",
      message: `RET-1: chapter "${chapter}" carries substantive pedagogy content (definitions / equations / key-insights / misconceptions / deep-dives / OMIFlows) but renders zero retrieval surfaces (<RetrievalPrompt>, <SpacedReview>, <SkillReview>). Consider adding at least one recall prompt to anchor the material.`,
      location: { chapter },
    });
  }
}

/**
 * SR-1: every <SpacedReview target=...> uses a known prefix; <SpacedReview
 * section=...> is acknowledged as deferred. Misformed prefix-typed refs
 * are reported as ERROR.
 */
function checkSR1(index: PedagogyIndex, sink: FindingSink): void {
  for (const e of index.spacedReviews) {
    if (e.target_id !== undefined) {
      const prefix = parseTargetPrefix(e.target_id);
      if (prefix === undefined) {
        sink.errors.push({
          severity: "ERROR",
          code: "SR-1",
          message: `SR-1: <SpacedReview target="${e.target_id}"> in chapter "${e.chapter}" is malformed — expected prefix-typed ref of the form "<prefix>:<slug>" with non-empty slug. Resolution: rewrite as e.g. "topic:logarithms" or "eq:stefan-boltzmann".`,
          location: { chapter: e.chapter, anchor: e.anchor },
        });
        continue;
      }
      if (!KNOWN_TARGET_PREFIXES.has(prefix)) {
        sink.errors.push({
          severity: "ERROR",
          code: "SR-1",
          message: `SR-1: <SpacedReview target="${e.target_id}"> in chapter "${e.chapter}" uses unknown prefix "${prefix}:". Known prefixes: ${[...KNOWN_TARGET_PREFIXES].sort().join(", ")}. Resolution: switch to a known prefix.`,
          location: { chapter: e.chapter, anchor: e.anchor },
        });
      }
    }
    // section_id ref-validity is deferred until Section collection lands
    // in PedagogyIndex (Wedge B-follow-up). No-op for B1.
  }
}
