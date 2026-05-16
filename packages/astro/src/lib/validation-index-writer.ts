import { stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PedagogyIndex } from "@sophie/core/schema";
import { generateValidationIndex } from "./validation-index-generator.ts";

/**
 * Side-effecting wrapper around `generateValidationIndex` (ADR 0056 PR 5).
 *
 * Writes `docs/website/status/validation.md` from a `PedagogyIndex`
 * snapshot. Called from `pagefind-postbuild.ts`'s `buildPagefindIndex`
 * right next to `writePedagogyIndexJson` so both artifacts come from
 * the same in-memory snapshot — one extraction pass, two outputs.
 *
 * Returns early in two cases:
 *
 *   1. `SOPHIE_DOCS_INCLUDE_VALIDATION=0` — symmetric with PR #50's
 *      admonition gate; the validation surface is private pre-launch
 *      (ADR 0056). When the flag is off, both the admonition and this
 *      index page disappear.
 *
 *   2. `<sophieRoot>/docs/website/status/` is absent — consumer repos
 *      that use `@sophie/astro` without shipping the Sophie docs tree
 *      (the smoke fixture, eventual real course repos) keep working
 *      unchanged. Mirrors `validation-extractor.ts`'s ENOENT-tolerance.
 */
export async function writeValidationIndexMarkdown(
  index: PedagogyIndex,
  sophieRoot: string
): Promise<void> {
  if (process.env.SOPHIE_DOCS_INCLUDE_VALIDATION === "0") return;

  const statusDir = join(sophieRoot, "docs", "website", "status");
  try {
    const dirStat = await stat(statusDir);
    if (!dirStat.isDirectory()) return;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "ENOENT"
    ) {
      return;
    }
    throw err;
  }

  const body = generateValidationIndex(index);
  await writeFile(join(statusDir, "validation.md"), body, "utf8");
}
