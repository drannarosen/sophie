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
const ROLE_VIA_SLOT: ReadonlyArray<readonly [string, string]> = [];

/**
 * Role-less by design — structural / layout / navigation / course-info
 * chrome (ADR 0058: components that fit none of the 8 roles are chrome,
 * not pedagogy). Rationales drawn from each component's header comment.
 */
const CHROME: ReadonlyArray<readonly [string, string]> = [];

/**
 * Contestable pedagogy whose role is genuinely ambiguous — deferred to
 * a later domain pass Anna adjudicates (ADR 0058 graduation plan, B2).
 * Tracked-not-blocking. This list should SHRINK over time toward empty.
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
  return readdirSync(absScope)
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
