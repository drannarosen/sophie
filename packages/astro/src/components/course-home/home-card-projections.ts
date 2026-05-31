import type { AssignmentRegistry, UnitEntry } from "@sophie/core/schema";
import { withBase } from "../../lib/with-base";
import { titleCaseSlug } from "./home-projections";

/**
 * Pure projections for the two orientation cards that are LIVE in PR 1:
 * "Due Soon" (assignments registry, ADR 0096) and "Start Reading" (first
 * non-draft unit). Kept in a sibling `.ts` from `home-projections.ts`
 * (band/nav/module projections) per ADR 0061's focused-files rule — the
 * card-data cluster is a cohesive seam Task 7's dispatcher fills, distinct
 * from the descriptive-band/nav derivations. The "This Week" card and the
 * announcement banner stay absent until ADRs 0098/0099 (ADR 0097 #7), so
 * they have no projection here — render-nothing is the caller's default.
 *
 * Both functions are pure with INJECTED inputs (no `new Date()`, no virtual
 * module import) so the dispatcher (Task 7) owns the impure edges: it reads
 * `virtual:sophie/assignments` + the build wall-clock and feeds the props
 * down.
 */

// ─── Due-Soon projection (ADR 0097 #7, assignments registry / ADR 0096) ──
//
// "Due Soon" is the ONE orientation card live from PR 1: it reads the
// existing assignments registry (ADR 0096), not a not-yet-existing schedule.
//
// DATE COMPARISON: ISO `YYYY-MM-DD` strings sort lexicographically ==
// chronologically, so the filter + sort use STRING comparison against a
// `YYYY-MM-DD` slice of `now` — no `Date` parsing, no timezone drift (the
// same string-max pattern `resolveRevealDate` uses in
// `resolve-solution-reveal.ts`).
//
// `tbd` HANDLING (W1 honest decision): a `tbd` dueDate is a real upcoming
// assignment the student should know exists, so it is SURFACED — but it
// can't compete for the "soonest concrete" sort, so it is appended AFTER
// the concrete-dated entries as a DIMMED row (matching the prototype's
// dimmed HW row), within the same small cap. Excluding `tbd` entirely
// would hide assigned-but-undated work; that's the dishonest option.

const DUE_SOON_CAP = 3;

/** One row in the "Due Soon" card. */
export interface DueSoonItem {
  /** Assignment id — stable key. */
  readonly id: string;
  /** Assignment title (e.g. "Problem Set 3", "Final Project"). */
  readonly title: string;
  /**
   * The assignment's free-slug `kind` (ADR 0096 Am1) — the raw vocabulary
   * value (`growth-memo`, `homework`), kept for keying/styling alongside
   * the humanized `kindLabel`.
   */
  readonly kind: string;
  /**
   * Display label for `kind`: the consumer-declared `assignment_kinds`
   * label when present, else the title-cased humanization of the slug
   * (`growth-memo` → `Growth Memo`, ADR 0080 Am3). The renderer shows this
   * as a small text badge on the row.
   */
  readonly kindLabel: string;
  /**
   * Concrete ISO `YYYY-MM-DD` due date, or `"tbd"` when the instructor
   * hasn't dated it yet. The renderer shows the date verbatim (or "tbd").
   */
  readonly due: string;
  /** `true` when `due === "tbd"` — the renderer dims the row. */
  readonly tbd: boolean;
  /**
   * Total problem count across this assignment's groups (`problems[].ids`).
   * `0` for an assignment with no `problems` (a project, a memo).
   */
  readonly problemCount: number;
}

type Problems = AssignmentRegistry["assignments"][number]["problems"];

/**
 * Sum of every `problems[].ids.length` for one assignment. `problems` is
 * optional (ADR 0096 Amendment 1) — a problemless assignment counts `0`.
 */
function problemCount(problems: Problems): number {
  return (problems ?? []).reduce((total, group) => total + group.ids.length, 0);
}

