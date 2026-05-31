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
 * Role-bearing-via-composition: a component is compliant here not because
 * it is role-less, but because its named PARTS carry roles. Two sub-shapes:
 *
 *   - the container binds a role to each anonymous slot (OMI composites,
 *     ADR 0058 §4) — e.g. OMIFlow's observable/model/inference slots;
 *   - the parts are first-class, self-declaring role components and the
 *     container is their composition root (ADR 0058 §3 child-component
 *     pattern) — e.g. KeyEquation's biography children
 *     (Observable/Assumption/BreaksWhen/DerivationStep/CommonMisuse).
 *
 * Distinct from CHROME: these are role-RICH, not role-less. The domain
 * pass (2026-05-29; ADR 0058 §R-domain-pass) folded KeyEquation here
 * rather than mislabel a role-decomposing container as chrome. A dedicated
 * ROLE_VIA_CHILDREN bucket is deferred until a 2nd self-declaring-children
 * container exists (ADR 0023 refactor-outward; today KeyEquation is the
 * sole member, so a one-line broadened rationale beats a singleton bucket).
 */
const ROLE_VIA_SLOT: ReadonlyArray<readonly [string, string]> = [
  [
    "OMIFlow",
    "binds observable/model/inference per anonymous slot (ADR 0058 §4)",
  ],
  [
    "KeyEquation",
    "composition root of the equation biography; its children self-declare roles (Observable/Assumption/BreaksWhen/DerivationStep + CommonMisuse) per ADR 0058 §3 — role-rich, not chrome (domain pass 2026-05-29)",
  ],
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
    "FillBlank",
    "formative family: assessment is a teaching move (ADR 0041), not one of the 8 roles; the role lives on the wrapped question content (domain pass 2026-05-29)",
  ],
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
    "HomeBackground",
    "pluggable course-home background slot (ADR 0097); decorative atmosphere, role-less chrome (lives in @sophie/astro, outside this gate's scope — documentary)",
  ],
  [
    "Hint",
    "formative reveal: disclosure container; the role lives on the wrapped reasoning, not the reveal (domain pass 2026-05-29)",
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
  [
    "MCQ",
    "formative family: assessment is a teaching move (ADR 0041), not a role; the role lives on the wrapped question content (domain pass 2026-05-29)",
  ],
  [
    "MultiRep",
    "representation aggregator: binds one concept across modes; representation mode is orthogonal to role — the role lives on the bound notation-registry concept (domain pass 2026-05-29)",
  ],
  [
    "MultiSelect",
    "formative family: assessment is a teaching move (ADR 0041), not a role; the role lives on the wrapped question content (domain pass 2026-05-29)",
  ],
  [
    "NumericQuestion",
    "formative family: assessment teaching-move, not a role; the numerical reasoning lives on the wrapped problem, not the prompt (domain pass 2026-05-29)",
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
    "PracticeProblem",
    "formative family: practice/assessment teaching-move; numerical reasoning lives on the wrapped problem + <Solution>, not the container (domain pass 2026-05-29)",
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
    "QuickCheck",
    "formative family: lightweight assessment teaching-move; the role lives on the wrapped content (domain pass 2026-05-29)",
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
    "RepEquation",
    "representation view: the role lives on the bound notation-registry concept (registry-link), not the representation mode (domain pass 2026-05-29)",
  ],
  [
    "RepFigure",
    "representation view: the role lives on the bound notation-registry concept (registry-link), not the representation mode (domain pass 2026-05-29)",
  ],
  [
    "RepVerbal",
    "representation view: the role lives on the bound notation-registry concept (registry-link), not the representation mode (domain pass 2026-05-29)",
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
    "Solution",
    "formative reveal: disclosure container; the role lives on the wrapped reasoning, not the reveal (domain pass 2026-05-29)",
  ],
  [
    "SpacedReview",
    "queued spaced-review surface from the practice queue; retrieval-practice chrome",
  ],
  [
    "Starfield",
    "vendored photometric Canvas 2D starfield engine for HomeBackground (ADR 0097); decorative atmosphere, role-less chrome (the @sophie/astro engine module, outside this gate's scope — documentary)",
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
 * Contestable pedagogy whose role was genuinely ambiguous, pending an
 * Anna-adjudicated domain pass (ADR 0058 graduation plan, B2). That pass
 * COMPLETED 2026-05-29 (ADR 0058 §R-domain-pass): all 14 original entries
 * resolved by the pointer/teaching-move/composition-root/leaf principle —
 *   - formative family (MCQ/MultiSelect/FillBlank/NumericQuestion/
 *     QuickCheck/PracticeProblem/Solution/Hint) → CHROME (assessment is a
 *     teaching move per ADR 0041, not one of the 8 roles);
 *   - representation family (RepEquation/RepFigure/RepVerbal/MultiRep) →
 *     CHROME (views of a bound concept; the role lives on the concept);
 *   - CommonMisuse → declarer (`misconception`; a role-bearing leaf, not a
 *     pointer — it states a misuse whether or not the optional cross-ref
 *     is supplied);
 *   - KeyEquation → ROLE_VIA_SLOT (composition root of role-bearing
 *     biography children).
 *
 * The bucket is RETAINED EMPTY by design: a future component whose role is
 * genuinely contestable lands here pending its own adjudication, rather
 * than being forced into a wrong role to satisfy the gate (which would
 * corrupt the very vocabulary the contract protects, ADR 0058 §R-graduation).
 */
const GRANDFATHERED: ReadonlyArray<readonly [string, string]> = [];

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
      "domain pass complete 2026-05-29; bucket retained empty for future " +
      "contestable components, ADR 0058 §R-domain-pass):"
  );
  for (const dir of viaGrandfather) {
    console.log(`  ${dir} — ${grandfathered.get(dir)}`);
  }
  process.exit(0);
}

main();
