import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Retrieval-family audit invariants (Wedge B1 + Wedge B-followup W1).
 *
 *   - **PRA-1** (Prereq Activation; WARN): every `UnitEntry.prereqs[]`
 *     topic_id must be covered by ≥1 `<SkillReview target="topic:…">`
 *     in the same Section OR any prior Section (by `Section.order`).
 *     Per Wedge B-followup W1 design doc D1 (no chapter-level fallback;
 *     consumers without Units skip PRA-1).
 *
 *   - **RET-1** (Retrieval Coverage; INFO): every chapter with
 *     substantive pedagogy content (definitions, equations,
 *     key-insights, etc.) but zero retrieval-family surfaces emits an
 *     INFO finding suggesting recall opportunities are missing.
 *
 *   - **SR-1** (SpacedReview validity; ERROR): every
 *     `<SpacedReview target="prefix:slug">` callsite uses a known
 *     prefix (`eq:`/`gl:`/`misc:`/`lo:`/`ki:`/`topic:`); every
 *     `<SpacedReview section="<slug>">` callsite resolves to a known
 *     `SectionEntry.slug` in `PedagogyIndex.sections`. Misformed
 *     prefix-typed refs and unknown section slugs are reported as
 *     ERROR.
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
 * PRA-1: for each `UnitEntry`, every `topic_id` in `prereqs[]` must be
 * covered by at least one `<SkillReview target="topic:<prereq>">` in
 * the same Section OR any prior Section (by `Section.order`). Lookup
 * chain: `unit.section_id → section.order → cover-set for that order
 * and below`.
 *
 * Consumers without Units produce no PRA-1 findings — the invariant
 * is opt-in via authoring Units per ADR 0067.
 */
