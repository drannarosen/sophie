import { type ChildProcess, spawn } from "node:child_process";
import { expect, test } from "@playwright/test";

/**
 * Phase 8 Task 8.1: end-to-end coverage for `sophie preview`.
 *
 * Mirrors sophie-start.spec.ts but exercises the preview subcommand
 * against a pre-built smoke target (--no-build, the pre-flight build
 * step already produced examples/smoke/dist/). Uses port 4511 to avoid
 * colliding with playwright's webServer (4321), the start spec (4510),
 * or any other worktree's running preview.
 */
test.describe("sophie preview", () => {
  test("serves the built smoke chapter on the requested port and exits cleanly on SIGTERM", async ({
    request,
  }) => {
    test.setTimeout(60_000);
    const port = 4511;
    const child: ChildProcess = spawn(
      "node",
      [
        "packages/cli/dist/bin.js",
        "preview",
        "--port",
        String(port),
        "--no-build",
        "examples/smoke",
      ],
      {
        cwd: process.cwd(),
        stdio: "ignore",
      }
    );

    const exitPromise = new Promise<void>((resolve) => {
      child.once("exit", () => {
        resolve();
      });
    });

    try {
      const deadline = Date.now() + 30_000;
      let serving = false;
      while (Date.now() < deadline) {
        try {
          const res = await request.get(`http://localhost:${port}/`);
          if (res.ok()) {
            serving = true;
            break;
          }
        } catch {
          // preview server not ready yet — keep polling
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      expect(serving).toBe(true);

      const finalRes = await request.get(
        `http://localhost:${port}/units/spoiler-alerts/reading/`
      );
      expect(finalRes.ok()).toBe(true);
    } finally {
      child.kill("SIGTERM");
      await exitPromise;
    }
  });
});
