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
 *
 * Not implemented in v1 (extractor-level defense-in-depth is sufficient
 * or the heuristic is too speculative — see TODO markers):
 *   E1, E6, F3, F5, M1, M2 — extractor throws first; audit-level
 *                            parallel check deferred.
 *   M3 — orphan misconception heuristic; deferred until we have a
 *        usable signal beyond "no source-of-truth title".
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
 * Run the audit pass against a snapshotted PedagogyIndex. Pure
 * function — never mutates the input.
 */
export function runPedagogyAudit(index: PedagogyIndex): AuditReport {
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
