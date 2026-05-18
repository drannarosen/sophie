import { existsSync } from "node:fs";
import { relative as relativePath, resolve as resolvePath } from "node:path";
import { getInterventionByName } from "@sophie/components";
import type {
  AuditFinding,
  InterventionEntry,
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
 *   NR1 WARNING  `<KeyEquation symbols={…}>` declares a symbol not present
 *                in `notation-registry.yaml` (ADR 0043 §R5; PR-δ #94).
 *   NR2 INFO     Notation Registry concept declared but no chapter
 *                references it (orphan registry entry; ADR 0043).
 *                Reference signal at v1 = MultiRep `concept=` OR
 *                KeyEquation `symbols` (PR-δ NR2 modification, #94);
 *                EquationBiography `<CommonMisuse>` cross-refs counted
 *                from PR-D's E10 invariant onward.
 *   NR3 ERROR    Notation Registry symbol bound to multiple concepts
 *                (collision; symbol resolution ambiguous; ADR 0043 §R5;
 *                PR-δ #94).
 *   NR4 WARNING  `<KeyEquation symbols={…}>` declares a symbol whose
 *                registry concept has a `units:` value, but the equation
 *                lacks a `<Units symbol="…">` biography child (ADR 0043
 *                §R5; PR-δ #94).
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
 *   E7  INFO     `<KeyEquation>` has biography children but lacks an
 *                `<Observable>`. Authoring nudge — declare what the
 *                equation measures so readers can anchor the model in
 *                observation (ADR 0046; PR-δ #94).
 *   E8  WARNING  `<Units symbol="…" unit="…">` inside a `<KeyEquation>`
 *                doesn't match any `canonical_symbol` in
 *                `notation-registry.yaml` (ADR 0046 + ADR 0043; PR-δ #94).
 *   E9  INFO     `<CommonMisuse>` in a `<KeyEquation>` lacks a
 *                `misconception="<slug>"` cross-ref to the misconception
 *                graph. Authoring nudge so the misuse surfaces in
 *                cross-link rendering (ADR 0046 + ADR 0044; PR-δ #94).
 *   I1  WARNING  `<Intervention addresses="…">` references a misconception
 *                not declared anywhere in the index, OR the literal "this"
 *                survived extraction (no enclosing `<Aside kind="misconception">`
 *                — extractor leaves "this" verbatim in that case; ADR 0044).
 *   I2  ERROR    `<Intervention type="…">` is not in `intervention-index.ts`
 *                and `type !== "custom"` (ADR 0044). Catches typos +
 *                authors reaching for canonical names that don't exist.
 *   I3  INFO     `<Intervention type="bridging-analogy">` lacks `limits`
 *                (Clement 1993 explicit-limits authoring nudge; ADR 0044).
 *   MG3 WARNING  Misconception declared but no `<Intervention>` paired
 *                with it course-wide (ADR 0044). Surfaces unaddressed
 *                misconceptions early so the chapter author knows where
 *                remediation is missing.
 *   MG4 INFO     Course-level depth-coverage summary: total misconceptions,
 *                count with ≥1 `depth="substantial"` intervention, count
 *                with only `depth="light"`, count addressed. Single-finding
 *                summary table (ADR 0044 §D3); MG3 separately flags zeroes.
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
 *   I4 — verifies every canonical-intervention's `move:` resolves to a
 *        real entry in `move-index.ts` (ADR 0041). Deferred until
 *        `move-index.ts` ships (ADR 0044 §R-I4 deferral note); the
 *        `move:` field on each `intervention-index.ts` entry is the
 *        forward-compat seam declared now.
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
    // Reverse-index: canonical symbol → concepts that declare it. Most
    // entries are one-element arrays; multi-element entries are the
    // NR3 collision case (the same symbol bound to multiple concept.ids
    // — registry-author error). NR1, NR4, E8, and the NR2 modification
    // all read through this map; NR3 walks it to emit one ERROR per
    // collision.
    const symbolToConcepts = new Map<
      string,
      typeof notationRegistry.concepts
    >();
    for (const concept of notationRegistry.concepts) {
      const existing = symbolToConcepts.get(concept.canonical_symbol) ?? [];
      existing.push(concept);
      symbolToConcepts.set(concept.canonical_symbol, existing);
    }
    // Filter to registry-known concepts so the set's name matches its
    // contents — otherwise typo-bound MultiReps (which MR1 already
    // flags) would silently appear here, and any future invariant
    // that consumes the set (e.g., a v2 "almost-referenced" heuristic
    // via Levenshtein distance on concept ids) would pick up garbage.
    // NR2 only reads via `.has(c.id)` where `c.id` is registry-known,
    // so the filter is defensive today and load-bearing tomorrow.
    const referencedConceptIds = new Set<string>(
      index.multiReps
        .filter((m) => conceptsById.has(m.concept))
        .map((m) => m.concept)
    );
    // PR-δ NR2 modification per ADR 0043 §R5 + 2026-05-17 design doc
    // §"reference-aggregation note": KeyEquation.symbols entries also
    // count as reference signals. Each symbol that resolves to a
    // registered concept's canonical_symbol promotes that concept out
    // of orphan status. (NR3 surfaces multi-concept collisions
    // separately; here we accept any matching concept so a
    // registry-author bug doesn't suppress legitimate references.)
    for (const eq of index.equations) {
      for (const symbol of eq.symbols) {
        const concepts = symbolToConcepts.get(symbol);
        if (!concepts) continue;
        for (const concept of concepts) {
          referencedConceptIds.add(concept.id);
        }
      }
    }

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
        message: `NR2: Notation Registry concept "${concept.id}" (${concept.verbal_label}) is declared but no <MultiRep concept="${concept.id}"> or <KeyEquation symbols=[…]> references it. Authoring nudge — either add a binding chapter or remove the unused registry entry.`,
        location: {},
      });
    }

    // -------------------------------------------------------------------
    // NR1 WARNING — <KeyEquation symbols=[…]> declares a symbol not in
    //               notation-registry.yaml
    // -------------------------------------------------------------------
    // Per ADR 0043 §R5 + 2026-05-17 design doc §"PR-δ' bundle." Fires
    // per (equation, symbol) pair where the author-declared symbol has
    // no matching concept canonical_symbol in the registry. Warning
    // (not error) because the symbol may be a deliberate course-local
    // alias the author hasn't promoted to the registry yet; the
    // resolution prompt nudges either direction.
    for (const eq of index.equations) {
      for (const symbol of eq.symbols) {
        if (symbolToConcepts.has(symbol)) continue;
        warnings.push({
          severity: "WARNING",
          code: "NR1",
          message: `NR1: <KeyEquation id="${eq.slug}"> in chapter "${eq.chapter}" declares symbol "${symbol}" not present in notation-registry.yaml. Resolution: register the concept whose canonical_symbol is "${symbol}", or remove the symbol from the equation's \`symbols\` prop.`,
          location: { chapter: eq.chapter, anchor: eq.anchor },
        });
      }
    }

    // -------------------------------------------------------------------
    // NR3 ERROR — registry: same canonical_symbol bound to different
    //             concept.ids (cross-concept symbol collision)
    // -------------------------------------------------------------------
    // Registry-author error: the same symbol "r" can't simultaneously
    // mean "orbital radius" and "stellar radius" in the same course.
    // ERROR (not WARNING) because every downstream invariant that
    // resolves a symbol → concept (NR1 membership, NR2 references,
    // NR4 units, E8 Units alignment) becomes ambiguous when the
    // collision is present — fixing it is a precondition for the rest
    // of the NR pass to give trustworthy findings.
    for (const [symbol, concepts] of symbolToConcepts) {
      if (concepts.length < 2) continue;
      const conceptIds = concepts
        .map((c) => c.id)
        .sort()
        .join(", ");
      errors.push({
        severity: "ERROR",
        code: "NR3",
        message: `NR3: Notation Registry symbol "${symbol}" is bound to multiple concepts: ${conceptIds}. Resolution: split the symbol into per-concept variants (e.g., subscripted forms), or merge the concepts if they're truly the same thing.`,
        location: {},
      });
    }

    // -------------------------------------------------------------------
    // NR4 WARNING — registry symbol has explicit units; KeyEquation
    //               declares the symbol but lacks a <Units symbol="X">
    //               biography child for it
    // -------------------------------------------------------------------
    // When the registry author specified `units: "K"` for a concept
    // and an equation lists the concept's canonical_symbol in its
    // `symbols` prop, the equation SHOULD also declare a corresponding
    // <Units> biography child so readers see the unit context inline.
    // Fires per (equation, symbol-without-units) pair.
    for (const eq of index.equations) {
      const declaredUnitSymbols = new Set(
        (eq.biography?.units ?? []).map((u) => u.symbol)
      );
      for (const symbol of eq.symbols) {
        if (declaredUnitSymbols.has(symbol)) continue;
        const concepts = symbolToConcepts.get(symbol);
        if (!concepts) continue; // NR1 already fired for unknown symbols.
        // Any registered concept with units that's bound to this symbol
        // counts — if a collision exists (NR3), being conservative
        // here would suppress a legitimate nudge.
        const conceptWithUnits = concepts.find(
          (c) => c.units !== undefined && c.units.length > 0
        );
        if (!conceptWithUnits) continue;
        warnings.push({
          severity: "WARNING",
          code: "NR4",
          message: `NR4: <KeyEquation id="${eq.slug}"> in chapter "${eq.chapter}" declares symbol "${symbol}" (concept "${conceptWithUnits.id}", units "${conceptWithUnits.units}") but lacks a <Units symbol="${symbol}"> biography child. Resolution: add <Units symbol="${symbol}" unit="${conceptWithUnits.units}" /> inside the <KeyEquation>.`,
          location: { chapter: eq.chapter, anchor: eq.anchor },
        });
      }
    }

    // -------------------------------------------------------------------
    // E8 WARNING — <Units symbol="X"> doesn't match any canonical_symbol
    //              in the Notation Registry
    // -------------------------------------------------------------------
    // Per ADR 0046 + 2026-05-17 design doc §"Audit invariants." Fires
    // per (equation, units-entry) pair when the author-declared Units
    // symbol has no matching concept in the registry. Warning (not
    // error) for the same reason as NR1 — symbols may be deliberate
    // course-local aliases. Gated on NR opt-in (sits inside this
    // `if (notationRegistry !== null)` block).
    for (const eq of index.equations) {
      for (const units of eq.biography?.units ?? []) {
        if (symbolToConcepts.has(units.symbol)) continue;
        warnings.push({
          severity: "WARNING",
          code: "E8",
          message: `E8: <Units symbol="${units.symbol}" unit="${units.unit}"> in <KeyEquation id="${eq.slug}"> (chapter "${eq.chapter}") doesn't match any canonical_symbol in notation-registry.yaml. Resolution: register the concept whose canonical_symbol is "${units.symbol}", or rename the Units symbol to an existing registry entry.`,
          location: { chapter: eq.chapter, anchor: eq.anchor },
        });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Intervention invariants (ADR 0044 + 2026-05-17 design §D7 + PR-δ):
  //   I2 ERROR    Unknown canonical intervention type
  //   I1 WARNING  Unknown addresses OR "this" outside misconception parent
  //   I3 INFO     Bridging-analogy without `limits` (Clement 1993 nudge)
  //   MG3 WARNING Orphan misconception (no <Intervention> pairs with it)
  //   MG4 INFO    Course-level depth-coverage summary
  // ---------------------------------------------------------------------
  // Build a set of declared misconception anchors so I1 + MG3 can answer
  // "does this address resolve to a known misconception?" in O(1). The
  // anchor is the canonical identifier (per the PR-δ extractor fix that
  // promotes `name` to anchor precedence). Audit-time lookups are
  // chapter-agnostic — interventions reference misconceptions across
  // the course, not just within their own chapter.
  const declaredMisconceptionAnchors = new Set<string>(
    index.misconceptions.map((m) => m.anchor)
  );

  // -------------------------------------------------------------------
  // I2 ERROR — <Intervention type="X"> where X is not in
  //            intervention-index.ts AND X !== "custom".
  // -------------------------------------------------------------------
  // The extractor's `.superRefine` (PR-β) catches `type="custom"`
  // without `name` at parse time. I2 here catches the "made up
  // canonical name" case (typo or author reaching for a name that
  // doesn't exist in the library). Schema layer is permissive on
  // `type: z.string()` per design §D1; the audit is the enforcement
  // surface for catalog membership.
  for (const iv of index.interventions) {
    if (iv.type === "custom") continue;
    if (getInterventionByName(iv.type) !== undefined) continue;
    errors.push({
      severity: "ERROR",
      code: "I2",
      message: `I2: <Intervention type="${iv.type}"> in chapter "${iv.chapter}" — "${iv.type}" is not a canonical name in intervention-index.ts. Resolution: pick one of the 12 canonical interventions (see docs/website/reference/intervention-library.md), or declare \`type="custom" name="${iv.type}"\` to opt out of the canonical library.`,
      location: { chapter: iv.chapter, anchor: iv.anchor },
    });
  }

  // -------------------------------------------------------------------
  // I1 WARNING — <Intervention addresses="…"> references a misconception
  //              not declared anywhere in the course, OR the literal
  //              "this" survived extraction (i.e. the Intervention is
  //              standalone but author wrote `addresses="this"`).
  // -------------------------------------------------------------------
  // The extractor (PR-γ) rewrites "this" → enclosing misconception
  // name when the Intervention is nested in a misconception Aside.
  // Surviving "this" means the Intervention was standalone with
  // `addresses="this"` — a real authoring bug we flag here.
  //
  // Authors who address a misconception declared in ANOTHER chapter
  // pass this check (the misconception set is course-wide).
  for (const iv of index.interventions) {
    for (const target of iv.addresses) {
      if (target === "this") {
        warnings.push({
          severity: "WARNING",
          code: "I1",
          message: `I1: <Intervention type="${iv.type}"> in chapter "${iv.chapter}" — \`addresses="this"\` survived extraction (the Intervention is not nested inside a <Aside kind="misconception">). Resolution: nest the intervention inside the misconception Aside, or replace "this" with the misconception's anchor slug.`,
          location: { chapter: iv.chapter, anchor: iv.anchor },
        });
        continue;
      }
      if (declaredMisconceptionAnchors.has(target)) continue;
      warnings.push({
        severity: "WARNING",
        code: "I1",
        message: `I1: <Intervention type="${iv.type}"> in chapter "${iv.chapter}" — \`addresses="${target}"\` references a misconception not declared anywhere in the course. Resolution: declare the misconception (Aside or Callout with that anchor) in some chapter, or fix the slug typo.`,
        location: { chapter: iv.chapter, anchor: iv.anchor },
      });
    }
  }

  // -------------------------------------------------------------------
  // I3 INFO — bridging-analogy without `limits` (Clement 1993 nudge)
  // -------------------------------------------------------------------
  // Clement 1993's bridging-analogy framework prescribes EXPLICIT
  // limits ("the analogy maps X but breaks down on Y") as essential
  // for resilient remediation. Authoring nudge, INFO-level.
  for (const iv of index.interventions) {
    if (iv.type !== "bridging-analogy") continue;
    if (iv.limits) continue;
    info.push({
      severity: "INFO",
      code: "I3",
      message: `I3: <Intervention type="bridging-analogy"> in chapter "${iv.chapter}" lacks \`limits\`. Authoring nudge — Clement 1993 prescribes explicit limits ("the analogy maps X but breaks down on Y") for resilient remediation.`,
      location: { chapter: iv.chapter, anchor: iv.anchor },
    });
  }

  // -------------------------------------------------------------------
  // MG3 WARNING — orphan misconception (no <Intervention> pairs)
  // -------------------------------------------------------------------
  // Course-wide pairing check: every declared misconception SHOULD
  // have at least one intervention addressing it. Authoring nudge
  // for the chapter author + course-coordinator — pairing is the
  // structural promise of ADR 0044's misconception-graph + intervention
  // model. WARNING (not ERROR) per design §D7: zero-pairing is a
  // gap, not a contract violation.
  const interventionTargets = new Set<string>(
    index.interventions.flatMap((iv) => iv.addresses)
  );
  for (const misc of index.misconceptions) {
    if (interventionTargets.has(misc.anchor)) continue;
    warnings.push({
      severity: "WARNING",
      code: "MG3",
      message: `MG3: Misconception "${misc.anchor}" (chapter "${misc.chapter}") is declared but no <Intervention> pairs with it course-wide. Resolution: add an <Intervention addresses="${misc.anchor}"> (nested in the misconception Aside or standalone) in some chapter, or remove the misconception declaration if it's no longer in scope.`,
      location: { chapter: misc.chapter, anchor: misc.anchor },
    });
  }

  // -------------------------------------------------------------------
  // MG4 INFO — course-level depth-coverage summary
  // -------------------------------------------------------------------
  // Single-finding summary per design §D3: counts of misconceptions
  // by remediation-depth bucket. MG3 separately flags the zeroes;
  // MG4 surfaces the substantial-vs-light split so course-coordinators
  // can see where the heavy-lifting interventions concentrate.
  const totalMisconceptions = index.misconceptions.length;
  if (totalMisconceptions > 0) {
    const interventionsByTarget = new Map<string, InterventionEntry[]>();
    for (const iv of index.interventions) {
      for (const target of iv.addresses) {
        const list = interventionsByTarget.get(target) ?? [];
        list.push(iv);
        interventionsByTarget.set(target, list);
      }
    }
    let substantialCount = 0;
    let lightOnlyCount = 0;
    let unaddressedCount = 0;
    for (const misc of index.misconceptions) {
      const pairs = interventionsByTarget.get(misc.anchor);
      if (!pairs || pairs.length === 0) {
        unaddressedCount += 1;
        continue;
      }
      if (pairs.some((iv) => iv.depth === "substantial")) {
        substantialCount += 1;
      } else {
        lightOnlyCount += 1;
      }
    }
    const pct = (n: number) =>
      `${((n / totalMisconceptions) * 100).toFixed(0)}%`;
    info.push({
      severity: "INFO",
      code: "MG4",
      message: `MG4 — Intervention depth coverage:\n  ${totalMisconceptions} misconceptions total\n  ${substantialCount} have ≥1 substantial intervention (${pct(substantialCount)})\n  ${lightOnlyCount} have only light interventions (${pct(lightOnlyCount)})\n  ${unaddressedCount} have no interventions (${pct(unaddressedCount)})  ← would fire MG3 separately`,
      location: {},
    });
  }

  // ---------------------------------------------------------------------
  // EquationBiography invariants (ADR 0046 + 2026-05-17 design §"Audit
  // invariants"):
  //   E7 INFO     <KeyEquation> has biography children but lacks <Observable>
  //   E9 INFO     <CommonMisuse> lacks misconception="<slug>" cross-ref
  //   (E8 lives in the NR block above — gated on registry opt-in)
  // ---------------------------------------------------------------------
  // Both fire ONLY when at least one biography child is present on the
  // equation — preserves ADR 0046's "universal with per-equation
  // opt-in" property (equations without biographies are valid; the
  // invariants don't penalize partial-authoring states).

  // -------------------------------------------------------------------
  // E7 INFO — biography children present but missing <Observable>
  // -------------------------------------------------------------------
  // Per ADR 0046's "structured-for-facts, prose-for-stances" principle:
  // Observable is the *anchor* — what the equation measures. A
  // biography with Assumptions/Units/BreaksWhen/CommonMisuse but no
  // Observable is incomplete; INFO nudges the author toward closure
  // without blocking the build.
  for (const eq of index.equations) {
    if (eq.biography === undefined) continue;
    if (eq.biography.observable !== undefined) continue;
    info.push({
      severity: "INFO",
      code: "E7",
      message: `E7: <KeyEquation id="${eq.slug}"> in chapter "${eq.chapter}" has biography children but lacks an <Observable>. Authoring nudge — declare what the equation measures so readers can anchor the model in observation.`,
      location: { chapter: eq.chapter, anchor: eq.anchor },
    });
  }

  // -------------------------------------------------------------------
  // E9 INFO — <CommonMisuse> lacks misconception="<slug>" cross-ref
  // -------------------------------------------------------------------
  // Per ADR 0046 + ADR 0044's misconception-graph contract: linking
  // CommonMisuse to a declared misconception strengthens curriculum
  // coherence (the misuse becomes navigable from the misconception
  // graph + future cross-link rendering). The cross-ref is optional
  // at v1 — E9 nudges toward populating it without blocking. Soft
  // suggestion.
  for (const eq of index.equations) {
    if (eq.biography === undefined) continue;
    for (const misuse of eq.biography.common_misuses) {
      if (misuse.misconception !== undefined) continue;
      info.push({
        severity: "INFO",
        code: "E9",
        message: `E9: <CommonMisuse> in <KeyEquation id="${eq.slug}"> (chapter "${eq.chapter}") lacks a misconception="<slug>" cross-ref to the misconception graph (ADR 0044). Authoring nudge — link the misuse to a declared misconception so it surfaces in cross-link rendering.`,
        location: { chapter: eq.chapter, anchor: eq.anchor },
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
