import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** EventEmitter subclass with a no-op .pipe() so the orchestrator's
 *  `child.stdout?.pipe(prefixStream(...)).pipe(process.stdout)` chain
 *  succeeds against a mocked child. */
class PipeableEmitter extends EventEmitter {
  pipe(target: unknown): unknown {
    return target;
  }
}

class MockChild extends EventEmitter {
  stdout = new PipeableEmitter();
  stderr = new PipeableEmitter();
  pid = Math.floor(Math.random() * 100000);
  kill = vi.fn();
  constructor(
    public cmd: string,
    public args: string[],
    public opts: { cwd?: string }
  ) {
    super();
    mockChildren.push(this);
  }
}

const mockChildren: MockChild[] = [];

vi.mock("execa", () => ({
  execa: vi.fn((cmd: string, args: string[], opts?: { cwd?: string }) => {
    const child = new MockChild(cmd, args, opts ?? {});
    // biome-ignore lint/suspicious/noExplicitAny: the orchestrator uses .stdout/.stderr/.pid/.kill plus .then; mocking the full ResultPromise contract is unnecessary surface area.
    const promise: any = new Promise((resolve) => {
      child.on("exit", (code: number) => resolve({ exitCode: code }));
    });
    promise.stdout = child.stdout;
    promise.stderr = child.stderr;
    promise.pid = child.pid;
    promise.kill = child.kill;
    return promise;
  }),
}));

vi.mock("./prefix-stream.ts", () => ({
  prefixStream: vi.fn(() => ({
    pipe: vi.fn((target: unknown) => target),
  })),
}));

import { spawnOrchestrator } from "./spawn-orchestrator.ts";

describe("spawnOrchestrator", () => {
  beforeEach(() => {
    mockChildren.length = 0;
  });

  afterEach(() => {
    // Prevent SIGINT/SIGTERM listener accumulation across tests.
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("spawns astro + components-watch + theme-watch when monorepo info provided", async () => {
    const orchestrator = spawnOrchestrator({
      astro: {
        cwd: "/repo/examples/smoke",
        args: ["dev", "--port", "4321", "--host", "localhost"],
      },
      componentsWatch: { cwd: "/repo/packages/components" },
      themeWatch: { cwd: "/repo/packages/theme" },
    });

    expect(mockChildren).toHaveLength(3);
    expect(mockChildren[0]?.cmd).toBe("astro");
    expect(mockChildren[1]?.args).toContain("--watch");
    expect(mockChildren[2]?.opts.cwd).toBe("/repo/packages/theme");

    for (const c of mockChildren) c.emit("exit", 0);
    await orchestrator.done;
  });

  it("spawns only astro when monorepo info is absent (external-consumer mode)", async () => {
    const orchestrator = spawnOrchestrator({
      astro: { cwd: "/external", args: ["dev"] },
      componentsWatch: null,
      themeWatch: null,
    });

    expect(mockChildren).toHaveLength(1);
    expect(mockChildren[0]?.cmd).toBe("astro");

    mockChildren[0]?.emit("exit", 0);
    await orchestrator.done;
  });

  it("fail-fast: when one child exits non-zero, others are SIGTERM'd", async () => {
    const orchestrator = spawnOrchestrator({
      astro: { cwd: "/proj", args: ["dev"] },
      componentsWatch: { cwd: "/pkg/components" },
      themeWatch: { cwd: "/pkg/theme" },
    });

    expect(mockChildren).toHaveLength(3);

    mockChildren[0]?.emit("exit", 1);
    await new Promise((r) => setImmediate(r));

    expect(mockChildren[1]?.kill).toHaveBeenCalledWith("SIGTERM");
    expect(mockChildren[2]?.kill).toHaveBeenCalledWith("SIGTERM");

    mockChildren[1]?.emit("exit", 143);
    mockChildren[2]?.emit("exit", 143);

    const result = await orchestrator.done;
    expect(result.exitCode).toBe(1);
  });
});
