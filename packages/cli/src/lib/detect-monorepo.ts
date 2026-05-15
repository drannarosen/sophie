import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface MonorepoDetectResult {
  monorepoRoot: string;
  componentsSrc: string;
  themeSrc: string;
}

/**
 * Walk up from `startPath` looking for a pnpm-workspace.yaml file. If
 * found, verify the monorepo contains @sophie/components and
 * @sophie/theme as workspace packages — return their absolute paths.
 * Return null if no workspace file is found, or if the workspace
 * lacks the Sophie packages (external monorepo, not Sophie's own).
 *
 * Stops at the filesystem root. Pure async + read-only.
 */
export async function detectMonorepo(
  startPath: string
): Promise<MonorepoDetectResult | null> {
  let current = resolve(startPath);
  while (true) {
    const workspaceYaml = `${current}/pnpm-workspace.yaml`;
    try {
      await access(workspaceYaml);
      // Found a workspace; verify it's Sophie's by looking for the packages.
      const componentsSrc = `${current}/packages/components`;
      const themeSrc = `${current}/packages/theme`;
      try {
        await access(`${componentsSrc}/package.json`);
        await access(`${themeSrc}/package.json`);
        // Confirm names — defensive against a non-Sophie monorepo with
        // matching directory layout.
        const componentsPkg = JSON.parse(
          await readFile(`${componentsSrc}/package.json`, "utf8")
        );
        const themePkg = JSON.parse(
          await readFile(`${themeSrc}/package.json`, "utf8")
        );
        if (
          componentsPkg.name === "@sophie/components" &&
          themePkg.name === "@sophie/theme"
        ) {
          return { monorepoRoot: current, componentsSrc, themeSrc };
        }
      } catch {
        // workspace exists but isn't Sophie's; bail.
      }
      return null;
    } catch {
      // no workspace yaml here; walk up
    }
    const parent = dirname(current);
    if (parent === current) return null; // filesystem root
    current = parent;
  }
}
