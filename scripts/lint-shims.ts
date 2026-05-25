#!/usr/bin/env -S npx tsx
/**
 * Back-compat shim detection per AGENTS.md "Pre-launch; no backwards
 * compatibility" + Phase C of the Sophie A+ hardening plan.
 *
 * Sophie has zero production students. Per the engineering principle:
 * hard renames are the right shape, drop legacy shapes in the same PR,
 * no back-compat shims, no deprecation cycles. Any shim marker landing
 * in source code is dead-shape drift that defeats the rule and
 * accumulates AI-author confusion.
 *
 * Detected patterns (narrow on purpose):
 *
 *   - `@deprecated` JSDoc tags
 *   - `// COMPAT`, `// SHIM`, `// LEGACY`, `// BACKCOMPAT` comment
 *     prefixes (with optional leading whitespace)
 *
 * The patterns intentionally exclude prose mentions of "backward-compat"
 * or "legacy" inside test descriptions, identifiers, or strings. The
 * Phase C audit found 3 such benign mentions (test names like
 * "round-trips backward-compat state"); the narrowed pattern leaves
 * them alone and only flags the four canonical shim-marker shapes.
 *
 * Scope:
 *
 *   packages/  — all platform package source (ts, tsx, mts)
 *   examples/  — smoke + packed-smoke consumer demos
 *
 * Exit code:
 *
 *   0  no shim markers found; CI green
 *   1  one or more matches → CI red
 *   2  internal grep failure (unexpected)
 *
 * Run from repo root: `pnpm lint:shims` or
 * `npx tsx scripts/lint-shims.ts`.
 */

import { execSync } from "node:child_process";

const PATHS = ["packages", "examples"] as const;

// Two alternations joined with `|`:
//   1. `@deprecated`              — JSDoc deprecation tag (anywhere on line)
//   2. `^\s*//\s*(COMPAT|SHIM|LEGACY|BACKCOMPAT)\b`
//                                 — line-leading shim-marker comment,
//                                   optional whitespace + word boundary
//                                   so the markers don't false-positive
//                                   on prose like "// LEGACY_ENV var".
//
// POSIX `[[:space:]]` is used (not `\s`) because we hand the pattern to
// `grep -E`, which doesn't recognise PCRE shorthand classes on macOS or
// the GitHub-hosted ubuntu runners by default.
const PATTERN =
  "@deprecated|^[[:space:]]*//[[:space:]]*(COMPAT|SHIM|LEGACY|BACKCOMPAT)\\b";

function main(): void {
  let output = "";
  try {
    // `|| true` keeps grep's exit-1-on-no-match from killing the child.
    // We inspect the captured stdout to decide pass/fail ourselves.
    output = execSync(
      `grep -rnE "${PATTERN}" ${PATHS.join(" ")} ` +
        `--include="*.ts" --include="*.tsx" --include="*.mts" || true`,
      { encoding: "utf8" }
    );
  } catch (err) {
    console.error("lint-shims: grep failed unexpectedly");
    console.error(err);
    process.exit(2);
  }

  const matches = output.trim();
  if (matches.length > 0) {
    const count = matches.split("\n").length;
    console.error(
      `Back-compat shim markers found (${count} match${
        count === 1 ? "" : "es"
      }) — pre-launch invariant per AGENTS.md "Pre-launch; no backwards compatibility":`
    );
    console.error("");
    console.error(matches);
    console.error("");
    console.error(
      "Action: remove the shim markers. If a deprecation is genuinely intended, " +
        "raise it in-thread with Anna (HITL mandate) before re-running."
    );
    process.exit(1);
  }

  console.log(
    "✓ no back-compat shim markers across packages/ + examples/ " +
      "(@deprecated, // COMPAT, // SHIM, // LEGACY, // BACKCOMPAT)"
  );
  process.exit(0);
}

main();
