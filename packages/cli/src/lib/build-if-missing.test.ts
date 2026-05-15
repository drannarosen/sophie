import { vol } from "memfs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});
vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs");
  return memfs.fs.promises;
});

const execaCalls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
vi.mock("execa", () => ({
  execa: vi.fn(async (cmd: string, args: string[], opts?: { cwd?: string }) => {
    execaCalls.push({ cmd, args, cwd: opts?.cwd });
    return { exitCode: 0 };
  }),
}));

import { buildIfMissing } from "./build-if-missing.ts";

describe("buildIfMissing", () => {
  beforeEach(() => {
    vol.reset();
    execaCalls.length = 0;
  });

  it("invokes pnpm build when the dist artifact is missing", async () => {
    vol.fromJSON({
      "/repo/packages/theme/package.json": JSON.stringify({
        name: "@sophie/theme",
      }),
    });
    await buildIfMissing({
      pkgDir: "/repo/packages/theme",
      artifact: "dist/theme.css",
      pkgLabel: "@sophie/theme",
    });
    expect(execaCalls).toHaveLength(1);
    expect(execaCalls[0]).toMatchObject({
      cmd: "pnpm",
      args: ["--filter", "@sophie/theme", "build"],
    });
  });

  it("skips the build when the dist artifact already exists", async () => {
    vol.fromJSON({
      "/repo/packages/theme/dist/theme.css": "html { color: red }",
    });
    await buildIfMissing({
      pkgDir: "/repo/packages/theme",
      artifact: "dist/theme.css",
      pkgLabel: "@sophie/theme",
    });
    expect(execaCalls).toHaveLength(0);
  });
});
