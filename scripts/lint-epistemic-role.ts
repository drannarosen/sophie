#!/usr/bin/env -S npx tsx
/**
 * Epistemic-role declaration gate per ADR 0058 (graduating the
 * eight-role contract from optional/additive to enforced-for-new).
 *
 * Makes "Sophie is a Scientific Reasoning OS" structurally true rather
 * than conventional: every component dir under SCOPE must either
 * declare one of the 8 epistemic roles, bind role per-slot (OMI
 * composites), or be explicitly accounted for as role-less chrome /
 * grandfathered-pending-domain-pass. A new pedagogy component that
 * silently ships without a role → CI red.
 *
 * Contract:
 *
 *   For every immediate child dir of SCOPE that is a component (not an
 *   infra dir, see SKIP_DIRS), the dir is COMPLIANT iff ANY of:
 *     1. declaresRole(dir)          — a non-test source file declares a
 *                                     role via the canonical const
 *                                     pattern (ADR 0058 §2):
 *                                       export const X_EPISTEMIC_ROLE =
 *                                         "<role>" as const satisfies EpistemicRole;
 *                                     (field form `epistemicRole: "<role>"`
 *                                     also matches, defensively).
 *     2. dir ∈ ROLE_VIA_SLOT        — OMI composites that bind role
 *                                     per-slot (ADR 0058 §4).
 *     3. dir ∈ CHROME               — role-less by design (structural /
 *                                     layout / navigation / course-info).
 *     4. dir ∈ GRANDFATHERED        — contestable pedagogy, deferred to
 *                                     a later domain pass (tracked, NOT
 *                                     blocking; this list should SHRINK).
 *
 *   Non-compliant → collect; print; process.exit(1).
 *
 * Comment-stripping is the robustness crux: chrome files contain prose
 * like "NO `epistemicRole`" and Intervention's header literally writes
 * `epistemicRole: "misconception"` in a comment. The detector strips
 * `//` line comments and `/* … *​/` block comments BEFORE testing, so
 * those prose mentions do NOT register as declarations.
 *
 * Exit codes:
 *
 *   0  every component dir is compliant; CI green
 *   1  one or more component dirs missing a role + not allowlisted
 *   2  internal IO failure (SCOPE unreadable — moved/renamed)
 *
 * Run from repo root: `pnpm lint:epistemic-role` or
 * `npx tsx scripts/lint-epistemic-role.ts`.
 *
 * ADRs cited: 0058 (epistemic component contract), 0061 (AI-optimized
 * codebase). Mirrors `scripts/lint-axe-render.ts` (R11) structurally.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname;
const SCOPE = "packages/components/src/components";

const ROLES =
  "observable|model|inference|assumption|approximation|uncertainty|numerical|misconception";

/**
 * Infra dirs under SCOPE that are NOT components — excluded from the
 * gate. Each with a one-line reason:
 *
 *   - `_shared`    CSS-only shared styles (Tier3Card.module.css); no
 *                  component file.
 *   - `_formative` CSS-only shared styles for the formative family; no
 *                  component file.
 *   - `internal`   internal-only subcomponents (RetrievalCard); not an
 *                  author-facing component.
 *   - `retrieval`  retrieval-index logic (humanLabel, lruScheduler,
 *                  useRetrievalAttempt) — the author-facing component is
 *                  `RetrievalPrompt` (its own dir); this dir has no
 *                  component file.
 */
const SKIP_DIRS: ReadonlySet<string> = new Set([
  "_shared",
  "_formative",
  "internal",
  "retrieval",
]);

/**
 * OMI composites that bind role PER SLOT rather than declaring one role
 * for the whole component (ADR 0058 §4). Compliant by construction.
 */
const ROLE_VIA_SLOT: ReadonlyArray<readonly [string, string]> = [
  ["OMIFlow", "binds observable/model/inference per slot (ADR 0058 §4)"],
];

/**
 * Role-less by design — structural / layout / navigation / course-info
 * chrome (ADR 0058: components that fit none of the 8 roles are chrome,
 * not pedagogy). Rationales drawn from each component's header comment.
 */
