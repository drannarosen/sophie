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
  exports?: Record<string, unknown>;
};

const integrationSrc = readFileSync(
  resolve(process.cwd(), "src/integration.ts"),
  "utf-8"
);

/**
 * Every route the integration injects via
 * `entrypoint: "@sophie/astro/routes/<file>.astro"` must resolve through
 * package.json `exports`. Node's `exports` map is a closed allowlist: a
 * subpath the integration injects but `exports` does not declare is
 * unresolvable in a packaged consumer (Astro falls back to a literal-path
 * open at the consumer root → ENOENT). Derived from source rather than
 * hard-coded so a future injected route can't ship without its exports
 * key. Bug class: the course-info-projection sprint added three route
 * dispatchers + injectRoute calls + R12 guards but never wired their
 * exports keys, breaking astr201's packed-copy build.
 */
const injectedRouteEntrypoints = [
  ...new Set(
    [
      ...integrationSrc.matchAll(
        /entrypoint:\s*"(@sophie\/astro\/routes\/[^"]+)"/g
      ),
    ]
      .map((m) => m[1])
      .filter((e): e is string => e !== undefined)
  ),
];

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

describe("@sophie/astro package.json — injected routes are exported", () => {
  it("injects at least one route entrypoint (guards against a vacuous match)", () => {
    expect(injectedRouteEntrypoints.length).toBeGreaterThan(0);
  });

  it.each(
    injectedRouteEntrypoints
  )("declares an exports subpath for %s", (entrypoint) => {
    const subpath = entrypoint.replace("@sophie/astro", ".");
    expect(
      pkg.exports?.[subpath],
      `${entrypoint} is injected via injectRoute but missing from package.json exports — Node's closed-allowlist exports resolution will ENOENT in packaged consumers`
    ).toBeDefined();
  });
});
