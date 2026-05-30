#!/usr/bin/env -S npx tsx
/**
 * Raw-`dangerouslySetInnerHTML` gate per AGENTS.md standing review rule
 * R14 and ADR 0093 (build-time HTML trust primitive).
 *
 * ADR 0093 collapses what were 28 per-site `dangerouslySetInnerHTML`
 * trust arguments across 11 component files into ONE sanctioned
 * chokepoint, `runtime/BuildTimeHtml.tsx`. R14 keeps that surface
 * collapsed: a 29th site (a new raw injection anywhere else) is the
 * structural regression this gate forbids — the difference between
 * "centralized by convention" and "centralized, enforced."
 *
 * Contract:
 *
 *   No `.ts` / `.tsx` under any `packages/<pkg>/src` (excluding test files)
 *   may use the `dangerouslySetInnerHTML=` JSX attribute, EXCEPT the
 *   single allowlisted chokepoint. Prose mentions and the type-level
 *   `Omit<…, "dangerouslySetInnerHTML">` exclusion do NOT count — the
 *   gate matches the attribute-assignment form (`dangerouslySetInnerHTML=`)
 *   only, so documentation referencing the API stays legal.
 *
 *   Raw use elsewhere → CI red. Route it through `<BuildTimeHtml>`.
 *
 * Allowlist (audit-traceable):
 *
 *   - `packages/components/src/runtime/BuildTimeHtml.tsx`
 *                               THE chokepoint. Its single `biome-ignore`
 *                               carries the trust-boundary rationale for
 *                               the whole platform (ADR 0093).
 *
 * Test files (`*.test.ts` / `*.test.tsx`) are out of scope: fixtures may
 * inject hand-authored HTML to exercise the DOM, and tests are not a
 * shipped trust surface.
 *
 * Exit codes:
 *
 *   0  no raw usage outside the chokepoint; CI green
 *   1  one or more raw usages → CI red
 *   2  internal grep failure (unexpected)
 *
 * Run from repo root: `pnpm lint:no-raw-inner-html` or
 * `npx tsx scripts/lint-no-raw-inner-html.ts`.
 *
 * ADRs cited: 0093 (build-time HTML trust primitive), 0004 (component
 * contract), 0061 (AI-optimized codebase).
 */

import { execSync } from "node:child_process";

const SCOPE = "packages";

// The one file permitted to use the raw attribute.
const ALLOWLIST = ["packages/components/src/runtime/BuildTimeHtml.tsx"];

/**
 * Every `src` `.ts`/`.tsx` file (excluding tests) whose text contains the
 * `dangerouslySetInnerHTML=` attribute-assignment form. The trailing `=`
 * is what distinguishes a real usage from a prose mention or the
 * type-level `Omit<…, "dangerouslySetInnerHTML">` exclusion (which is
 * quoted, not assigned). `-l` lists matching files; `-r` recurses.
 */
function filesWithRawUsage(): string[] {
  let output = "";
  try {
    // grep exit 1 (no matches) is the clean case — handled in catch.
    output = execSync(
      `grep -rlE "dangerouslySetInnerHTML[[:space:]]*=" ${SCOPE} ` +
        `--include="*.ts" --include="*.tsx" ` +
        `--exclude="*.test.ts" --exclude="*.test.tsx"`,
      { encoding: "utf8" }
    );
  } catch (err) {
    const code = (err as { status?: number }).status;
    if (code === 1) return []; // no matches anywhere
    console.error("lint-no-raw-inner-html: grep failed unexpectedly");
    console.error(err);
    process.exit(2);
  }
  return output.split("\n").filter((line) => line.length > 0);
}

function main(): void {
  const offenders = filesWithRawUsage().filter(
    (path) => !ALLOWLIST.includes(path)
  );

  if (offenders.length === 0) {
    console.log(
      `✓ no-raw-inner-html: dangerouslySetInnerHTML is confined to the ` +
        `${ALLOWLIST.length} sanctioned chokepoint ` +
        `(${ALLOWLIST.join(", ")}). ADR 0093 + AGENTS.md R14.`
    );
    process.exit(0);
  }

  console.error(
    `no-raw-inner-html: ${offenders.length} file${
      offenders.length === 1 ? "" : "s"
    } ${offenders.length === 1 ? "uses" : "use"} raw dangerouslySetInnerHTML ` +
      "outside the sanctioned chokepoint — " +
      "violates AGENTS.md R14 + ADR 0093:"
  );
  console.error("");
  for (const path of offenders) {
    console.error(`  ${path}`);
  }
  console.error("");
  console.error(
    "Action: route the injection through `<BuildTimeHtml html={…} trust={…} />` " +
      "(packages/components/src/runtime/BuildTimeHtml.tsx). Pick the `trust` " +
      "value that names why the HTML is safe (katex / mdx-serialized / " +
      "extractor-body). If a genuinely new trusted pipeline exists, extend the " +
      "BuildTimeHtmlTrust union + ADR 0093 rather than re-introducing a raw site."
  );
  process.exit(1);
}

main();
