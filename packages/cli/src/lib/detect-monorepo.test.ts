import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});
vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs");
  return memfs.fs.promises;
});

import { detectMonorepo } from "./detect-monorepo.ts";

describe("detectMonorepo", () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it("returns null when no pnpm-workspace.yaml exists up the tree", async () => {
    vol.fromJSON({
      "/repo/just-astro/astro.config.ts": "",
    });
    const result = await detectMonorepo("/repo/just-astro");
    expect(result).toBeNull();
  });

  it("returns monorepo root + sophie pkgs when pnpm-workspace.yaml found one level up", async () => {
    vol.fromJSON({
      "/repo/pnpm-workspace.yaml": `packages:\n  - "packages/*"\n  - "examples/*"`,
      "/repo/packages/components/package.json": JSON.stringify({
        name: "@sophie/components",
      }),
      "/repo/packages/theme/package.json": JSON.stringify({
        name: "@sophie/theme",
      }),
      "/repo/examples/smoke/astro.config.ts": "",
    });
    const result = await detectMonorepo("/repo/examples/smoke");
    expect(result).toEqual({
      monorepoRoot: "/repo",
      componentsSrc: "/repo/packages/components",
      themeSrc: "/repo/packages/theme",
    });
  });

  it("walks up multiple levels", async () => {
    vol.fromJSON({
      "/repo/pnpm-workspace.yaml": `packages:\n  - "packages/*"`,
      "/repo/packages/components/package.json": JSON.stringify({
        name: "@sophie/components",
      }),
      "/repo/packages/theme/package.json": JSON.stringify({
        name: "@sophie/theme",
      }),
      "/repo/nested/deep/proj/astro.config.ts": "",
    });
    const result = await detectMonorepo("/repo/nested/deep/proj");
    expect(result?.monorepoRoot).toBe("/repo");
  });

  it("returns null when monorepo found but @sophie/components missing (external-consumer-like)", async () => {
    vol.fromJSON({
      "/other-monorepo/pnpm-workspace.yaml": `packages:\n  - "apps/*"`,
      "/other-monorepo/apps/textbook/astro.config.ts": "",
    });
    const result = await detectMonorepo("/other-monorepo/apps/textbook");
    expect(result).toBeNull();
  });
});
