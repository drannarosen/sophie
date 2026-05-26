#!/usr/bin/env -S npx tsx
/**
 * Per-file LOC budget audit per ADR 0061 Rule 3.
 *
 * Reports counts of source TypeScript files exceeding three thresholds:
 *
 *   300 LOC  INFO     review whether a split would help; not required
 *   500 LOC  WARNING  split planned for the next refactor cycle
 *   800 LOC  ERROR    split required before the next feature PR
 *
 * Test files use higher thresholds (500 / 800 / 1200) because the
 * describe-block density of test files naturally accumulates — a
 * 1,000-LOC test file with 20 describes for 20 source functions is
 * appropriate, not bloat.
 *
 * Exemptions (per ADR 0061 §"Out-of-scope"):
 *   - Schema registry files (`packages/core/src/schema/**`, zod
 *     definitions only) — scan-end-to-end shape, different growth
 *     dynamic from procedural code.
 *   - Barrel files (`index.ts` consisting only of re-exports) — a
 *     routing surface, not a logic surface.
 *
 * Exit code:
 *   0  no source files at ERROR; CI green
 *   1  at least one ERROR-threshold breach (non-exempt) → CI failure
 *
 * Run from repo root: `pnpm lint:loc` or `npx tsx scripts/loc-budget.ts`.
 *
 * Pass `--include-existing` to include the grandfathered allowlist
 * (currently-oversized files) in the count. By default the
 * allowlisted files are reported but don't fail CI — they're tech
 * debt; new offenders are what the rule enforces.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname;

const SOURCE_THRESHOLDS = { info: 300, warning: 500, error: 800 } as const;
const TEST_THRESHOLDS = { info: 500, warning: 800, error: 1200 } as const;

/**
 * Files grandfathered as existing tech debt. New offenders fail CI
 * (per the default invocation); existing offenders are tracked here
 * and reported but not blocking. Each entry should have an issue
 * link or planned-split note attached when feasible.
 *
 * Reduce this list over time. When a file is split + removed from
 * this list, future regressions on the same path fail CI.
 */
const GRANDFATHERED: ReadonlyArray<string> = [
  // Test-file umbrellas accepted at C3+C6; per-method split would
  // create one tiny file per accumulator method, over-decomposing
  // the source-mirror shape.
  "packages/astro/src/lib/pedagogy-index/accumulator.test.ts",
  // Audit-invariant test files retain umbrella shape: each tests
  // one invariant family but exercises many fixture paths.
  "packages/astro/src/lib/pedagogy-audit/invariants/biography.test.ts",
  "packages/astro/src/lib/pedagogy-audit/invariants/multirep.test.ts",
  // Schema-test file: pure zod-parse shape assertions; one describe
  // per entry schema. Splitting would shadow the entries directory.
  "packages/core/src/schema/pedagogy-index.test.ts",
  // Largest pedagogy-index test: extractor-side biography traversal
  // edge cases (post-C6 rename of transform-equation-biography).
  "packages/astro/src/lib/pedagogy-index/extractors/biography.test.ts",
  // accumulator.ts itself is currently above ERROR (>800 LOC).
  // Splitting the IndexAccumulator class into per-method files would
  // shadow the schema entries layout (which is already done in C4).
  // The class is one cohesive unit per ADR 0038's role-aggregation
  // principle.
  "packages/astro/src/lib/pedagogy-index/accumulator.ts",
  // Interactive-figure component; presentation + plotting glue only
  // (physics math extracted to packages/components/src/_physics/blackbody.ts
  // per A+ Phase D). Remaining LOC is the SpectrumPlot Observable Plot
  // setup + the readout/swatch/approximation-toggle JSX; further splits
  // would shadow the figure shape without removing complexity.
  "packages/components/src/figures/BlackbodyExplorer/BlackbodyExplorer.tsx",
];

interface Finding {
  path: string;
  loc: number;
  severity: "info" | "warning" | "error";
  isTest: boolean;
  isExempt: boolean;
  exemptReason?: string;
}

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === ".turbo" ||
      name === "coverage" ||
      name === "_build" ||
      name === ".astro" ||
      name === "storybook-static" ||
      name === "_archive" ||
      name === ".git" ||
      name === ".worktrees"
    ) {
      continue;
    }
    const stat = statSync(full);
    if (stat.isDirectory()) {
      listSourceFiles(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    if (name.endsWith(".d.ts")) continue;
    out.push(full);
  }
  return out;
}

