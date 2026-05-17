import { existsSync } from "node:fs";
import { relative as relativePath, resolve as resolvePath } from "node:path";
import type {
  AuditFinding,
  NotationRegistry,
  PedagogyIndex,
} from "@sophie/core/schema";
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
 *   V0  ERROR    Validation block failed schema parse (extractor-layer;
 *                surfaced into the audit report via index.extractorFindings;
 *                ADR 0056 PR 3).
 *   V1  ERROR    ADR missing a validation block (ADR 0056 PR 6 promotion;
 *                was WARNING in PRs 3–5 during the bulk-migration grace
 *                window).
 *   V2  ERROR    Reference doc missing a validation block (ADR 0056 PR 6
 *                promotion; was WARNING in PRs 3–5).
 *   V3  ERROR    status is "validated" or "re-validation-needed" but
 *                last_validated_date is null. Defense-in-depth: schema's
 *                refine() catches this at parse time, V0 surfaces parse
 *                failures; V3 here covers bypassed-extractor inputs.
 *   V4  ERROR    status is "unvalidated" but evidence or
 *                last_validated_date is non-empty (ADR 0056 PR 3).
 *   V5  ERROR    Evidence ref does not exist on disk. Refs are repo-root-
 *                relative; resolved via AuditExtras.repoRoot (default:
 *                process.cwd()).
 *   V6  ERROR    Evidence date is not a valid ISO YYYY-MM-DD (ADR 0056 PR 3).
 *   V7  WARNING  last_validated_date is in the future, date-only ISO
 *                compare (ADR 0056 PR 3).
 *   V8  INFO     Validation block has an unknown key (extractor-layer;
 *                Zod 4 .strip() silently drops them, V8 surfaces typos
 *                like `last_validation_date`; ADR 0056 PR 3).
 *   NR2 INFO     Notation Registry concept declared but no chapter
 *                references it (orphan registry entry; ADR 0043).
 *                Reference signal at v1 = MultiRep `concept=`; future
 *                also counts KeyEquation `symbols` (PR-δ') + EquationBiography
 *                `<CommonMisuse>` cross-refs.
 *   MR1 ERROR    `<MultiRep concept="X">` references a concept not present
 *                in `notation-registry.yaml` (ADR 0043).
 *   MR2 WARNING  `<MultiRep><RepEquation symbol="…">` doesn't match the
 *                bound concept's `canonical_symbol` in the registry
 *                (ADR 0043).
 *   MR4 INFO     `<MultiRep><RepFigure refName="…">` referenced figure's
 *                alt text doesn't mention the concept's `verbal_label`
 *                or `canonical_symbol` (ADR 0043).
 *   MR6 INFO     `<MultiRep><RepEquation equivalent_to="X">` doesn't
 *                resolve to a `<KeyEquation>` in the chapter's equation
 *                index or to another `<RepEquation>` in the same
 *                MultiRep (chapter-scoped at v1; ADR 0043 §R-MR6).
 *
 * The NR/MR invariants only fire when the consumer repo opts in via
 * `pedagogy-contract.yaml.math_and_units_standards.notation_registry`
 * (per ADR 0042 + ADR 0043 §opt-in). Pass the loaded registry via
 * `AuditExtras.notationRegistry`; absent / null = invariants skipped.
 *
 * Not implemented in v1 (extractor-level defense-in-depth is sufficient
 * or the upstream component doesn't exist yet — see TODO markers):
 *   E1, E6, F3, F5, M1, M2 — extractor throws first; audit-level
 *                            parallel check deferred.
 *   M3 — orphan misconception heuristic; deferred until we have a
 *        usable signal beyond "no source-of-truth title".
 *   MG3, MG4, I1–I4 — require the `<Intervention>` component + Intervention
 *                    Library (ADR 0044 Artifacts 2 + 3); ship with that PR.
 *   NR1, NR3, NR4 — require per-equation `symbols` metadata on
 *                   `EquationEntrySchema` (deferred to PR-δ' per the
 *                   2026-05-17 scope decision; KeyEquation doesn't yet
 *                   carry the `symbols` field). The audit's NR2 + MR-prefix
 *                   invariants ship in PR-δ against already-extracted data.
 *   MR3, MR5 — RepCode deferred per ADR 0043 §R1 (pending CodeCell, ADR 0018).
 *
 * The audit is pure: it never mutates the input index.
 */

// `Severity` and `AuditFinding` moved to `@sophie/core/schema` (PR 3
// of ADR 0056) so the `PedagogyIndexSchema.extractorFindings` slot can
// reference the canonical shape. The runtime audit module keeps a
// local alias for `Severity` for diff-minimal call-site compatibility.
export type Severity = AuditFinding["severity"];
export type { AuditFinding };

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
  /**
   * Repo-root path against which evidence refs in `contractValidations`
   * are resolved (V5 — ADR 0056). Defaults to `process.cwd()` when
   * omitted, which is correct for the production caller
   * (`TextbookLayout.astro` runs at the consumer-app cwd, which IS the
   * repo root). Tests that exercise V5 (i.e. construct fixtures with
   * non-null `evidence[].ref`) MUST pass an explicit `repoRoot` — the
   * V5 loop throws if it would otherwise fall through to `process.cwd()`
   * with non-null refs, since that would silently existence-check
   * against the wrong filesystem.
   */
  repoRoot?: string;
  /**
   * Loaded Notation Registry per ADR 0043 + 2026-05-17 design hardening.
   * When `null` or absent, the NR/MR invariants are skipped (consumer
   * hasn't opted in via
   * `pedagogy-contract.yaml.math_and_units_standards.notation_registry`).
   * Threaded from `TextbookLayout.astro` (PR-ε wire-up): the layout
   * calls `loadConsumerRegistry(consumerRoot)`, pushes the registry
   * into the accumulator via `setNotationRegistry`, and passes it here
   * as the audit's NR/MR input. Tests construct fixtures inline (no
   * accumulator round-trip required).
   */
  notationRegistry?: NotationRegistry | null;
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

  // ---------------------------------------------------------------------
  // V0 + V8 — extractor findings (ADR 0056 PR 3). The contract-
  // validations extractor (validation-extractor.ts) reads each ADR /
  // reference doc's raw frontmatter; it emits V0 (schema parse failure,
  // ERROR) when ValidationSchema.safeParse fails, and V8 (unknown key,
  // INFO) when a key falls outside KNOWN_VALIDATION_KEYS. Those findings
  // ride on PedagogyIndex.extractorFindings and merge into the audit
  // report here so all validation-tracker findings surface in one place.
  // ---------------------------------------------------------------------
  for (const finding of index.extractorFindings) {
    if (finding.severity === "ERROR") {
      errors.push(finding);
    } else if (finding.severity === "WARNING") {
      warnings.push(finding);
    } else {
      info.push(finding);
    }
  }

  // ---------------------------------------------------------------------
  // V1–V7 — validation audit invariants (ADR 0056 PR 3). Each entry on
  // `index.contractValidations` is one ADR or reference doc. Severity
  // assignments per ADR 0056 §"Invariant catalog":
  //
  //   V1  ERROR    ADR missing a validation block (promoted from WARNING in
  //                PR 6 after the bulk migration in PR #44 guaranteed coverage).
  //   V2  ERROR    Reference doc missing a validation block (promoted from
  //                WARNING in PR 6).
  //   V3  ERROR    status=validated/re-validation-needed but
  //                last_validated_date is null. Defense-in-depth: the
  //                schema's V3 refinement (PR #43) catches this at parse
  //                time, and extractor V0 surfaces parse failures. V3
  //                here guards inputs that bypass both (direct
  //                ContractValidationEntry construction in tests, future
  //                synthesizers).
  //   V4  ERROR    status=unvalidated but evidence or last_validated_date
  //                is non-empty.
  //   V5  ERROR    evidence ref does not resolve on disk. Refs are
  //                repo-root-relative; resolved via extras.repoRoot.
  //   V6  ERROR    evidence date is not a valid ISO YYYY-MM-DD.
  //   V7  WARNING  last_validated_date is in the future (date-only ISO
  //                compare — TZ-stable).
  // ---------------------------------------------------------------------
  // V5 safety: if any contract has non-null evidence refs and the caller
  // didn't pass `repoRoot` explicitly, fail loudly rather than silently
  // existence-check against `process.cwd()` (which would be the harness's
  // cwd in tests — wrong filesystem). The production caller in
  // TextbookLayout.astro always passes `repoRoot`, so this only fires
  // for test fixtures that exercise V5 without setting it up.
  if (extras.repoRoot === undefined) {
    const v5Hit = index.contractValidations.find(
      (entry) =>
        entry.validation?.evidence.some((ev) => ev.ref !== null) ?? false
    );
    if (v5Hit !== undefined) {
      throw new Error(
        `runPedagogyAudit: contractValidations contain non-null evidence refs (first hit: ${v5Hit.path}) but no repoRoot was passed in AuditExtras. Refs are repo-root-relative and cannot be existence-checked deterministically without it. Pass extras.repoRoot explicitly.`
      );
    }
  }
  const repoRoot = extras.repoRoot ?? process.cwd();
  const today = todayIsoDate();
  for (const entry of index.contractValidations) {
    if (
      !entry.validation &&
      entry.path.startsWith("docs/website/decisions/") &&
      !entry.path.endsWith("/template.md")
    ) {
      errors.push({
        severity: "ERROR",
        code: "V1",
        message: `V1: ADR is missing a validation block: ${entry.path}`,
        location: { path: entry.path },
      });
    }

    if (!entry.validation && entry.path.startsWith("docs/website/reference/")) {
      errors.push({
        severity: "ERROR",
        code: "V2",
        message: `V2: reference doc is missing a validation block: ${entry.path}`,
        location: { path: entry.path },
      });
    }

    if (!entry.validation) continue;
    const v = entry.validation;

    // V3 — defense-in-depth. See header comment above.
    if (
      (v.status === "validated" || v.status === "re-validation-needed") &&
      v.last_validated_date === null
    ) {
      errors.push({
        severity: "ERROR",
        code: "V3",
        message: `V3: ${entry.path}: status is "${v.status}" but last_validated_date is null.`,
        location: { path: entry.path },
      });
    }

    if (
      v.status === "unvalidated" &&
      (v.evidence.length > 0 || v.last_validated_date !== null)
    ) {
      errors.push({
        severity: "ERROR",
        code: "V4",
        message: `V4: ${entry.path}: status is "unvalidated" but evidence or last_validated_date is non-empty.`,
        location: { path: entry.path },
      });
    }

    for (const ev of v.evidence) {
      // V5 — null refs are deferred-evidence sentinels (intentional,
      // schema-permitted); only non-null refs are existence-checked.
      //
      // Path-escape guard: `path.resolve(repoRoot, ref)` discards
      // `repoRoot` when `ref` is absolute, and follows `..` segments
      // unbounded. Without this guard, `ref: "/etc/hosts"` or
      // `ref: "../../../etc/hosts"` would pass V5 silently against any
      // host with that file present — a correctness bug, even if not a
      // security risk under Sophie's trust model (refs are author-
      // controlled by maintainers, not untrusted contributors).
      if (ev.ref !== null) {
        const resolved = resolvePath(repoRoot, ev.ref);
        const rel = relativePath(repoRoot, resolved);
        const escapes =
          rel.startsWith("..") || rel === "" || resolvePath(rel) === resolved;
        if (escapes) {
          errors.push({
            severity: "ERROR",
            code: "V5",
            message: `V5: ${entry.path}: evidence ref must be repo-root-relative (got an absolute or escaping path): ${ev.ref}`,
            location: { path: entry.path },
          });
        } else if (!existsSync(resolved)) {
          errors.push({
            severity: "ERROR",
            code: "V5",
            message: `V5: ${entry.path}: evidence ref does not exist on disk: ${ev.ref}`,
            location: { path: entry.path },
          });
        }
      }

      // V6 — null dates are permitted (deferred evidence); only non-null
      // dates are format-checked.
      if (ev.date !== null && !isValidIsoDate(ev.date)) {
        errors.push({
          severity: "ERROR",
          code: "V6",
          message: `V6: ${entry.path}: evidence date is not a valid ISO YYYY-MM-DD: ${ev.date}`,
          location: { path: entry.path },
        });
      }
    }

    // V7 — date-only string compare against today's ISO date is
    // timezone-stable (no Date.parse interpretation involved).
    if (v.last_validated_date !== null && v.last_validated_date > today) {
      warnings.push({
        severity: "WARNING",
        code: "V7",
        message: `V7: ${entry.path}: last_validated_date is in the future: ${v.last_validated_date}`,
        location: { path: entry.path },
      });
    }
  }

  // ---------------------------------------------------------------------
  // NR / MR — Notation Registry + MultiRep alignment invariants (ADR 0043)
  // ---------------------------------------------------------------------
  // Gated on opt-in: the consumer must declare
  // `pedagogy-contract.yaml.math_and_units_standards.notation_registry`
  // (loader: `notation-registry-loader.ts`). When `notationRegistry` is
  // null the NR/MR block is skipped wholesale.
  const notationRegistry = extras.notationRegistry ?? null;
  if (notationRegistry !== null) {
    const conceptsById = new Map(
      notationRegistry.concepts.map((c) => [c.id, c])
    );
    // Filter to registry-known concepts so the set's name matches its
    // contents — otherwise typo-bound MultiReps (which MR1 already
    // flags) would silently appear here, and any future invariant
    // that consumes the set (e.g., a v2 "almost-referenced" heuristic
    // via Levenshtein distance on concept ids) would pick up garbage.
    // NR2 only reads via `.has(c.id)` where `c.id` is registry-known,
    // so the filter is defensive today and load-bearing tomorrow.
    const referencedConceptIds = new Set(
      index.multiReps
        .filter((m) => conceptsById.has(m.concept))
        .map((m) => m.concept)
    );

    // -------------------------------------------------------------------
    // MR1 ERROR — <MultiRep concept="X"> for X not in registry
    // -------------------------------------------------------------------
    for (const mr of index.multiReps) {
      if (conceptsById.has(mr.concept)) continue;
      errors.push({
        severity: "ERROR",
        code: "MR1",
        message: `MR1: <MultiRep concept="${mr.concept}"> in chapter "${mr.chapter}" — concept not present in notation-registry.yaml. Resolution: declare the concept (per docs/website/reference/notation-registry-schema.md), or fix the concept slug typo.`,
        location: { chapter: mr.chapter, anchor: mr.id },
      });
    }

    // -------------------------------------------------------------------
    // MR2 WARNING — <RepEquation symbol="…"> doesn't match the bound
    //               concept's canonical_symbol
    // -------------------------------------------------------------------
    // v1 only checks against `canonical_symbol`; alias support lands
    // when registry concepts grow an explicit `aliases?: string[]`
    // field (deferred — out of scope for PR-δ).
    for (const mr of index.multiReps) {
      const concept = conceptsById.get(mr.concept);
      if (!concept) continue; // MR1 already fired for this case.
      for (const rep of mr.reps) {
        if (rep.kind !== "equation") continue;
        if (rep.symbol === concept.canonical_symbol) continue;
        warnings.push({
          severity: "WARNING",
          code: "MR2",
          message: `MR2: <MultiRep concept="${mr.concept}"> in chapter "${mr.chapter}" — <RepEquation refKey="${rep.refKey}" symbol="${rep.symbol}"> doesn't match the registry's canonical_symbol "${concept.canonical_symbol}". Resolution: change the rep's symbol to match the registry, or update the registry if the symbol drifted intentionally.`,
          location: { chapter: mr.chapter, anchor: mr.id },
        });
      }
    }

    // -------------------------------------------------------------------
    // MR4 INFO — <RepFigure> referenced figure's alt text doesn't mention
    //            the concept's verbal_label or canonical_symbol
    // -------------------------------------------------------------------
    // The figure may not exist in the registry (F1/F2 already fire on
    // that). MR4 only fires when the figure exists AND the alt text is
    // silent on the concept.
    const figureRegistryByName = new Map(
      index.figureRegistry.map((f) => [f.name, f])
    );
    for (const mr of index.multiReps) {
      const concept = conceptsById.get(mr.concept);
      if (!concept) continue;
      for (const rep of mr.reps) {
        if (rep.kind !== "figure") continue;
        const figure = figureRegistryByName.get(rep.refName);
        if (!figure) continue; // F1/F2 will surface the missing figure.
        const altLower = figure.alt.toLowerCase();
        const mentionsVerbal = altLower.includes(
          concept.verbal_label.toLowerCase()
        );
        const mentionsSymbol = figure.alt.includes(concept.canonical_symbol);
        if (mentionsVerbal || mentionsSymbol) continue;
        info.push({
          severity: "INFO",
          code: "MR4",
          message: `MR4: <MultiRep concept="${mr.concept}"> in chapter "${mr.chapter}" — figure "${rep.refName}" alt text doesn't mention the concept's verbal_label ("${concept.verbal_label}") or canonical_symbol ("${concept.canonical_symbol}"). Authoring nudge — readers using screen-readers lose the binding context.`,
          location: { chapter: mr.chapter, anchor: mr.id },
        });
      }
    }

    // -------------------------------------------------------------------
    // MR6 INFO — <RepEquation equivalent_to="X"> doesn't resolve
    // -------------------------------------------------------------------
    // Chapter-scoped at v1 (per design §D6 + ADR 0043 §R-MR6): X must
    // resolve to either (a) a <KeyEquation> in the same chapter's
    // equation index, or (b) another <RepEquation> in the same
    // MultiRep block. Cross-chapter resolution is a v2 audit-pass flip.
    const equationsByChapterSlug = new Map<string, Set<string>>();
    for (const eq of index.equations) {
      const set = equationsByChapterSlug.get(eq.chapter) ?? new Set<string>();
      set.add(eq.slug);
      equationsByChapterSlug.set(eq.chapter, set);
    }
    for (const mr of index.multiReps) {
      const sameMrEquationRefKeys = new Set<string>();
      for (const rep of mr.reps) {
        if (rep.kind === "equation") sameMrEquationRefKeys.add(rep.refKey);
      }
      const chapterEquationSlugs =
        equationsByChapterSlug.get(mr.chapter) ?? new Set<string>();
      for (const rep of mr.reps) {
        if (rep.kind !== "equation") continue;
        if (rep.equivalent_to === undefined) continue;
        if (chapterEquationSlugs.has(rep.equivalent_to)) continue;
        if (sameMrEquationRefKeys.has(rep.equivalent_to)) continue;
        info.push({
          severity: "INFO",
          code: "MR6",
          message: `MR6: <MultiRep concept="${mr.concept}"> in chapter "${mr.chapter}" — <RepEquation refKey="${rep.refKey}" equivalent_to="${rep.equivalent_to}"> doesn't resolve to a <KeyEquation> in the chapter or to another <RepEquation> in the same MultiRep. Authoring nudge — declare the equivalent equation explicitly so the binding holds.`,
          location: { chapter: mr.chapter, anchor: mr.id },
        });
      }
    }

    // -------------------------------------------------------------------
    // NR2 INFO — registry concept declared but never referenced
    // -------------------------------------------------------------------
    // v1 reference signal: MultiRep `concept=` only. Future expansions
    // (KeyEquation `symbols` per PR-δ', `<CommonMisuse misconception>`
    // cross-refs from EquationBiography) add more reference sources;
    // until then a concept counts as referenced only when at least one
    // MultiRep binds it.
    for (const concept of notationRegistry.concepts) {
      if (referencedConceptIds.has(concept.id)) continue;
      info.push({
        severity: "INFO",
        code: "NR2",
        message: `NR2: Notation Registry concept "${concept.id}" (${concept.verbal_label}) is declared but no <MultiRep concept="${concept.id}"> references it. Authoring nudge — either add a binding chapter or remove the unused registry entry.`,
        location: {},
      });
    }
  }

  return { errors, warnings, info };
}

/** ISO YYYY-MM-DD validator. Rejects malformed strings like "May 14, 2026" or "2026-13-99". */
function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  // Round-trip check rejects things like 2026-02-31 that Date.parse
  // tolerates by wrapping to March.
  const round = new Date(t).toISOString().slice(0, 10);
  return round === s;
}

/** Today's date in ISO YYYY-MM-DD (UTC). */
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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
  // `path` (V0–V8 contract findings) and `chapter` (D4/D5/E4/F1/F2/C1/O1/
  // O2/K1/MG1/MG2/CS2) are mutually exclusive in practice; render whichever
  // is present. `path` first since it carries the more specific
  // file-system identity when both somehow appear together.
  if (f.location?.path) locParts.push(`path: ${f.location.path}`);
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
