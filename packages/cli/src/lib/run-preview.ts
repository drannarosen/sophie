import { execa } from "execa";
import { resolveConsumerRoot } from "./resolve-consumer-root.ts";

export interface RunPreviewArgs {
  path: string;
  port: number;
  host: string;
  build: boolean;
}

/**
 * Build the consumer's Astro site (unless --no-build) then serve the
 * production output via `astro preview`. Forwards SIGINT/SIGTERM to
 * the preview child so Ctrl-C exits cleanly.
 */
export async function runPreview(args: RunPreviewArgs): Promise<void> {
  const consumerRoot = await resolveConsumerRoot(args.path);

  if (args.build) {
    await execa("astro", ["build"], {
      cwd: consumerRoot,
      stdio: "inherit",
    });
  }

  const previewChild = execa(
    "astro",
    ["preview", "--port", String(args.port), "--host", args.host],
    {
      cwd: consumerRoot,
      stdio: "inherit",
      reject: false,
    }
  );

  const forwardSignal = (sig: NodeJS.Signals) => () => {
    previewChild.kill(sig);
  };
  process.on("SIGINT", forwardSignal("SIGINT"));
  process.on("SIGTERM", forwardSignal("SIGTERM"));

  const result = await previewChild;
  const code = result.exitCode ?? 0;
  if (code !== 0) {
    process.exit(code);
  }
}
