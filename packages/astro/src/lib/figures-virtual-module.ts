import {
  type FigureRegistryEntry,
  resolveFigureFile,
} from "@sophie/core/schema";
import type { VitePluginLike } from "./vite-plugin-like";

/**
 * Vite plugin that exposes the consumer-supplied figures registry as
 * the `virtual:sophie/figures` virtual module, importable from
 * `@sophie/astro`-shipped routes and layouts:
 *
 * ```ts
 * import { figures, figureAssets } from "virtual:sophie/figures";
 * ```
 *
 * Two exports (ADR 0094, Approach A — single resolved registry):
 *   - `figures` — a name-indexed map of JSON-shaped metadata. For an
 *     **optimized** entry (a master present in `src/figures/`), its
 *     `src`/`width`/`height` are derived from the `astro:assets`
 *     `ImageMetadata` binding (so `figures.<name>.src` is the hashed
 *     `_astro/` URL). This is the map the SSR-setter → FigureRef store
 *     and accumulator → pagefind paths read — both need a plain URL
 *     string, which is why the optimized URL is baked into `figures`
 *     here rather than resolved per-consumer.
 *   - `figureAssets` — a name-indexed map of the **live** `ImageMetadata`
 *     bindings, server-only, consumed by `FigureImage.astro`'s
 *     `<Picture>` for full responsive `srcset`. Optimized entries only;
 *     legacy/inline entries are absent.
 *
 * **Asset resolution** (per entry): an explicit `file` field wins; else
 * the registry key resolves by convention to `src/figures/<key>.<ext>`.
 * An entry with neither a resolvable master nor a literal `src` fails
 * the build (no silent broken image).
 *
 * **R8 HMR strategy declaration.** Like `courseSpecVirtualModule`, this
 * factory captures the consumer's registry literal **and** the
 * `src/figures/` directory listing **once at config-parse time**.
 * Editing `src/content/figures.ts` or adding/removing a master file
 * requires a dev-server restart (no `handleHotUpdate` hook by design,
 * per ADR 0082 § Consequences). Replacing a master file's *contents*
 * (same name) is tracked by Vite through the generated `import`, so
 * `astro:assets` re-optimizes it on rebuild.
 */

export const FIGURES_VIRTUAL_ID = "virtual:sophie/figures";
const RESOLVED_ID = `\0${FIGURES_VIRTUAL_ID}`;

export interface FiguresVirtualModuleOptions {
  /** Absolute path to the consumer's `src/figures/` directory. */
  readonly figuresDir: string;
  /**
   * Basenames present in `figuresDir` (the integration reads these via
   * `fs.readdirSync`; an empty array when the directory is absent).
   */
  readonly availableFiles: readonly string[];
}

/** Object-literal source for an optimized entry: literal metadata + live `ImageMetadata` references. */
function optimizedEntryLiteral(
  entry: FigureRegistryEntry,
  binding: string
): string {
  const fields = [
    `"name": ${JSON.stringify(entry.name)}`,
    `"alt": ${JSON.stringify(entry.alt)}`,
  ];
  if (entry.caption !== undefined) {
    fields.push(`"caption": ${JSON.stringify(entry.caption)}`);
  }
  if (entry.credit !== undefined) {
    fields.push(`"credit": ${JSON.stringify(entry.credit)}`);
  }
  fields.push(
    `"src": ${binding}.src`,
    `"width": ${binding}.width`,
    `"height": ${binding}.height`
  );
  return `{ ${fields.join(", ")} }`;
}

/** JSON literal for a legacy/inline entry (public `src`, no optimization). */
function legacyEntryLiteral(entry: FigureRegistryEntry): string {
  return JSON.stringify({
    name: entry.name,
    src: entry.src,
    alt: entry.alt,
    caption: entry.caption,
    credit: entry.credit,
    width: entry.width,
    height: entry.height,
  });
}

/**
 * Pure codegen for the `virtual:sophie/figures` module source. Separated
 * from the plugin so it is unit-testable without a Vite host (ADR 0061).
 */
export function generateFiguresModuleSource(
  figures: Record<string, FigureRegistryEntry>,
  { figuresDir, availableFiles }: FiguresVirtualModuleOptions
): string {
  const imports: string[] = [];
  const assetEntries: string[] = [];
  const figureEntries: string[] = [];
  let nextBinding = 0;

  for (const [key, entry] of Object.entries(figures)) {
    // Boundary guard (PR β.3): the registry key IS the lookup key the
    // figure-registry store + `<FigureRef name>` resolve against, so a
    // key that disagrees with its own `name` field would silently
    // mis-resolve. Fail the build instead.
    if (key !== entry.name) {
      throw new Error(
        `figures.ts entry key "${key}" does not match its name field "${entry.name}"`
      );
    }

    const file = resolveFigureFile(entry, availableFiles);
    if (file !== undefined) {
      const binding = `a${nextBinding++}`;
      imports.push(`import ${binding} from "${figuresDir}/${file}";`);
      assetEntries.push(`  ${JSON.stringify(key)}: ${binding}`);
      figureEntries.push(
        `  ${JSON.stringify(key)}: ${optimizedEntryLiteral(entry, binding)}`
      );
      continue;
    }

    if (entry.src === undefined) {
      throw new Error(
        `figures.ts entry "${key}" has no resolvable asset: add src/figures/${key}.<ext>, set an explicit \`file\`, or provide a public \`src\`.`
      );
    }
    figureEntries.push(
      `  ${JSON.stringify(key)}: ${legacyEntryLiteral(entry)}`
    );
  }

  const importBlock = imports.length > 0 ? `${imports.join("\n")}\n\n` : "";
  return (
    `${importBlock}` +
    `export const figureAssets = {\n${assetEntries.join(",\n")}\n};\n\n` +
    `export const figures = {\n${figureEntries.join(",\n")}\n};\n`
  );
}

export function figuresVirtualModule(
  figures: Record<string, FigureRegistryEntry>,
  options: FiguresVirtualModuleOptions
): VitePluginLike {
  // Generate eagerly so any build guard (key/name mismatch, missing
  // master) throws at config-parse rather than first import.
  const source = generateFiguresModuleSource(figures, options);
  return {
    name: "sophie:figures",

    resolveId(id: string): string | undefined {
      if (id === FIGURES_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      return source;
    },
  };
}
