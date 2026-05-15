import { access } from "node:fs/promises";
import { execa } from "execa";

export interface BuildIfMissingArgs {
  pkgDir: string;
  artifact: string; // relative to pkgDir
  pkgLabel: string; // e.g. "@sophie/theme"
}

/**
 * If the artifact (typically dist/something) doesn't exist under
 * pkgDir, invoke `pnpm --filter <pkgLabel> build` and wait for
 * completion. No-op when the artifact is already present.
 *
 * Used by `sophie start` to handle fresh-clone case where @sophie/theme
 * + @sophie/components haven't been built yet.
 */
export async function buildIfMissing(args: BuildIfMissingArgs): Promise<void> {
  const full = `${args.pkgDir}/${args.artifact}`;
  try {
    await access(full);
    return; // exists; skip
  } catch {
    // missing; build
  }
  process.stdout.write(
    `Building ${args.pkgLabel} (${args.artifact} missing)...\n`
  );
  await execa("pnpm", ["--filter", args.pkgLabel, "build"], {
    cwd: args.pkgDir.split("/packages/")[0] || process.cwd(),
  });
}
