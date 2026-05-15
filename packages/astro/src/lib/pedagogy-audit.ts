import type { PedagogyIndex } from "@sophie/core/schema";
import { slugify } from "@sophie/core/schema";

/**
 * Systematic build-time pedagogy audit pass (PR-C4 Task 8). Reads a
 * fully-populated `PedagogyIndex` snapshot and emits findings against
 * cross-cutting invariants that single-extractor defense-in-depth
 * cannot catch (undefined cross-refs, orphan definitions, registry
 * figures with zero usages, etc.).
 *
 * Three severity levels (PR-C4 decision #3, matches biome/eslint shape):
 *
 *   - `ERROR`   — exits non-zero; CI fails.
 *   - `WARNING` — printed to stdout; build continues.
 *   - `INFO`    — verbose-only; informational, not a defect.
 *
 * Invariant codes implemented in this module:
 *   D4  ERROR    Undefined `<GlossaryTerm name="X">`
 *   D5  WARNING  Orphan definition (zero `<GlossaryTerm>` references)
 *   E4  ERROR    Undefined `<EqRef slug="X">`
 *   F1  ERROR    `<Figure name="X">` for X not in figureRegistry
 *   F2  ERROR    `<FigureRef name="X">` for X not in figureRegistry
 *   F4  WARNING  Registry figure with zero `<Figure>` AND zero `<FigureRef>` usages
 *   C1  ERROR    `<ChapterRef slug="X">` for X not in chapters
 *   O1  ERROR    Duplicate objective `id` within a chapter (defense-in-depth;
 *                extractor.extractObjectives is the primary enforcement point)
 *   O2  WARNING  Chapter with zero objectives
 *   K1  INFO     Chapter with zero `<KeyInsight>`s (informational)
 *   MG1 ERROR    Cycle in `prerequisite_misconceptions` (DAG violation; ADR 0044)
 *   MG2 ERROR    `prerequisite_misconceptions` references a misconception not
 *                introduced in any earlier chapter (by the consumer-repo's
 *                declared chapter ordering — `ChapterEntry.order` when present,
 *                stable insertion order otherwise; ADR 0044)
 *   CS1 (schema) Chapter MDX lacks required `status:` frontmatter (enforced
 *                upstream at the `ChapterSchema` Zod layer — the audit never
 *                fires this code because the build fails earlier; ADR 0051).
 *   CS2 INFO     Chapter has `status: draft` — surfaces in audit so author
 *                knows what's excluded from the student build (ADR 0051).
 *
 * Not implemented in v1 (extractor-level defense-in-depth is sufficient
 * or the upstream component doesn't exist yet — see TODO markers):
 *   E1, E6, F3, F5, M1, M2 — extractor throws first; audit-level
 *                            parallel check deferred.
 *   M3 — orphan misconception heuristic; deferred until we have a
 *        usable signal beyond "no source-of-truth title".
 *   MG3, MG4, I1–I4 — require the `<Intervention>` component + Intervention
 *                    Library (ADR 0044 Artifacts 2 + 3); ship with that PR.
 *
 * The audit is pure: it never mutates the input index.
 */

export type Severity = "ERROR" | "WARNING" | "INFO";

export interface AuditFinding {
  severity: Severity;
  /** Short invariant code (e.g. "D4", "F1", "C1"). Stable across versions. */
  code: string;
  /** Human-readable explanation. May reference identifiers from the index. */
  message: string;
  /** Optional origin pointer for the finding. */
  location?: { chapter?: string; anchor?: string };
}

export interface AuditReport {
  errors: AuditFinding[];
  warnings: AuditFinding[];
  info: AuditFinding[];
}

/**
 * Optional inputs for the audit beyond the in-memory pedagogy index.
 * Threaded through TextbookLayout's audit call so the audit can surface
 * signals that aren't reachable from the (already-filtered) index — in
 * particular CS2 INFO, which reports `status: draft` chapters that
 * `getStudentChapters` excluded from the student build.
 */
