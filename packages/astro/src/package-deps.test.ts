import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @sophie/astro re-exports React-bearing component machinery (the
 * SophieChapter wrapper, the makeStaticComponents factory, and the
 * @astrojs/react integration). It MUST declare `react` and `react-dom`
 * as `peerDependencies`, not as regular `dependencies`, for the same
 * reason as @sophie/components: pnpm + Vite's dep optimizer produces
 * multiple React module instances at runtime when React is a regular
 * dep, causing "Invalid hook call" failures in dev mode.
 *
 * Matches the existing @sophie/astro pattern for `vite` and `esbuild`
 * (per ADR 0027) — both already peerDeps for an analogous reason.
 *
 * See packages/components/src/package-deps.test.ts for the full
 * rationale and bug-repro details.
 */

// vitest runs from the package's working directory under
// `pnpm --filter <pkg> test:unit`, so cwd resolves to packages/astro/.
const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf-8")
) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe("@sophie/astro package.json — React peerDependency convention", () => {
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
