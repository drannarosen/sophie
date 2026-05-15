import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execaCalls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
vi.mock("execa", () => ({
  execa: vi.fn((cmd: string, args: string[], opts?: { cwd?: string }) => {
    execaCalls.push({ cmd, args, cwd: opts?.cwd });
    // Return a Promise-like that satisfies both `await execa(...)` and
    // `previewChild.kill()` (signal-forwarding handler in runPreview).
    // biome-ignore lint/suspicious/noExplicitAny: test mock needs to mimic execa's hybrid Promise + ChildProcess shape
    const p: any = Promise.resolve({ exitCode: 0 });
    p.kill = vi.fn();
    return p;
  }),
}));
vi.mock("./resolve-consumer-root.ts", () => ({
  resolveConsumerRoot: vi.fn(async (path: string) => `/abs${path}`),
}));

import { runPreview } from "./run-preview.ts";

describe("runPreview", () => {
  beforeEach(() => {
    execaCalls.length = 0;
  });

  afterEach(() => {
    // Signal handlers are registered on `process` per-invocation; clear
    // them so handler-leakage warnings don't accumulate across cases.
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("runs astro build before astro preview when build: true", async () => {
    await runPreview({
      path: "./smoke",
      port: 4321,
      host: "localhost",
      build: true,
    });
    expect(execaCalls).toHaveLength(2);
    expect(execaCalls[0]).toMatchObject({ cmd: "astro", args: ["build"] });
    expect(execaCalls[1]?.cmd).toBe("astro");
    expect(execaCalls[1]?.args[0]).toBe("preview");
  });

  it("skips build when build: false", async () => {
    await runPreview({
      path: "./smoke",
      port: 4321,
      host: "localhost",
      build: false,
    });
    expect(execaCalls).toHaveLength(1);
    expect(execaCalls[0]?.args[0]).toBe("preview");
  });

  it("passes port + host to the preview spawn", async () => {
    await runPreview({ path: ".", port: 3000, host: "0.0.0.0", build: false });
    expect(execaCalls[0]?.args).toEqual([
      "preview",
      "--port",
      "3000",
      "--host",
      "0.0.0.0",
    ]);
  });
});
