import { buildIfMissing } from "./build-if-missing.ts";
import { detectMonorepo } from "./detect-monorepo.ts";
import { resolveConsumerRoot } from "./resolve-consumer-root.ts";
import { spawnOrchestrator } from "./spawn-orchestrator.ts";

export interface RunStartArgs {
  path: string;
  port: number;
  host: string;
  open: boolean;
}

/**
 * Wires the five Phase-3+4 lib helpers into the real `sophie start`
 * flow: resolve consumer root → detect monorepo → build missing
 * dist artifacts (one-shot) → spawn 1-3 children.
 *
 * Exits the process with the orchestrator's exit code if non-zero;
 * resolves cleanly on graceful shutdown.
 */
export async function runStart(args: RunStartArgs): Promise<void> {
  const consumerRoot = await resolveConsumerRoot(args.path);
  const monorepo = await detectMonorepo(consumerRoot);

  if (monorepo) {
    await buildIfMissing({
      pkgDir: monorepo.themeSrc,
      artifact: "dist/theme.css",
      pkgLabel: "@sophie/theme",
    });
    await buildIfMissing({
      pkgDir: monorepo.componentsSrc,
      artifact: "dist/index.js",
      pkgLabel: "@sophie/components",
    });
  }

  const astroArgs = ["dev", "--port", String(args.port), "--host", args.host];
  if (args.open) astroArgs.push("--open");

  const orchestrator = spawnOrchestrator({
    astro: { cwd: consumerRoot, args: astroArgs },
    componentsWatch: monorepo ? { cwd: monorepo.componentsSrc } : null,
    themeWatch: monorepo ? { cwd: monorepo.themeSrc } : null,
  });

  const result = await orchestrator.done;
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}