const CHROME: ReadonlyArray<readonly [string, string]> = [
  [
    "AccessibilitySection",
    "course accessibility surface (DRC link/contact/deadline); purely structural",
  ],
  [
    "Aside",
    "digressive note container; visual/pedagogical category is chrome, not an epistemic role",
  ],
  [
    "Callout",
    "admonition container (info/warning/tip/roadmap/summary/…); chrome variant set",
  ],
  [
    "Card",
    "static card container with Header/Footer slots; strict chrome per its header",
  ],
  [
    "ChapterRef",
    "inline cross-reference to a reading-shape chapter; navigation chrome",
  ],
  [
    "ComprehensionGate",
    "self-report gate (got-it/revisit/stuck); persistence widget, no role",
  ],
  [
    "ConfidenceCheck",
    "Likert self-assessment widget; metacognitive chrome, not a reasoning role",
  ],
  [
    "ContactCard",
    "instructor contact card (name/email/response window); course-info chrome",
  ],
  [
    "CourseLanding",
    "course landing layout (hero-with-modules / simple-list); page chrome",
  ],
  [
    "Dropdown",
    "Radix-accordion disclosure widget with persistence; chrome primitive",
  ],
  ["Due", "inline due-date label; course-management chrome"],
  [
    "EffortLog",
    "self-report effort widget (skimmed/read/studied); metacognitive chrome",
  ],
  [
    "EquationRef",
    "inline cross-reference to a KeyEquation in the registry; navigation chrome",
  ],
  [
    "Figure",
    "figure container (inline or registry-backed); the figure's role lives on its content, not the container",
  ],
  ["FigureRef", "inline cross-reference to a Figure; navigation chrome"],
  [
    "GlossaryTerm",
    "inline reference to a definition in the pedagogy index; navigation chrome",
  ],
  [
    "GradingTable",
    "renders grading scheme (category weights + letter scale); course-info chrome",
  ],
  [
    "Grid",
    "pure SSR layout container (CSS Grid 1–4 cols); strict chrome per its header",
  ],
  [
    "InteractiveCheckbox",
    "persistence-bearing checkbox primitive; chrome control",
  ],
  [
    "Intervention",
    "misconception-remediation is a teaching move, not one of the 8 roles — deliberate non-decision per its design doc (§D6)",
  ],
  [
    "LearningObjectives",
    "persistence-bearing objectives container; harvests <Objective> children; chrome",
  ],
  ["Objective", "pure-display primitive for one learning objective; chrome"],
  [
    "ObjectivesSection",
    "course-level objectives section (named-region landmark); course-info chrome",
  ],
  [
    "OfficeHoursChrome",
    "inline office-hours surface from spec.office_hours; course-management chrome",
  ],
  [
    "OfficeHoursTable",
    "renders office-hours schedule as a table; course-info chrome",
  ],
  [
    "Points",
    "inline points + grading-category surface; course-management chrome",
  ],
  [
    "Predict",
    "predict-then-discuss reflection primitive; persistence widget, no role on the container",
  ],
  [
    "PrereqsList",
    "course-level prerequisite list grouped by kind; course-info chrome",
  ],
  [
    "Reading",
    "inline reading-assignment citation; chrome (header: no epistemic role declared)",
  ],
  [
    "Reflection",
    "free-text reflection prompt with persistence; metacognitive chrome",
  ],
  [
    "RetrievalPrompt",
    "in-flow recall prompt (target ref + Prompt/Answer slots); retrieval-practice chrome",
  ],
  ["Search", "site search UI (chip filters + results); navigation chrome"],
  [
    "SectionLanding",
    "per-section landing page listing units as cards; page chrome",
  ],
  [
    "SkillReview",
    "inline prereq-bridge recall prompt; retrieval-practice chrome",
  ],
  [
    "SpacedReview",
    "queued spaced-review surface from the practice queue; retrieval-practice chrome",
  ],
  [
    "Tabs",
    "ARIA-tabs disclosure container (static markup + controller island); chrome",
  ],
  [
    "Units",
    "descriptive symbol/unit metadata for an equation registry entry; chrome per its header",
  ],
  ["Video", "static embed primitive (youtube/vimeo/raw); media chrome"],
  [
    "Week",
    "inline week-of-term label; chrome (header: no epistemic role declared)",
  ],
];

/**
 * Contestable pedagogy whose role is genuinely ambiguous — deferred to
 * a later domain pass Anna adjudicates (ADR 0058 graduation plan, B2).
 * Tracked-not-blocking. This list should SHRINK over time toward empty.
 */
