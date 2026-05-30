import type { FigureRegistryEntry } from "./pedagogy-index-entries/figure.ts";

/**
 * The figure name→file resolution **convention** (ADR 0094), the single
 * authority shared by the build-time codegen (`@sophie/astro` figures
 * virtual module) and the `sophie figures check` CLI audit. Keeping it
 * here — next to the figure schema, in framework-pure `@sophie/core` —
 * means the build and the audit can never disagree about which master
 * backs a registry entry (Anna-approved extraction, 2026-05-30).
 *
 * Pure: it takes the basenames present in `src/figures/` as an argument
 * (`availableFiles`) rather than touching the filesystem, so it stays
 * inside `@sophie/core`'s no-I/O runtime contract (ADR 0001). The caller
 * (integration or CLI) is the I/O boundary that reads the directory.
 */

/**
 * Image extensions `astro:assets` optimizes plus SVG (passed through).
 * The single authority for "what counts as a figure master", shared by
 * the integration's `src/figures/` scan and the `sophie figures` CLI —
 * if the two disagreed, the build and the audit would see different file
 * sets and report phantom orphans/missing (ADR 0094).
 */
const FIGURE_EXTENSION = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

/** True when `name` is a figure master by extension (case-insensitive). */
export function isFigureFile(name: string): boolean {
  return FIGURE_EXTENSION.test(name);
}

function stripExtension(file: string): string {
  const dot = file.lastIndexOf(".");
  return dot === -1 ? file : file.slice(0, dot);
}

/**
 * Resolve the source filename under `src/figures/` for a registry
 * entry, or `undefined` when no master is present (a legacy/inline `src`
 * entry). The registry key equals `entry.name` (a build guard enforces
 * this), so the name is the convention key.
 *
 * - An explicit `file` wins; throws if that file is not present.
 * - Otherwise the name resolves by `<name>.<ext>`; throws if more than
 *   one extension matches (ambiguous — author must set `file`).
 */
export function resolveFigureFile(
  entry: Pick<FigureRegistryEntry, "name" | "file">,
  availableFiles: readonly string[]
): string | undefined {
  if (entry.file !== undefined) {
    if (!availableFiles.includes(entry.file)) {
      throw new Error(
        `figures.ts entry "${entry.name}" sets file "${entry.file}", but no such file exists in src/figures/.`
      );
    }
    return entry.file;
  }
  const matches = availableFiles.filter(
    (f) => stripExtension(f) === entry.name
  );
  if (matches.length > 1) {
    throw new Error(
      `figures.ts entry "${entry.name}" matches multiple files in src/figures/ (${matches.join(", ")}). Disambiguate with an explicit \`file\` field.`
    );
  }
  return matches[0];
}
