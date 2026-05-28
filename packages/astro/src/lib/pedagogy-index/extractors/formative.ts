import {
  type AuditFinding,
  type FormativeAnswer,
  type FormativeEntry,
  type FormativeKind,
  slugify,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  choiceSlug,
  extractPlainText,
  type MdxJsxFlowElement,
  readStringAttr,
} from "../jsx-utils.ts";

/**
 * Formative-assessment extractor (ADR 0073 Amendment 1 —
 * formative-with-reveal v1). Walks the mdast tree for the six
 * formative-parent JSX flow elements and materializes one
 * `FormativeEntry` per callsite, reading the per-kind child shape
 * defined by the authoring contract:
 *
 *   - `<QuickCheck>` / `<PracticeProblem>` → `solution-only`
 *   - `<MCQ>`        → `single-choice` (slug of the one correct choice)
 *   - `<MultiSelect>`→ `multi-choice` (slugs of all correct choices)
 *   - `<FillBlank>`  → `fill-blank` (inline `<FillBlank.Slot id correct>`)
 *   - `<NumericQuestion>` → `numeric` (self-closing `.Answer` attrs)
 *
 * By the time this extractor runs, `sophieAutoImportsRemarkPlugin`
 * (PR 4) has already threaded `course`/`unit`/`parentId` onto nested
 * `<Solution>`/`<Hint>`; the extractor only counts their presence
 * (`hasSolution`, `hintCount`).
 *
 * **AS-N detection split (mirrors worked-examples' WE-3 / over-count
 * precedent).** AS-2 (no Solution) and AS-3 (fill-blank zero blanks)
 * are recoverable from the materialized entry, so the audit invariant
 * `checkFormative` derives them. AS-1 (MCQ correct-count !== 1), AS-4
 * (NumericQuestion Answer-count !== 1), and AS-5 (multi-choice zero
 * correct) depend on counts the materialized `answer` *cannot* carry —
 * two correct MCQ choices collapse to one slug; a zero-correct
 * multi-choice would fail the schema's `.min(1)`. The extractor sees
 * the raw counts, so it pushes those three findings here at detection
 * time and emits a schema-valid best-effort entry so the rest of the
 * index stays well-formed.
 *
 * Anchor precedence: explicit `id=` attr (slugified) wins; else
 * positional `form-${counter}` (chapter-scoped). Intra-chapter anchor
 * collision throws. The AS-1..AS-5 audit invariants live in
 * `packages/astro/src/lib/pedagogy-audit/invariants/formative.ts`.
 */

const JSX_NAME_TO_KIND: Record<string, FormativeKind> = {
  QuickCheck: "quickcheck",
  MCQ: "mcq",
  MultiSelect: "multi-select",
  FillBlank: "fill-blank",
  NumericQuestion: "numeric-question",
  PracticeProblem: "practice-problem",
};

// Single source of truth: the six parent JSX names are exactly the
// keys of JSX_NAME_TO_KIND, so a walked node always has a defined kind.
const FORMATIVE_PARENT_NAMES = new Set(Object.keys(JSX_NAME_TO_KIND));

export interface FormativeExtractionResult {
  entries: FormativeEntry[];
  findings: AuditFinding[];
}

/** Boolean-presence attr: `<MCQ.Choice correct>` surfaces as `value: null`. */
function readBooleanAttr(node: MdxJsxFlowElement, name: string): boolean {
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name !== name) continue;
    return attr.value === null || attr.value === true;
  }
  return false;
}

/**
 * Read a numeric JSX attribute. `<NumericQuestion.Answer value={2.5e17}>`
 * surfaces as an `mdxJsxAttributeValueExpression` whose raw source lives
 * on `attr.value.value`; a string-valued `value="2.5e17"` also parses.
 * Returns undefined when absent / non-finite.
 */