const GRANDFATHERED: ReadonlyArray<readonly [string, string]> = [
  // Formative family — is assessment chrome-wrapping-reasoning, or is it
  // itself an inference act? Deferred to the domain pass.
  [
    "MCQ",
    "formative family: assessment-as-chrome vs. inference-act is contestable; deferred",
  ],
  [
    "MultiSelect",
    "formative family: assessment-as-chrome vs. inference-act is contestable; deferred",
  ],
  [
    "FillBlank",
    "formative family: assessment-as-chrome vs. inference-act is contestable; deferred",
  ],
  [
    "NumericQuestion",
    "formative family: assessment-as-chrome vs. inference-act is contestable; deferred",
  ],
  [
    "QuickCheck",
    "formative family: assessment-as-chrome vs. inference-act is contestable; deferred",
  ],
  [
    "PracticeProblem",
    "formative family: assessment-as-chrome vs. inference-act is contestable; deferred",
  ],
  [
    "Solution",
    "formative reveal: role (inference / numerical?) depends on the wrapped reasoning; deferred",
  ],
  ["Hint", "formative reveal: role depends on the wrapped reasoning; deferred"],
  // Representation family — role lives on the bound Notation-Registry
  // concept (registry-link pattern), not on the rep component. Deferred.
  [
    "RepEquation",
    "role lives on the bound notation-registry concept (registry-link pattern); deferred",
  ],
  [
    "RepFigure",
    "role lives on the bound notation-registry concept (registry-link pattern); deferred",
  ],
  [
    "RepVerbal",
    "role lives on the bound notation-registry concept (registry-link pattern); deferred",
  ],
  [
    "MultiRep",
    "role lives on the bound notation-registry concept (registry-link pattern); deferred",
  ],
  // Multi-part containers — role is per-part, not per-component. Deferred.
  [
    "KeyEquation",
    "multi-part container: role per part not per component; deferred",
  ],
  // Biography child that inherits `misconception` via link — declare-vs-
  // inherit is contestable. Deferred.
  [
    "CommonMisuse",
    "biography child inherits `misconception` via link; declare-vs-inherit is contestable; deferred",
  ],
];

/**
 * Strip `//` line comments and block comments from `src` so that prose
 * mentions of `epistemicRole` (in headers/docblocks) do not register as
 * declarations. Reuses the line-classification approach from
 * `loc-budget.ts:isBarrel` for block-comment tracking, plus a simple
 * line-comment trim. Strings are not parsed (the detector regex only
 * matches the *declaration* shape, which never legitimately appears
 * inside a string literal in these files).
 */
function stripComments(src: string): string {
  const out: string[] = [];
  let inBlock = false;
  for (const raw of src.split("\n")) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) {
        continue; // whole line is inside a block comment
      }
      line = line.slice(end + 2);
      inBlock = false;
    }
    // Repeatedly consume any same-line block comments.
    while (true) {
      const start = line.indexOf("/*");
      if (start === -1) break;
      const end = line.indexOf("*/", start + 2);
      if (end === -1) {
        line = line.slice(0, start);
        inBlock = true;
        break;
      }
      line = line.slice(0, start) + line.slice(end + 2);
    }
    // Drop a trailing `//` line comment.
    const lineComment = line.indexOf("//");
    if (lineComment !== -1) line = line.slice(0, lineComment);
    out.push(line);
  }
  return out.join("\n");
}

/** Non-test, non-stories `.ts` / `.tsx` source files directly in `absDir`. */
function listSourceFiles(absDir: string): string[] {
  return readdirSync(absDir)
    .filter(
      (name) =>
        /\.(ts|tsx)$/.test(name) &&
        !/\.test\.(ts|tsx)$/.test(name) &&
        !/\.stories\.(ts|tsx)$/.test(name) &&
        !name.endsWith(".d.ts")
    )
    .map((name) => join(absDir, name));
}

/**
 * True when any source file in `absDir` declares an epistemic role.
 * Matches BOTH forms after comment-stripping:
 *   - const form (the actual ADR 0058 §2 pattern; value + `as const
 *     satisfies EpistemicRole` may wrap across whitespace/newlines):
 *       `…_EPISTEMIC_ROLE = "<role>" as const satisfies EpistemicRole`
 *   - field form (defensive, in case a future component uses it):
 *       `epistemicRole: "<role>"` (optionally `z.literal("<role>")`)
 */