function isBarrel(absPath: string): boolean {
  if (!absPath.endsWith("/index.ts")) return false;
  const source = readFileSync(absPath, "utf8");
  // A barrel is a file whose non-blank, non-comment lines are all
  // either `export { ... } from "..."`, `export type { ... } from "..."`,
  // `export * from "..."`, or the leading docblock. Approximation:
  // every non-blank, non-comment, non-export line disqualifies.
  const lines = source.split("\n");
  let inBlockComment = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") continue;
    if (inBlockComment) {
      if (line.endsWith("*/")) inBlockComment = false;
      continue;
    }
    if (line.startsWith("/*")) {
      if (!line.endsWith("*/")) inBlockComment = true;
      continue;
    }
    if (line.startsWith("//")) continue;
    if (line.startsWith("*")) continue;
    if (
      line.startsWith("export ") ||
      line.startsWith("import ") ||
      line.startsWith("}") ||
      line === ";" ||
      /^[A-Za-z_].*,$/.test(line) ||
      /^"[^"]+",?$/.test(line) ||
      /^type [A-Za-z_]/.test(line)
    ) {
      continue;
    }
    return false;
  }
  return true;
}

function isSchemaRegistry(repoRel: string): boolean {
  // Schema files in @sophie/core/schema are predominantly zod
  // definitions. The umbrella `pedagogy-index.ts` post-C4 is also a
  // composing schema file. Test files in this dir are NOT exempt.
  return (
    repoRel.startsWith("packages/core/src/schema/") &&
    !repoRel.endsWith(".test.ts")
  );
}

function isTest(repoRel: string): boolean {
  return /\.test\.(ts|tsx)$/.test(repoRel);
}

function countLines(absPath: string): number {
  return readFileSync(absPath, "utf8").split("\n").length;
}

function categorize(path: string, loc: number): Finding {
  const isTestFile = isTest(path);
  const thresholds = isTestFile ? TEST_THRESHOLDS : SOURCE_THRESHOLDS;

  let severity: Finding["severity"] | null = null;
  if (loc >= thresholds.error) severity = "error";
  else if (loc >= thresholds.warning) severity = "warning";
  else if (loc >= thresholds.info) severity = "info";

  if (severity === null) {
    return {
      path,
      loc,
      severity: "info",
      isTest: isTestFile,
      isExempt: false,
    };
  }

  let isExempt = false;
  let exemptReason: string | undefined;
  if (isSchemaRegistry(path)) {
    isExempt = true;
    exemptReason = "schema-registry";
  } else if (isBarrel(join(REPO_ROOT, path))) {
    isExempt = true;
    exemptReason = "barrel";
  } else if (GRANDFATHERED.includes(path)) {
    isExempt = true;
    exemptReason = "grandfathered";
  }

  return { path, loc, severity, isTest: isTestFile, isExempt, exemptReason };
}

function main(): void {
  const includeExisting = process.argv.includes("--include-existing");
  const packagesDir = join(REPO_ROOT, "packages");
  const absPaths = listSourceFiles(packagesDir);
  const findings: Finding[] = [];
  for (const abs of absPaths) {
    const repoRel = relative(REPO_ROOT, abs);
    const loc = countLines(abs);
    const f = categorize(repoRel, loc);
    if (loc < SOURCE_THRESHOLDS.info) continue;
    findings.push(f);
  }

  const errors = findings.filter((f) => f.severity === "error" && !f.isExempt);
  const warnings = findings.filter(
    (f) => f.severity === "warning" && !f.isExempt
  );
  const infos = findings.filter((f) => f.severity === "info" && !f.isExempt);
  const exempt = findings.filter((f) => f.isExempt);

  const fmt = (f: Finding): string =>
    `  ${f.loc.toString().padStart(5)} LOC  ${f.path}${
      f.exemptReason ? `  (exempt: ${f.exemptReason})` : ""
    }`;

  console.log("LOC budget audit (ADR 0061 Rule 3)");
  console.log("");
  console.log(`Source thresholds  300 info  /  500 warning  /  800 error`);
  console.log(`Test thresholds    500 info  /  800 warning  / 1200 error`);
  console.log("");

  if (errors.length > 0) {
    console.log(`ERROR (${errors.length}):`);
    for (const f of errors) console.log(fmt(f));
    console.log("");
  }
  if (warnings.length > 0) {
    console.log(`WARNING (${warnings.length}):`);
    for (const f of warnings) console.log(fmt(f));
    console.log("");
  }
  if (infos.length > 0) {
    console.log(`INFO (${infos.length}):`);
    for (const f of infos.sort((a, b) => b.loc - a.loc)) console.log(fmt(f));
    console.log("");
  }

  if (includeExisting && exempt.length > 0) {
    console.log(`EXEMPT (${exempt.length}):`);
    for (const f of exempt.sort((a, b) => b.loc - a.loc)) console.log(fmt(f));
    console.log("");
  }

  const summary = [
    `Summary: ${errors.length} error${errors.length === 1 ? "" : "s"}`,
    `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`,
    `${infos.length} info${infos.length === 1 ? "" : "s"}`,
    `${exempt.length} exempt`,
  ].join(", ");
  console.log(summary);

  if (errors.length > 0) {
    console.log("");
    console.log(
      "Action: split one or more ERROR files before the next feature PR (ADR 0061 Rule 3)."
    );
    process.exit(1);
  }
}

main();