function readNumberAttr(
  node: MdxJsxFlowElement,
  name: string
): number | undefined {
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute") continue;
    if (attr.name !== name) continue;
    let raw: string | undefined;
    if (typeof attr.value === "string") {
      raw = attr.value;
    } else if (attr.value && typeof attr.value === "object") {
      const v = attr.value as { type?: string; value?: unknown };
      if (
        v.type === "mdxJsxAttributeValueExpression" &&
        typeof v.value === "string"
      ) {
        raw = v.value;
      }
    }
    if (raw === undefined) return undefined;
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

const isJsxFlowChild = (c: unknown): c is MdxJsxFlowElement =>
  !!c &&
  typeof c === "object" &&
  (c as { type?: string }).type === "mdxJsxFlowElement";

/**
 * Collect `{ correct, slug }` for each `<X.Choice>` child of an MCQ /
 * MultiSelect parent. Throws on duplicate slug within the block (the
 * intra-block uniqueness invariant; mirrors the extractor-throws-first
 * pattern used by worked-examples / misconceptions).
 */
function collectChoices(
  parent: MdxJsxFlowElement,
  choiceName: string,
  unitId: string,
  anchor: string
): Array<{ correct: boolean; slug: string }> {
  const out: Array<{ correct: boolean; slug: string }> = [];
  const seen = new Set<string>();
  for (const child of parent.children ?? []) {
    if (!isJsxFlowChild(child) || child.name !== choiceName) continue;
    const slug = choiceSlug(child);
    if (seen.has(slug)) {
      throw new Error(
        `Duplicate <${choiceName}> slug "${slug}" in formative item "${anchor}" (chapter "${unitId}"). Resolution: edit the choice text so it slugifies distinctly, or set explicit \`id\` props.`
      );
    }
    seen.add(slug);
    out.push({ correct: readBooleanAttr(child, "correct"), slug });
  }
  return out;
}

export function extractFormative(
  tree: Root,
  unitId: string
): FormativeExtractionResult {
  const entries: FormativeEntry[] = [];
  const findings: AuditFinding[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    const name = el.name ?? "";
    // R7 disposition: the single silent-skip walk filter. Every name in
    // FORMATIVE_PARENT_NAMES has a paired AS-1..AS-5 audit invariant
    // (and the kind→answer switch is exhaustive), so this is the
    // intended walk filter, not an audit gap.
    if (!FORMATIVE_PARENT_NAMES.has(name)) return;
    // FORMATIVE_PARENT_NAMES IS the map's key set, so a passed node
    // always resolves; `?? "quickcheck"` is a structurally unreachable
    // fallback that narrows the type without a non-null assertion.
    const kind = JSX_NAME_TO_KIND[name] ?? "quickcheck";

    counter += 1;
    const explicitId = readStringAttr(el, "id");
    const anchor = explicitId ? slugify(explicitId) : `form-${counter}`;
    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${unitId}": formative anchor "${anchor}" generated more than once. Resolution: supply distinct \`id\` props on the affected formative items.`
      );
    }
    seenAnchors.add(anchor);

    let promptText = "";
    let hasSolution = false;
    let hintCount = 0;
    for (const child of el.children ?? []) {
      if (!isJsxFlowChild(child)) continue;
      if (child.name?.endsWith(".Prompt")) promptText = extractPlainText(child);
      else if (child.name === "Solution") hasSolution = true;
      else if (child.name === "Hint") hintCount += 1;
    }

    const answer = materializeAnswer(el, name, unitId, anchor, findings);

    entries.push({
      unit: unitId,
      anchor,
      kind,
      prompt: promptText,
      answer,
      hasSolution,
      hintCount,
    });
  });

  return { entries, findings };
}

