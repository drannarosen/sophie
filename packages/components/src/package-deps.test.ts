import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Sophie's React-bearing packages (@sophie/components, @sophie/astro)
 * MUST declare `react` and `react-dom` as `peerDependencies`, not as
 * regular `dependencies`. This invariant matches:
 *
 * 1. The existing @sophie/astro pattern for `vite` and `esbuild`
 *    (per ADR 0027) — both peerDeps, both for the same kind of
 *    pnpm + Vite resolution issue.
 * 2. Every well-behaved React library in the npm ecosystem
 *    (Radix UI, MUI, Chakra, etc.) — React-as-peerDep is canonical.
 *
 * Why the rule exists: with pnpm's strict resolution + Vite's
 * per-resolved-path dep optimization, declaring React as a regular
 * dependency causes the workspace package to nest its own React copy.
 * Vite's dev-mode dep optimizer then creates separate optimized chunks
 * for each React resolution path, producing multiple React module
 * instances at runtime. Hooks fail with `Invalid hook call. ... You
 * might have more than one copy of React in the same app` because
 * React's module-level dispatcher state isn't shared across copies.
 *
 * Production builds via Rollup don't hit this code path (Rollup
 * doesn't use Vite's dep optimizer), so the bug only manifests in
 * dev mode — exactly where authors and AI-driven iteration happen.
 *
 * Repro of the bug (before this rule was enforced):
 *   pnpm --filter smoke dev
 *   open http://localhost:4321/chapters/spoiler-alerts
 *   → console: "Invalid hook call. ... You might have more than
 *     one copy of React in the same app" — ~15+ times in
 *     <CollapsibleCard> via Radix UI's <Collapsible>.
 */

// vitest runs from the package's working directory under
// `pnpm --filter <pkg> test:unit`, so cwd resolves to packages/components/.
const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf-8")
) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe("@sophie/components package.json — React peerDependency convention", () => {
  it("declares react as a peerDependency, NOT a regular dependency", () => {
    expect(
      pkg.dependencies?.react,
      "react must NOT be in dependencies (causes pnpm + Vite multi-React-copy bug)"
    ).toBeUndefined();
    expect(
      pkg.peerDependencies?.react,
      "react must be declared as a peerDependency"
    ).toBeDefined();
  });

  it("declares react-dom as a peerDependency, NOT a regular dependency", () => {
    expect(
      pkg.dependencies?.["react-dom"],
      "react-dom must NOT be in dependencies (causes pnpm + Vite multi-React-copy bug)"
    ).toBeUndefined();
    expect(
      pkg.peerDependencies?.["react-dom"],
      "react-dom must be declared as a peerDependency"
    ).toBeDefined();
  });
});