/**
 * Resolve an assignment `kind` to its display label: the consumer-declared
 * `assignment_kinds` label when present, else the title-cased humanization
 * of the slug (ADR 0080 Am3 — zero-config fallback, `growth-memo` →
 * `Growth Memo`). The shape-only `@sophie/core` field carries the custom
 * labels; the integration's cross-refine (Task 7) is what guarantees every
 * `kind` is a declared key when the map is present.
 */
function kindLabel(
  kind: string,
  kindLabels: Readonly<Record<string, string>>
): string {
  return kindLabels[kind] ?? titleCaseSlug(kind);
}

/**
 * Project the assignments registry into the "Due Soon" card's ordered rows.
 *
 * Concrete-dated assignments whose `dueDate` is on or after `now` (string
 * compare against `now`'s `YYYY-MM-DD` slice — an entry due exactly today
 * is INCLUDED, a past-due one is excluded) come first, ascending by due
 * date. `tbd`-dated assignments follow, dimmed, in registry order. The
 * combined list is capped at `cap`. A `null` registry, or one with no
 * upcoming work, yields `[]` (the renderer then drops the whole card —
 * no empty chrome, ADR 0097 #7).
 *
 * Each row carries the assignment's `kind` plus a humanized `kindLabel`
 * (ADR 0080 Am3): `kindLabels` (the consumer's `assignment_kinds` map,
 * defaulting to `{}`) supplies custom labels, falling back to a title-cased
 * slug. Optional + defaulted so the existing `dueSoon(registry, now)` and
 * `dueSoon(registry, now, cap)` call shapes stay valid.
 *
 * `now` is INJECTED (never `new Date()` here) so the projection is pure.
 */
export function dueSoon(
  registry: AssignmentRegistry | null,
  now: Date,
  cap: number = DUE_SOON_CAP,
  kindLabels: Readonly<Record<string, string>> = {}
): DueSoonItem[] {
  if (!registry) return [];
  const today = now.toISOString().slice(0, 10);

  const dated = registry.assignments
    .filter((a) => a.dueDate !== "tbd" && a.dueDate >= today)
    .sort((a, b) =>
      a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0
    )
    .map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      kindLabel: kindLabel(a.kind, kindLabels),
      due: a.dueDate,
      tbd: false,
      problemCount: problemCount(a.problems),
    }));

  const tbd = registry.assignments
    .filter((a) => a.dueDate === "tbd")
    .map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      kindLabel: kindLabel(a.kind, kindLabels),
      due: "tbd",
      tbd: true,
      problemCount: problemCount(a.problems),
    }));

  return [...dated, ...tbd].slice(0, cap);
}

// ─── Start-Reading projection (ADR 0097 #2/#7) ───────────────────────────
//
// HONEST FRAMING: the "Start Reading" card points at the FIRST non-draft
// unit by course order. Once ScheduleSchema (ADR 0098) lands this becomes
// "the current lecture by calendar"; for PR 1 it is the course's opening
// reading — static, always resolvable without any schedule. Draft units
// (no public landing) are skipped, matching the link-filter the reading
// route honors.

/** The "Start Reading" card's link target. */
export interface StartReadingLink {
  /** Display label — the unit title. */
  readonly label: string;
  /** Base-correct href to the unit's reading route. */
  readonly href: string;
}

/**
 * Pick the first non-draft unit by `order` and project it into the
 * "Start Reading" link. Returns `undefined` when there is no non-draft
 * unit (the renderer keeps the card but shows its static fallback, so the
 * card still degrades sanely). The href is base-corrected via `withBase`,
 * targeting the existing `/units/<id>/reading` route.
 */
export function startReading(
  units: ReadonlyArray<UnitEntry>
): StartReadingLink | undefined {
  const first = [...units]
    .filter((u) => u.status !== "draft")
    .sort((a, b) => a.order - b.order)[0];
  if (!first) return undefined;
  return {
    label: first.title,
    href: withBase(`/units/${first.id}/reading`),
  };
}
