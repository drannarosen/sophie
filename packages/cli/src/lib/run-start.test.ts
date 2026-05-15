import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./resolve-consumer-root.ts", () => ({
  resolveConsumerRoot: vi.fn(async (p: string) => `/abs${p}`),
}));
vi.mock("./detect-monorepo.ts", () => ({
  detectMonorepo: vi.fn(),
}));
vi.mock("./build-if-missing.ts", () => ({
  buildIfMissing: vi.fn(async () => {}),
}));
vi.mock("./spawn-orchestrator.ts", () => ({
  spawnOrchestrator: vi.fn(() => ({
    done: Promise.resolve({ exitCode: 0 }),
  })),
}));

import { buildIfMissing } from "./build-if-missing.ts";
import { detectMonorepo } from "./detect-monorepo.ts";
import { resolveConsumerRoot } from "./resolve-consumer-root.ts";
import { runStart } from "./run-start.ts";
import { spawnOrchestrator } from "./spawn-orchestrator.ts";

describe("runStart", () => {
  beforeEach(() => {
    vi.mocked(resolveConsumerRoot).mockClear();
    vi.mocked(detectMonorepo).mockClear();
    vi.mocked(buildIfMissing).mockClear();
    vi.mocked(spawnOrchestrator).mockClear();
  });

  it("calls helpers in order: resolve → detect → build×2 → spawn (monorepo mode)", async () => {
    vi.mocked(detectMonorepo).mockResolvedValueOnce({
      monorepoRoot: "/repo",
      componentsSrc: "/repo/packages/components",
      themeSrc: "/repo/packages/theme",
    });

    await runStart({
      path: "./smoke",
      port: 4321,
      host: "localhost",
      open: false,
    });

    expect(resolveConsumerRoot).toHaveBeenCalledWith("./smoke");
    expect(detectMonorepo).toHaveBeenCalledWith("/abs./smoke");
    expect(buildIfMissing).toHaveBeenCalledTimes(2);
    expect(buildIfMissing).toHaveBeenNthCalledWith(1, {
      pkgDir: "/repo/packages/theme",
      artifact: "dist/theme.css",
      pkgLabel: "@sophie/theme",
    });
    expect(buildIfMissing).toHaveBeenNthCalledWith(2, {
      pkgDir: "/repo/packages/components",
      artifact: "dist/index.js",
      pkgLabel: "@sophie/components",
    });
    expect(spawnOrchestrator).toHaveBeenCalledTimes(1);
    expect(spawnOrchestrator).toHaveBeenCalledWith({
      astro: {
        cwd: "/abs./smoke",
        args: ["dev", "--port", "4321", "--host", "localhost"],
      },
      componentsWatch: { cwd: "/repo/packages/components" },
      themeWatch: { cwd: "/repo/packages/theme" },
    });
  });

  it("skips buildIfMissing in external-consumer mode (no monorepo)", async () => {
    vi.mocked(detectMonorepo).mockResolvedValueOnce(null);

    await runStart({
      path: "./ext",
      port: 4321,
      host: "localhost",
      open: false,
    });

    expect(buildIfMissing).not.toHaveBeenCalled();
    expect(spawnOrchestrator).toHaveBeenCalledWith(
      expect.objectContaining({
        componentsWatch: null,
        themeWatch: null,
      })
    );
  });

  it("passes --open to astro args when args.open is true", async () => {
    vi.mocked(detectMonorepo).mockResolvedValueOnce(null);

    await runStart({ path: ".", port: 3000, host: "0.0.0.0", open: true });

    expect(spawnOrchestrator).toHaveBeenCalledWith(
      expect.objectContaining({
        astro: expect.objectContaining({
          args: ["dev", "--port", "3000", "--host", "0.0.0.0", "--open"],
        }),
      })
    );
  });
});
