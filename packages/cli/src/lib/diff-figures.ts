import {
  type FigureRegistryEntry,
  resolveFigureFile,
} from "@sophie/core/schema";

/** A registry entry that has no resolvable master and no legacy `src`. */
export interface MissingFigure {
  /** Registry name of the entry that has nothing to render. */
  readonly name: string;
  /** Why it is unrenderable (no master, explicit-file absent, ambiguous). */
  readonly reason: string;
}

/** Result of diffing the registry against `src/figures/` (ADR 0094). */
export interface FigureDiff {
  /** Master files under `src/figures/` that no registry entry claims. */
  readonly orphans: string[];
  /** Registry entries with nothing to render. */
  readonly missing: MissingFigure[];
}

/**
 * Diff the figure registry against the master files present in
 * `src/figures/` (ADR 0094). Pure — the caller (the `check` command)
 * reads the directory and passes basenames in.
 *
 * Each entry is resolved through the shared `resolveFigureFile`
 * convention so this audit and the build-time codegen agree by
 * construction:
 *   - a resolved file marks that master as claimed;
 *   - `undefined` with a legacy `src` is fine (inline escape hatch);
 *   - `undefined` with no `src`, or a resolver throw (explicit `file`
 *     absent / ambiguous), is a `missing` finding.
 * Any file left unclaimed after walking the registry is an `orphan`.
 */
export function diffFigures(
  entries: readonly FigureRegistryEntry[],
  availableFiles: readonly string[]
): FigureDiff {
  const claimed = new Set<string>();
  const missing: MissingFigure[] = [];

  for (const entry of entries) {
    let file: string | undefined;
    try {
      file = resolveFigureFile(entry, availableFiles);
    } catch (err) {
      missing.push({
        name: entry.name,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    if (file !== undefined) {
      claimed.add(file);
      continue;
    }
    if (entry.src === undefined) {
      missing.push({
        name: entry.name,
        reason: `no master in src/figures/ (looked for ${entry.name}.<ext>) and no legacy src`,
      });
    }
  }

  const orphans = availableFiles.filter((f) => !claimed.has(f));
  return { orphans, missing };
}