function materializeAnswer(
  el: MdxJsxFlowElement,
  name: string,
  unitId: string,
  anchor: string,
  findings: AuditFinding[]
): FormativeAnswer {
  switch (name) {
    case "QuickCheck":
    case "PracticeProblem":
      return { type: "solution-only" };
    case "MCQ": {
      const choices = collectChoices(el, "MCQChoice", unitId, anchor);
      const correct = choices.filter((c) => c.correct);
      if (correct.length !== 1) {
        // AS-1 ERROR — exactly one correct choice required. Pushed here
        // because a count of 2 collapses to one slug in the materialized
        // single-choice answer (audit can't recover the count).
        findings.push({
          severity: "ERROR",
          code: "AS-1",
          message: `AS-1: MCQ "${anchor}" in chapter "${unitId}" has ${correct.length} choices marked \`correct\`. Exactly one is required. Resolution: mark exactly one <MCQChoice correct>.`,
          location: { unit: unitId, anchor },
        });
      }
      // Best-effort: first correct choice, else first choice, else a
      // schema-valid placeholder so the entry parses (AS-1 is the signal).
      const chosen = correct[0]?.slug ?? choices[0]?.slug ?? "unanswered";
      return { type: "single-choice", correct: chosen };
    }
    case "MultiSelect": {
      const choices = collectChoices(el, "MultiSelect.Choice", unitId, anchor);
      const correct = choices.filter((c) => c.correct).map((c) => c.slug);
      if (correct.length === 0) {
        // AS-5 ERROR — at least one correct choice required. Pushed here
        // because a zero-length `correct` would fail the schema's
        // `.min(1)`; we emit a placeholder so the index stays well-formed.
        findings.push({
          severity: "ERROR",
          code: "AS-5",
          message: `AS-5: MultiSelect "${anchor}" in chapter "${unitId}" has zero choices marked \`correct\`. At least one is required. Resolution: mark the correct <MultiSelect.Choice correct> options.`,
          location: { unit: unitId, anchor },
        });
        return { type: "multi-choice", correct: ["unanswered"] };
      }
      return { type: "multi-choice", correct };
    }
    case "FillBlank": {
      const blanks: Array<{ id: string; correct: string }> = [];
      const promptEl = (el.children ?? []).find(
        (c) => isJsxFlowChild(c) && c.name === "FillBlank.Prompt"
      ) as MdxJsxFlowElement | undefined;
      for (const child of promptEl?.children ?? []) {
        if (!isJsxFlowChild(child) || child.name !== "FillBlank.Slot") continue;
        const id = readStringAttr(child, "id");
        const correct = readStringAttr(child, "correct");
        if (id && correct) blanks.push({ id, correct });
      }
      // AS-3 (zero blanks) is recoverable from `blanks.length` — derived
      // by the audit invariant, not pushed here.
      return { type: "fill-blank", blanks };
    }
    case "NumericQuestion": {
      const answerEls = (el.children ?? []).filter(
        (c) => isJsxFlowChild(c) && c.name === "NumericQuestion.Answer"
      ) as MdxJsxFlowElement[];
      if (answerEls.length !== 1) {
        // AS-4 ERROR — exactly one Answer child required. Pushed here
        // because the materialized `numeric` answer can carry only one
        // (value, tolerance) pair; the audit can't see the child count.
        findings.push({
          severity: "ERROR",
          code: "AS-4",
          message: `AS-4: NumericQuestion "${anchor}" in chapter "${unitId}" has ${answerEls.length} <NumericQuestion.Answer> children. Exactly one is required. Resolution: declare a single <NumericQuestion.Answer value tolerance toleranceKind />.`,
          location: { unit: unitId, anchor },
        });
      }
      const answerEl = answerEls[0];
      const value = answerEl ? readNumberAttr(answerEl, "value") : undefined;
      const tolerance = answerEl
        ? readNumberAttr(answerEl, "tolerance")
        : undefined;
      const toleranceKind = answerEl
        ? readStringAttr(answerEl, "toleranceKind")
        : undefined;
      const unit = answerEl ? readStringAttr(answerEl, "unit") : undefined;
      return {
        type: "numeric",
        value: value ?? 0,
        tolerance: tolerance ?? 0,
        toleranceKind: toleranceKind === "relative" ? "relative" : "absolute",
        ...(unit ? { unit } : {}),
      };
    }
    default:
      throw new Error(`extractFormative: unhandled formative kind "${name}"`);
  }
}
