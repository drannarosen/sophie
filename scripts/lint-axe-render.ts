#!/usr/bin/env -S npx tsx
/**
 * axe-on-render coverage gate per AGENTS.md standing review rule R11
 * and ADR 0004's "axe-core tests are mandatory on every component PR"
 * mandate.
 *
 * Surfaced by the P3 closure audit
 * (`docs/reviews/2026-05-25-axe-coverage-audit.md`, PR #185):
 * pre-audit coverage across `@sophie/components` was 42 / 44 = 95.5%,
 * with two quiet gaps (`RetrievalCard.test.tsx` and
 * `EquationRef.biography-summary.test.tsx`). Both were closed in PR #185;
 * R11 locks the 100% state in place against regressions so the ADR 0004
 * mandate stays actually-true rather than aspirationally-true.
 *
 * Contract:
 *
 *   For every `*.test.tsx` under `packages/components/src/`, if the file
 *   calls `render(` (rendered-DOM signal), it must also call one of:
 *     - `axe(`
 *     - `AxeBuilder`
 *     - `toHaveNoViolations`
 *
 *   Render without axe → CI red.
 *
 * Exclusions (narrow, by category, with audit-traceable rationale):
 *
 *   - `runtime/**`              hook-only probe tests; render() is a
 *                               vehicle for `renderHook` siblings or
 *                               useEffect timing, not a DOM-a11y
 *                               surface. Audit § "Judgment calls" #1.
 *   - `_helpers/**`             test infra (no such dir today; future-
 *                               proofs the gate against the audit's
 *                               carve-out vocabulary).
 *   - `**`/`__mocks__/**`       vi.mock fixture renderers (no such
 *                               dir today; future-proofs the gate).
 *   - `_template/**`            sibling-template scaffolds added per
 *                               PR #177; the file documents the
 *                               canonical store-backed test shape but
 *                               is not a real rendered component.
 *   - `**`/`use*.test.tsx`      hook-test naming convention
 *                               (`useLinkedParameter.test.tsx` lives
 *                               outside `runtime/` but is a hook test
 *                               per audit § "Judgment calls" #1).
 *   - `interactive/ParameterCursor.test.tsx`
 *                               renders `<span hidden aria-hidden="true" />`
 *                               as an invisible side-effect component; the
 *                               tests assert `useParameterStore.getState()`,
 *                               not rendered DOM. No DOM a11y surface to
 *                               check. See `ParameterCursor.tsx` for the
 *                               component shape. Audit § "Judgment calls"
 *                               #2 (defensible-probe carve-out, R11 wave).
 *
 * Exit codes:
 *
 *   0  all render-calling files have axe; CI green
 *   1  one or more render-without-axe files → CI red
 *   2  internal grep failure (unexpected)
 *
 * Run from repo root: `pnpm lint:axe-render` or
 * `npx tsx scripts/lint-axe-render.ts`.
 *
 * ADRs cited: 0004 (component contract), 0061 (AI-optimized codebase).
 */

import { execSync } from "node:child_process";

const SCOPE = "packages/components/src";

// `*.test.tsx` files under SCOPE, paths returned newline-delimited.
function listTestFiles(): string[] {
  let output = "";
  try {
    output = execSync(`find ${SCOPE} -name "*.test.tsx" -type f`, {
      encoding: "utf8",
    });
  } catch (err) {
    console.error("lint-axe-render: find failed unexpectedly");
    console.error(err);
    process.exit(2);
  }
  return output.split("\n").filter((line) => line.length > 0);
}

/**
 * Returns true when `path` matches one of the exclusion categories
 * documented in the file header. Each predicate corresponds to a
 * named carve-out, traceable to the P3 audit.
 */
function isExcluded(path: string): boolean {
  // Hook-only test suites — render() is a probe for renderHook/useEffect.
  if (path.includes("/runtime/")) return true;
  // Test infra carve-outs (future-proofing per audit vocabulary).
  if (path.includes("/_helpers/")) return true;
  if (path.includes("/__mocks__/")) return true;
  // Sibling-template scaffold (PR #177) — documents test shape, not
  // a real rendered component.
  if (path.includes("/_template/")) return true;
  // Hook-test naming convention: `useFoo.test.tsx` outside `runtime/`
  // (e.g., `interactive/useLinkedParameter.test.tsx` — audit-excluded).
  const basename = path.split("/").pop() ?? "";
  if (/^use[A-Z]\w*\.test\.tsx$/.test(basename)) return true;
  // ParameterCursor renders <span hidden aria-hidden="true" /> as an
  // invisible side-effect component; the tests assert useParameterStore
  // state, not rendered DOM. No DOM a11y surface to check.
  // See packages/components/src/interactive/ParameterCursor.tsx.
  if (path.endsWith("/interactive/ParameterCursor.test.tsx")) return true;
  return false;
}

/**
 * Returns true when `path` contains a `render(` call — the rendered-
 * DOM signal that triggers the axe requirement. POSIX
 * `grep -q -E` portable across macOS + ubuntu CI runners.
 */
function callsRender(path: string): boolean {
  try {
    execSync(`grep -q -E "[^[:alnum:]_]render[[:space:]]*\\(" "${path}"`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    // grep exit 1 = no match; any other failure also returns false
    // (the file is then trivially compliant — no render, no obligation).
    return false;
  }
}

/**
 * Returns true when `path` contains any axe signal:
 *   - `axe(`               jest-axe imperative call
 *   - `AxeBuilder`         Playwright @axe-core/playwright builder
 *   - `toHaveNoViolations` jest-axe matcher
 */
function callsAxe(path: string): boolean {
  try {
    execSync(
      `grep -q -E "axe[[:space:]]*\\(|AxeBuilder|toHaveNoViolations" "${path}"`,
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  const all = listTestFiles();
  const audited = all.filter((p) => !isExcluded(p));
  const renderCalling = audited.filter(callsRender);
  const missingAxe = renderCalling.filter((p) => !callsAxe(p));

  if (missingAxe.length === 0) {
    console.log(
      `✓ axe-on-render coverage: ${renderCalling.length} / ${renderCalling.length} ` +
        `render-calling test files under ${SCOPE} call axe ` +
        `(${all.length - audited.length} hook/template files excluded; ` +
        `${audited.length - renderCalling.length} audited files do not render). ` +
        "ADR 0004 + AGENTS.md R11."
    );
    process.exit(0);
  }

  console.error(
    `axe-on-render: ${missingAxe.length} test file${
      missingAxe.length === 1 ? "" : "s"
    } call render() without calling axe — violates AGENTS.md R11 + ADR 0004 ` +
      '"axe-core tests are mandatory on every component PR":'
  );
  console.error("");
  for (const path of missingAxe) {
    console.error(`  ${path}`);
  }
  console.error("");
  console.error(
    "Action: add `import { axe } from 'jest-axe'` and an axe assertion " +
      "(e.g., `expect(await axe(container)).toHaveNoViolations()`) to each " +
      "file's rendered states. If the test surface is genuinely a hook probe " +
      "(not DOM a11y), rename the file to `use<Name>.test.tsx` or move it " +
      "under `runtime/` so the audit-traceable exclusion applies."
  );
  process.exit(1);
}

main();
