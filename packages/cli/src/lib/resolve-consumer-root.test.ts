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

import { resolveConsumerRoot } from "./resolve-consumer-root.ts";

describe("resolveConsumerRoot", () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it("returns the path verbatim if astro.config.ts exists there", async () => {
    vol.fromJSON({
      "/repo/examples/smoke/astro.config.ts": "export default {}",
    });
    const root = await resolveConsumerRoot("/repo/examples/smoke");
    expect(root).toBe("/repo/examples/smoke");
  });

  it("accepts .mjs and .js config variants", async () => {
    vol.fromJSON({ "/repo/proj/astro.config.mjs": "" });
    expect(await resolveConsumerRoot("/repo/proj")).toBe("/repo/proj");

    vol.reset();
    vol.fromJSON({ "/repo/proj/astro.config.js": "" });
    expect(await resolveConsumerRoot("/repo/proj")).toBe("/repo/proj");
  });

  it("throws a friendly error when no astro.config.* exists", async () => {
    vol.fromJSON({ "/repo/not-astro/package.json": "{}" });
    await expect(resolveConsumerRoot("/repo/not-astro")).rejects.toThrow(
      /No astro\.config\.\{ts,mjs,js\} found/
    );
  });

  it("the error message includes the resolved path and a sample command", async () => {
    vol.fromJSON({ "/repo/empty/.gitkeep": "" });
    await expect(resolveConsumerRoot("/repo/empty")).rejects.toThrow(
      /Run from a Sophie consumer repo, or pass the path/
    );
  });
});