function checkPRA1(index: PedagogyIndex, sink: FindingSink): void {
  // section.slug -> section.order
  const sectionOrder = new Map<string, number>();
  for (const s of index.sections) sectionOrder.set(s.slug, s.order);

  // unit.id -> section.order (via unit.section_id → section.order); the
  // per-callsite entries (sr, etc.) carry the parent-unit id in `entry.unit`
  // and look it up against this map.
  const unitSectionOrder = new Map<string, number>();
  for (const u of index.units) {
    const ord = sectionOrder.get(u.section_id);
    if (ord !== undefined) unitSectionOrder.set(u.id, ord);
  }

  // section.order -> Set<topic target_id> of SkillReviews in chapters
  // bound to that order. Per ADR 0079 §"PRA-1 graduation": coverage
  // is checked at TOPIC granularity; the optional `#card` fragment
  // is addressing detail and is stripped here so
  // `topic:exponents#power-laws` covers a prereq of "exponents".
  const coverByOrder = new Map<number, Set<string>>();
  for (const sr of index.skillReviews) {
    if (parseTargetPrefix(sr.target_id) !== "topic") continue;
    const ord = unitSectionOrder.get(sr.unit);
    if (ord === undefined) continue;
    let s = coverByOrder.get(ord);
    if (s === undefined) {
      s = new Set();
      coverByOrder.set(ord, s);
    }
    const hashIdx = sr.target_id.indexOf("#");
    const topicOnly =
      hashIdx === -1 ? sr.target_id : sr.target_id.slice(0, hashIdx);
    s.add(topicOnly);
  }

  for (const unit of index.units) {
    const unitOrd = sectionOrder.get(unit.section_id);
    if (unitOrd === undefined) continue;
    // Per ADR 0053: audit_overrides on the Unit can suppress PRA-1
    // findings (grain-1 whole-invariant when anchor omitted; grain-2
    // per-anchor when anchor matches the prereq's topic id).
    const overrides = unit.audit_overrides ?? [];
    const overridesAll = overrides.some(
      (o) => o.invariant === "PRA-1" && !o.anchor,
    );
    const overriddenAnchors = new Set(
      overrides
        .filter((o) => o.invariant === "PRA-1" && o.anchor)
        .map((o) => o.anchor as string),
    );
    if (overridesAll) continue;
    for (const prereq of unit.prereqs) {
      if (overriddenAnchors.has(prereq)) continue;
      const target = `topic:${prereq}`;
      let covered = false;
      for (const [ord, covers] of coverByOrder) {
        if (ord <= unitOrd && covers.has(target)) {
          covered = true;
          break;
        }
      }
      if (covered) continue;
      // W4b graduation per ADR 0079 §"PRA-1 graduation": WARN → ERROR.
      // Authors opt out per-callsite via `audit_overrides` (ADR 0053).
      sink.errors.push({
        severity: "ERROR",
        code: "PRA-1",
        message: `PRA-1: Unit "${unit.id}" in Section "${unit.section_id}" declares prereq "${prereq}" but no <SkillReview target="topic:${prereq}"> exists in this Section or any prior Section. Resolution: (a) add a <SkillReview target="topic:${prereq}"> in this Section or an earlier one, OR (b) remove the prereq if the topic is genuinely off-scope, OR (c) add an audit_overrides entry on this Unit declaring \`invariant: PRA-1, anchor: ${prereq}\` with a TDR-backed reason (per ADR 0053).`,
        location: { unit: unit.id, anchor: prereq },
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
  const unitsWithContent = new Set<string>();
  for (const e of index.definitions) unitsWithContent.add(e.unit);
  for (const e of index.equationCitations) unitsWithContent.add(e.unit);
  for (const e of index.keyInsights) unitsWithContent.add(e.unit);
  for (const e of index.misconceptions) unitsWithContent.add(e.unit);
  for (const e of index.deepDives) unitsWithContent.add(e.unit);
  for (const e of index.omiFlows) unitsWithContent.add(e.unit);

  const unitsWithRetrieval = new Set<string>();
  for (const e of index.retrievalPrompts) unitsWithRetrieval.add(e.unit);
  for (const e of index.spacedReviews) unitsWithRetrieval.add(e.unit);
  for (const e of index.skillReviews) unitsWithRetrieval.add(e.unit);

  // Sort for deterministic finding order across runs.
  const offenders = [...unitsWithContent]
    .filter((c) => !unitsWithRetrieval.has(c))
    .sort();
  for (const unitId of offenders) {
    sink.info.push({
      severity: "INFO",
      code: "RET-1",
      // CLI prefix word "chapter:" preserved per W3/D2 (educator vocabulary)
      message: `RET-1: chapter "${unitId}" carries substantive pedagogy content (definitions / equations / key-insights / misconceptions / deep-dives / OMIFlows) but renders zero retrieval surfaces (<RetrievalPrompt>, <SpacedReview>, <SkillReview>). Consider adding at least one recall prompt to anchor the material.`,
      location: { unit: unitId },
    });
  }
}

/**
 * SR-1: `<SpacedReview>` ref-validity.
 *
 * - `target="prefix:slug"` refs: prefix must be known and slug must be
 *   non-empty. Malformed refs are reported as ERROR.
 *
 * - `section="<slug>"` refs: the section slug must match a known
 *   `SectionEntry.slug` in `PedagogyIndex.sections`. Unknown slugs are
 *   reported as ERROR. Per Wedge B-followup W1 design doc D1.
 */
function checkSR1(index: PedagogyIndex, sink: FindingSink): void {
  const knownSections = new Set(index.sections.map((s) => s.slug));
  for (const e of index.spacedReviews) {
    if (e.target_id !== undefined) {
      const prefix = parseTargetPrefix(e.target_id);
      if (prefix === undefined) {
        sink.errors.push({
          severity: "ERROR",
          code: "SR-1",
          message: `SR-1: <SpacedReview target="${e.target_id}"> in chapter "${e.unit}" is malformed — expected prefix-typed ref of the form "<prefix>:<slug>" with non-empty slug. Resolution: rewrite as e.g. "topic:logarithms" or "eq:stefan-boltzmann".`,
          location: { unit: e.unit, anchor: e.anchor },
        });
        continue;
      }
      if (!KNOWN_TARGET_PREFIXES.has(prefix)) {
        sink.errors.push({
          severity: "ERROR",
          code: "SR-1",
          message: `SR-1: <SpacedReview target="${e.target_id}"> in chapter "${e.unit}" uses unknown prefix "${prefix}:". Known prefixes: ${[...KNOWN_TARGET_PREFIXES].sort().join(", ")}. Resolution: switch to a known prefix.`,
          location: { unit: e.unit, anchor: e.anchor },
        });
      }
    }
    if (e.section_id !== undefined && !knownSections.has(e.section_id)) {
      sink.errors.push({
        severity: "ERROR",
        code: "SR-1",
        message: `SR-1: <SpacedReview section="${e.section_id}"> in chapter "${e.unit}" refers to an unknown section slug. Resolution: ensure src/content/sections/${e.section_id}.json exists with a matching slug, or fix the ref to point at an existing section.`,
        location: { unit: e.unit, anchor: e.anchor },
      });
    }
  }
}