function declaresRole(absDir: string): boolean {
  const constForm = new RegExp(
    `_EPISTEMIC_ROLE\\s*=\\s*["'](?:${ROLES})["']\\s*as const satisfies EpistemicRole`
  );
  const fieldForm = new RegExp(
    `epistemicRole:\\s*(?:z\\.literal\\(\\s*)?["'](?:${ROLES})["']`
  );
  for (const file of listSourceFiles(absDir)) {
    const src = stripComments(readFileSync(file, "utf8"));
    if (constForm.test(src) || fieldForm.test(src)) return true;
  }
  return false;
}

/** Immediate child dirs of SCOPE that are components (not infra). */
function listComponentDirs(absScope: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(absScope);
  } catch (err) {
    // A moved/renamed SCOPE should fail with a one-line diagnostic, not
    // an uncaught ENOENT stack trace. Exit code 2 distinguishes an
    // internal IO failure from a real role-coverage violation (exit 1).
    // Mirrors scripts/lint-axe-render.ts:118.
    console.error(`lint-epistemic-role: cannot read ${SCOPE} (SCOPE moved?)`);
    console.error(err);
    process.exit(2);
  }
  return entries
    .filter((name) => statSync(join(absScope, name)).isDirectory())
    .filter((name) => !SKIP_DIRS.has(name))
    .sort();
}

function main(): void {
  const absScope = join(REPO_ROOT, SCOPE);
  const dirs = listComponentDirs(absScope);

  const slot = new Map(ROLE_VIA_SLOT);
  const chrome = new Map(CHROME);
  const grandfathered = new Map(GRANDFATHERED);

  const declared: string[] = [];
  const viaSlot: string[] = [];
  const viaChrome: string[] = [];
  const viaGrandfather: string[] = [];
  const missing: string[] = [];

  for (const dir of dirs) {
    // Detection takes precedence over allowlists: a dir that actually
    // declares a role is a declarer, even if it also appears in a list.
    if (declaresRole(join(absScope, dir))) {
      declared.push(dir);
    } else if (slot.has(dir)) {
      viaSlot.push(dir);
    } else if (chrome.has(dir)) {
      viaChrome.push(dir);
    } else if (grandfathered.has(dir)) {
      viaGrandfather.push(dir);
    } else {
      missing.push(dir);
    }
  }

  if (missing.length > 0) {
    console.error(
      `epistemic-role: ${missing.length} component dir${
        missing.length === 1 ? "" : "s"
      } under ${SCOPE} declare no epistemic role and are not allowlisted ` +
        "— violates ADR 0058 (enforced-for-new):"
    );
    console.error("");
    for (const dir of missing) {
      console.error(
        `  ${dir} — missing epistemicRole; add a declaration or allowlist it`
      );
    }
    console.error("");
    console.error(
      "Action: add the canonical declaration to the component's schema " +
        '(`export const X_EPISTEMIC_ROLE = "<role>" as const satisfies ' +
        "EpistemicRole;`, mirroring Observable.schema.ts), OR add the dir to " +
        "CHROME (role-less by design) / GRANDFATHERED (contestable, pending " +
        "domain pass) / ROLE_VIA_SLOT in scripts/lint-epistemic-role.ts with " +
        "a one-line rationale. See ADR 0058."
    );
    process.exit(1);
  }

  console.log(
    `✓ epistemic-role coverage: ${dirs.length} / ${dirs.length} component ` +
      `dirs under ${SCOPE} accounted for ` +
      `(${declared.length} declare, ${viaSlot.length} role-via-slot, ` +
      `${viaChrome.length} chrome, ${viaGrandfather.length} grandfathered; ` +
      `${SKIP_DIRS.size} infra dirs skipped). ADR 0058.`
  );
  console.log("");
  console.log(`Declared (${declared.length}): ${declared.join(", ")}`);
  console.log(`Role-via-slot (${viaSlot.length}): ${viaSlot.join(", ")}`);
  console.log("");
  console.log(
    `Grandfathered (${viaGrandfather.length}, tracked-not-blocking — ` +
      "should shrink toward empty via the ADR 0058 domain pass):"
  );
  for (const dir of viaGrandfather) {
    console.log(`  ${dir} — ${grandfathered.get(dir)}`);
  }
  process.exit(0);
}

main();
