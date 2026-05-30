import { resolve } from "node:path";
import type { FigureRegistryEntry } from "@sophie/core/schema";
import { createJiti } from "jiti";

/**
 * Load a consumer's figure registry from `src/content/figures.ts` (the
 * module passed to `defineSophieIntegration({ figures })`). Uses jiti so
 * the TypeScript module imports on every node version Astro supports
 * (≥22.12), not only those with default-on type stripping (ADR 0094 —
 * the loader-strategy decision, 2026-05-30).
 *
 * Returns the `figures` named export. Throws when the module has no such
 * export, so `sophie figures check` fails loudly on a misnamed registry
 * rather than silently reporting every master as an orphan.
 */
export async function loadFigureRegistry(
  modulePath: string
): Promise<Record<string, FigureRegistryEntry>> {
  const jiti = createJiti(import.meta.url);
  const absolute = resolve(modulePath);
  const mod = await jiti.import<{
    figures?: Record<string, FigureRegistryEntry>;
  }>(absolute);
  if (mod.figures === undefined || typeof mod.figures !== "object") {
    throw new Error(
      `${modulePath} has no \`figures\` export (expected \`export const figures = { ... }\`).`
    );
  }
  return mod.figures;
}
