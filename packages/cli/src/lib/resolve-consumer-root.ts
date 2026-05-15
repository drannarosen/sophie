import { access } from "node:fs/promises";
import { resolve } from "node:path";

const CONFIG_NAMES = [
  "astro.config.ts",
  "astro.config.mjs",
  "astro.config.js",
] as const;

/**
 * Resolve a Sophie consumer's project root by verifying it contains an
 * Astro config file. The path argument can be absolute or relative; it's
 * resolved against process.cwd().
 *
 * Throws a user-actionable error if no astro.config.{ts,mjs,js} is
 * present at the resolved path. The error message names the path and
 * suggests `sophie start ./examples/smoke` as a sample correction.
 */
export async function resolveConsumerRoot(path: string): Promise<string> {
  const absolute = resolve(path);
  for (const name of CONFIG_NAMES) {
    try {
      await access(`${absolute}/${name}`);
      return absolute;
    } catch {
      // file not present; try next variant
    }
  }
  throw new Error(
    `No astro.config.{ts,mjs,js} found in ${absolute}. ` +
      `Run from a Sophie consumer repo, or pass the path: ` +
      `sophie start ./examples/smoke`
  );
}