export interface AuditExtras {
  /**
   * Slugs of chapters with `status: draft` (ADR 0051). The audit emits
   * one CS2 INFO finding per slug. Empty / undefined => no CS2 output.
   */
  draftChapterSlugs?: ReadonlyArray<string>;
}

/**
 * Run the audit pass against a snapshotted PedagogyIndex. Pure
 * function — never mutates the input.
 */
export function runPedagogyAudit(
  index: PedagogyIndex,
  extras: AuditExtras = {}
): AuditReport {
  const errors: AuditFinding[] = [];
  const warnings: AuditFinding[] = [];
  const info: AuditFinding[] = [];

  // Pre-compute lookup sets we reference multiple times.
  const definitionSlugs = new Set(index.definitions.map((d) => d.slug));
  const equationSlugs = new Set(index.equations.map((e) => e.slug));
  const figureRegistryNames = new Set(index.figureRegistry.map((f) => f.name));
  const chapterSlugs = new Set(index.chapters.map((c) => c.slug));

  // Inline-ref refKeys grouped by kind, plus a slug-normalized variant
  // for kind=glossary-term (definitions store slugs, GlossaryTerm names
  // are author-typed prose — match via slugify on both sides).
  const glossaryRefSlugs = new Set<string>();
  const eqRefKeys = new Set<string>();
  const figureRefKeys = new Set<string>();
  const chapterRefKeys = new Set<string>();

  for (const usage of index.inlineRefUsages) {
    switch (usage.kind) {
      case "glossary-term":
        glossaryRefSlugs.add(slugify(usage.refKey));
        break;
      case "eq-ref":
        eqRefKeys.add(usage.refKey);
        break;
      case "figure-ref":
        figureRefKeys.add(usage.refKey);
        break;
      case "chapter-ref":
        chapterRefKeys.add(usage.refKey);
        break;
    }
  }

  // ---------------------------------------------------------------------
  // D4 — undefined <GlossaryTerm name="X">
  // ---------------------------------------------------------------------
  // Slugify both sides so casing/whitespace differences (e.g. `name="Dark
  // matter"` vs `<Aside title="Dark Matter">`) don't trigger false ERRORs.
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "glossary-term") continue;
    const refSlug = slugify(usage.refKey);
    if (definitionSlugs.has(refSlug)) continue;
    errors.push({
      severity: "ERROR",
      code: "D4",
      message: `D4: <GlossaryTerm name="${usage.refKey}"> in chapter "${usage.chapter}" — no matching <Aside kind="definition"> found.`,
      location: { chapter: usage.chapter },
    });
  }

  // ---------------------------------------------------------------------
  // E4 — undefined <EqRef slug="X">
  // ---------------------------------------------------------------------
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "eq-ref") continue;
    if (equationSlugs.has(usage.refKey)) continue;
    errors.push({
      severity: "ERROR",
      code: "E4",
      message: `E4: <EqRef slug="${usage.refKey}"> in chapter "${usage.chapter}" — no matching <KeyEquation> found.`,
      location: { chapter: usage.chapter },
    });
  }

  // ---------------------------------------------------------------------
  // F1 — <Figure name="X"> for X not in figureRegistry
  // ---------------------------------------------------------------------
  // The extractor (`extractFigures`) records figureUsages without
  // validating the name against the registry — the registry isn't
  // visible to the extractor at MDX-parse time. The audit is the
  // first place we hold both pieces of state.
  for (const use of index.figureUsages) {
    if (figureRegistryNames.has(use.name)) continue;
    errors.push({
      severity: "ERROR",
      code: "F1",
      message: `F1: <Figure name="${use.name}"> in chapter "${use.chapter}" — name not present in figureRegistry. Resolution: add an entry to content/figures.ts, or fix the name typo.`,
      location: { chapter: use.chapter, anchor: use.anchor },
    });
  }

  // ---------------------------------------------------------------------
  // F2 — <FigureRef name="X"> for X not in figureRegistry
  // ---------------------------------------------------------------------
  // Different element type (FigureRef vs Figure), same name space.
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "figure-ref") continue;
    if (figureRegistryNames.has(usage.refKey)) continue;
    errors.push({
      severity: "ERROR",
      code: "F2",
      message: `F2: <FigureRef name="${usage.refKey}"> in chapter "${usage.chapter}" — name not present in figureRegistry.`,
      location: { chapter: usage.chapter },
    });
  }

  // ---------------------------------------------------------------------
  // C1 — <ChapterRef slug="X"> for unknown chapter slug
  // ---------------------------------------------------------------------
  for (const usage of index.inlineRefUsages) {
    if (usage.kind !== "chapter-ref") continue;
    if (chapterSlugs.has(usage.refKey)) continue;
    errors.push({
      severity: "ERROR",
      code: "C1",
      message: `C1: <ChapterRef slug="${usage.refKey}"> in chapter "${usage.chapter}" — no matching chapter in the chapters collection.`,
      location: { chapter: usage.chapter },
    });
  }

  // ---------------------------------------------------------------------
  // O1 — duplicate objective id within a chapter (defense-in-depth)
  // ---------------------------------------------------------------------
  // Primary enforcement is `extractObjectives` (PR-C4 Task 2 — throws on
  // duplicate-id within chapter). This audit-level check guards bypass
  // paths (e.g. external accumulator population in tests) by re-checking
  // the snapshotted state.
  const objectiveIdsByChapter = new Map<string, Map<string, number>>();
  for (const obj of index.objectives) {
    let bag = objectiveIdsByChapter.get(obj.chapter);
    if (!bag) {
      bag = new Map();
      objectiveIdsByChapter.set(obj.chapter, bag);
    }
    bag.set(obj.id, (bag.get(obj.id) ?? 0) + 1);
  }
  for (const [chapter, bag] of objectiveIdsByChapter) {
    for (const [id, count] of bag) {
      if (count < 2) continue;
      errors.push({
        severity: "ERROR",
        code: "O1",
        message: `O1: duplicate <Objective id="${id}"> within chapter "${chapter}" (${count} occurrences). Resolution: change one of the \`id\` props so each objective has a stable, unique id within the chapter.`,
        location: { chapter, anchor: `lo-${slugify(id)}` },
      });
    }
  }

  // ---------------------------------------------------------------------
  // D5 — orphan definition (WARNING)
  // ---------------------------------------------------------------------
  for (const def of index.definitions) {
    if (glossaryRefSlugs.has(def.slug)) continue;
    warnings.push({
      severity: "WARNING",
      code: "D5",
      message: `D5: definition "${def.term}" (slug "${def.slug}") in chapter "${def.chapter}" has zero <GlossaryTerm> references anywhere in the textbook.`,
      location: { chapter: def.chapter, anchor: def.anchor },
    });
  }

  // ---------------------------------------------------------------------
  // F4 — registry figure with zero usages (WARNING)
  // ---------------------------------------------------------------------
  const usedFigureNames = new Set<string>();
  for (const use of index.figureUsages) usedFigureNames.add(use.name);
  for (const usage of index.inlineRefUsages) {
    if (usage.kind === "figure-ref") usedFigureNames.add(usage.refKey);
  }
  for (const fig of index.figureRegistry) {
    if (usedFigureNames.has(fig.name)) continue;
    warnings.push({
      severity: "WARNING",
      code: "F4",
      message: `F4: figureRegistry entry "${fig.name}" has zero <Figure> and zero <FigureRef> usages anywhere in the textbook.`,
    });
  }

  // ---------------------------------------------------------------------
  // M3 — orphan misconception (heuristic; deferred to v2)
  // ---------------------------------------------------------------------
  // TODO(PR-C4 follow-up): the design doc flags M3 as a heuristic
  // ("orphan misconception with no source-of-truth title or id-derived
  // anchor"). The current extractor emits anchors for every
  // misconception (auto-generated `misc-N` fallback ensures this), so
  // the "anchor exists" axis is never null — every misconception is
  // technically navigable. A more useful M3 would track *referencing*
  // callsites the way D5 tracks definitions, but no `<MisconceptionRef>`
  // component exists in v1. Defer until that lands or until authoring
  // practice surfaces a different signal.

  // ---------------------------------------------------------------------
  // O2 — chapter with zero objectives (WARNING)
  // ---------------------------------------------------------------------
  const chaptersWithObjectives = new Set<string>();
  for (const obj of index.objectives) chaptersWithObjectives.add(obj.chapter);
  for (const ch of index.chapters) {
    if (chaptersWithObjectives.has(ch.slug)) continue;
    warnings.push({
      severity: "WARNING",
      code: "O2",
      message: `O2: chapter "${ch.slug}" has zero learning objectives. Pedagogical roll-up coverage will skip this chapter.`,
      location: { chapter: ch.slug },
    });
  }

  // ---------------------------------------------------------------------
  // K1 — chapters with zero <KeyInsight>s (INFO)
  // ---------------------------------------------------------------------
  const chaptersWithKeyInsights = new Set<string>();
  for (const ki of index.keyInsights) chaptersWithKeyInsights.add(ki.chapter);
  for (const ch of index.chapters) {
    if (chaptersWithKeyInsights.has(ch.slug)) continue;
    info.push({
      severity: "INFO",
      code: "K1",
      message: `K1: chapter "${ch.slug}" has zero <KeyInsight>s. Informational — not a defect.`,
      location: { chapter: ch.slug },
    });
  }

  // ---------------------------------------------------------------------
  // MG1 + MG2 — misconception-graph invariants (ADR 0044)
  // ---------------------------------------------------------------------
  // The misconception graph is distributively declared: each chapter's
  // `<Aside kind="misconception">` (or `<Callout variant="misconception">`)
  // carries the graph fields for that misconception. The audit walks the
  // pedagogy index, assembles the graph from the union of declarations,
  // and reports two integrity violations:
  //
  //   MG1 (ERROR) — a cycle in the prerequisite_misconceptions graph
  //                 (DAG violation; a curriculum bug — no valid sequencing).
  //   MG2 (ERROR) — a prerequisite references either (a) a misconception
  //                 that doesn't exist anywhere in the index (dangling ref)
  //                 or (b) a misconception introduced in the SAME or a
  //                 LATER chapter than the referring one (ordering
  //                 violation — prerequisites must be addressed in earlier
  //                 chapters).
  //
  // Chapter ordering source: the consumer-supplied `chapters` collection.
  // Entries with explicit `order` win; ties + missing-order entries fall
  // back to stable insertion order. Two misconceptions whose chapters
  // share the same order index are treated as "same position" — a
  // prerequisite that lives in a same-ordered chapter triggers MG2.
  // (Per ADR 0044 §Audit-invariants: "by the consumer-repo's declared
  // chapter ordering — typically `chapters.json` order or alphabetical
  // `module-NN/lecture-MM` sort".)
  if (index.misconceptions.length > 0) {
    // Build name → introducing chapter map. The misconception's `anchor`
    // is the slug we resolve against (matches the authoring shape: a
    // <Aside title="Universe with a center"> produces anchor
    // "universe-with-a-center"; cross-references use that same slug).
    const misconceptionByAnchor = new Map<
      string,
      { chapter: string; anchor: string }
    >();
    for (const m of index.misconceptions) {
      // First-seen wins. M2 (extractor-level) already prevents cross-
      // chapter explicit-id collisions; auto-anchors (`misc-N`) are
      // chapter-scoped so different chapters can both have a `misc-1`,
      // but those auto-anchors aren't valid reference targets across
      // chapters anyway — authors who want to declare a graph edge use
      // explicit slugs.
      if (!misconceptionByAnchor.has(m.anchor)) {
        misconceptionByAnchor.set(m.anchor, {
          chapter: m.chapter,
          anchor: m.anchor,
        });
      }
    }

    // Chapter ordering. Use ChapterEntry.order when present; fall back to
    // insertion-order index. Chapters not in the collection (which can
    // happen when a chapter's misconception declares a prereq but the
    // chapter itself isn't yet wired into the chapters collection)
    // get a sentinel ordering of +Infinity so they never look "earlier"
    // than anything else.
    const chapterOrder = new Map<string, number>();
    index.chapters.forEach((ch, i) => {
      chapterOrder.set(ch.slug, ch.order ?? i);
    });
    const orderOf = (chapter: string): number =>
      chapterOrder.has(chapter)
        ? (chapterOrder.get(chapter) as number)
        : Number.POSITIVE_INFINITY;

    // MG2 — dangling reference + earlier-chapter ordering check.
    for (const m of index.misconceptions) {
      const prereqs = m.prerequisite_misconceptions ?? [];
      for (const prereqAnchor of prereqs) {
        const target = misconceptionByAnchor.get(prereqAnchor);
        if (!target) {
          errors.push({
            severity: "ERROR",
            code: "MG2",
            message: `MG2: misconception "${m.anchor}" in chapter "${m.chapter}" declares prerequisite "${prereqAnchor}", but no misconception with that anchor is declared anywhere in the textbook. Resolution: either declare the prerequisite misconception in an earlier chapter, or remove the dangling reference.`,
            location: { chapter: m.chapter, anchor: m.anchor },
          });
          continue;
        }
        // Self-reference: a misconception listing itself as a prerequisite
        // is a degenerate cycle of length 1. MG1 catches it below too,
        // but we surface it as MG2 here for the clearer dangling-style
        // diagnostic since it's also "no earlier chapter introduces it".
        if (target.anchor === m.anchor && target.chapter === m.chapter) {
          // Skip — let MG1 surface it as a cycle.
          continue;
        }
        const prereqOrder = orderOf(target.chapter);
        const selfOrder = orderOf(m.chapter);
        if (!(prereqOrder < selfOrder)) {
          errors.push({
            severity: "ERROR",
            code: "MG2",
            message: `MG2: misconception "${m.anchor}" in chapter "${m.chapter}" declares prerequisite "${prereqAnchor}" (in chapter "${target.chapter}"), but that prerequisite is not introduced in an earlier chapter (by the chapters collection's declared order). Resolution: either reorder the chapters so the prerequisite is introduced first, or remove the prerequisite declaration.`,
            location: { chapter: m.chapter, anchor: m.anchor },
          });
        }
      }
    }

    // MG1 — cycle detection over the prerequisite graph. Iterative DFS
    // with WHITE/GRAY/BLACK coloring; an edge into a GRAY node closes a
    // cycle. Only edges whose target exists in the index are walked —
    // dangling edges are MG2's concern, not MG1's.
    const adjacency = new Map<string, string[]>();
    for (const m of index.misconceptions) {
      const targets: string[] = [];
      for (const prereqAnchor of m.prerequisite_misconceptions ?? []) {
        if (misconceptionByAnchor.has(prereqAnchor)) {
          targets.push(prereqAnchor);
        }
      }
      adjacency.set(m.anchor, targets);
    }
    // GRAY = on current DFS stack; BLACK = fully processed. WHITE is the
    // implicit "not in the map" state — no explicit value needed.
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    const reportedCycleSignatures = new Set<string>();
    for (const startAnchor of adjacency.keys()) {
      if (color.get(startAnchor) !== undefined) continue;
      // Iterative DFS stack of frames: [node, nextChildIndex].
      const stack: Array<{ node: string; i: number }> = [
        { node: startAnchor, i: 0 },
      ];
      color.set(startAnchor, GRAY);
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (!frame) break;
        const children = adjacency.get(frame.node) ?? [];
        if (frame.i >= children.length) {
          color.set(frame.node, BLACK);
          stack.pop();
          continue;
        }
        const next = children[frame.i];
        frame.i += 1;
        if (next === undefined) continue;
        const c = color.get(next);
        if (c === GRAY) {
          // Cycle. Reconstruct it from the stack between `next` and top.
          const cyclePath: string[] = [];
          let started = false;
          for (const f of stack) {
            if (f.node === next) started = true;
            if (started) cyclePath.push(f.node);
          }
          cyclePath.push(next);
          // Dedup cycles reported from different start points. Canonical
          // signature: rotate to the lexicographically smallest anchor
          // and join.
          const ring = cyclePath.slice(0, -1);
          let minIdx = 0;
          for (let k = 1; k < ring.length; k += 1) {
            const a = ring[k];
            const b = ring[minIdx];
            if (a !== undefined && b !== undefined && a < b) minIdx = k;
          }
          const rotated = [...ring.slice(minIdx), ...ring.slice(0, minIdx)];
          const sig = rotated.join(" -> ");
          if (!reportedCycleSignatures.has(sig)) {
            reportedCycleSignatures.add(sig);
            const home = misconceptionByAnchor.get(rotated[0] ?? next);
            errors.push({
              severity: "ERROR",
              code: "MG1",
              message: `MG1: cycle in prerequisite_misconceptions graph: ${rotated.join(" → ")} → ${rotated[0] ?? next}. Curriculum bug — a misconception cannot be both a prerequisite of another AND depend on it. Resolution: remove one of the prerequisite edges.`,
              location: home
                ? { chapter: home.chapter, anchor: home.anchor }
                : undefined,
            });
          }
        } else if (c === undefined) {
          color.set(next, GRAY);
          stack.push({ node: next, i: 0 });
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // CS2 — `status: draft` chapters (ADR 0051). INFO-level: drafts are a
  // healthy authoring state, but surfacing them in the audit lets the
  // author see exactly which chapters are excluded from the student
  // build. The slug list is threaded through `extras` (TextbookLayout
  // filters drafts BEFORE setChapters; the audit's `index.chapters` is
  // the student-visible subset, so the unfiltered slugs come from
  // outside the index).
  // ---------------------------------------------------------------------
  for (const slug of extras.draftChapterSlugs ?? []) {
    info.push({
      severity: "INFO",
      code: "CS2",
      message: `CS2: chapter "${slug}" has status: draft — excluded from the student build per ADR 0051.`,
      location: { chapter: slug },
    });
  }

  return { errors, warnings, info };
}

/** Pluralize "error/errors", "warning/warnings", "info" finding count for the summary line. */
function pluralize(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? "" : "s"}`;
}

/**
 * Format a finding as a single human-readable line. Shape:
 *   `  [SEVERITY code] message (chapter: X, anchor: Y)`
 */
function formatFinding(f: AuditFinding): string {
  const locParts: string[] = [];
  if (f.location?.chapter) locParts.push(`chapter: ${f.location.chapter}`);
  if (f.location?.anchor) locParts.push(`anchor: ${f.location.anchor}`);
  const loc = locParts.length > 0 ? ` (${locParts.join(", ")})` : "";
  return `  [${f.severity} ${f.code}] ${f.message}${loc}`;
}

/**
 * Format an AuditReport as a human-readable text block for stdout.
 * Prints a one-line summary on top followed by each finding on its
 * own line, grouped by severity.
 */
export function formatAuditReport(report: AuditReport): string {
  const header = `Pedagogy audit: ${pluralize(report.errors.length, "error")}, ${pluralize(
    report.warnings.length,
    "warning"
  )}, ${pluralize(report.info.length, "info")}`;
  const lines: string[] = [header];

  if (report.errors.length > 0) {
    lines.push("");
    for (const e of report.errors) lines.push(formatFinding(e));
  }
  if (report.warnings.length > 0) {
    lines.push("");
    for (const w of report.warnings) lines.push(formatFinding(w));
  }
  if (report.info.length > 0) {
    lines.push("");
    for (const i of report.info) lines.push(formatFinding(i));
  }

  return lines.join("\n");
}

/**
 * Map an AuditReport to a process exit code: 0 when there are no
 * errors, 1 when at least one error finding exists. Warnings and info
 * findings never fail the build.
 */
export function auditExitCode(report: AuditReport): 0 | 1 {
  return report.errors.length > 0 ? 1 : 0;
}
