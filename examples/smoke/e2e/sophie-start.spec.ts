import { type ChildProcess, spawn } from "node:child_process";
import { expect, test } from "@playwright/test";

/**
 * Phase 8 Task 8.1: end-to-end coverage for `sophie start`.
 *
 * Spawns the real `packages/cli/dist/bin.js` binary against the smoke
 * target, waits for the dev server to come up on a non-default port
 * (4510 — avoids colliding with playwright's webServer on 4321 and
 * with any other worktree's running preview), verifies a chapter URL
 * is served, then SIGTERMs the child cleanly.
 */
test.describe("sophie start", () => {
  test("serves the smoke chapter on the requested port and exits cleanly on SIGTERM", async ({
    request,
  }) => {
    test.setTimeout(60_000);
    const port = 4510;
    const child: ChildProcess = spawn(
      "node",
      [
        "packages/cli/dist/bin.js",
        "start",
        "--port",
        String(port),
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
          // dev server not ready yet — keep polling
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
