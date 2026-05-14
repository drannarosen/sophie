import { indexAccumulator } from "./pedagogy-index-extractor.ts";

/**
 * Minimal Vite server shape we read from in handleHotUpdate.
 * Structural type avoids importing the Vite `Plugin` / `ViteDevServer`
 * types, which differ between vite@7 and vite@8 (both resolvable
 * under @sophie/astro's `^7 || ^8` peer range). The integration file
 * casts the returned value to `PluginOption` at the consumer
 * boundary; here we keep the type local and inferable so neither
 * vite version's Plugin shape leaks into our public API.
 */
interface ViteServerLike {
  moduleGraph: {
    getModuleById: (id: string) => unknown;
    invalidateModule: (mod: unknown) => void;
  };
}

/**
 * Vite plugin that exposes the pedagogy index as a virtual module
 * importable from consumer code:
 *
 * ```ts
 * import { definitions, equations } from "virtual:sophie/pedagogy-index";
 * ```
 *
 * Wiring: consumer apps add `pedagogyIndexVirtualModule()` to
 * `astro.config.mjs` under `vite.plugins`. Astro guarantees that
 * content-collection chapters are eagerly parsed (running the
 * remark extractor) before any page renders, so by the time a
 * consumer page imports the virtual module the accumulator is
 * populated.
 *
 * HMR: on `.mdx` changes Vite invalidates the virtual module so
 * dev consumers re-resolve against the freshly-populated state.
 *
 * Per ADR 0038. The remark plugin (`pedagogy-index-extractor.ts`)
 * is the index PRODUCER; this Vite plugin is the index CONSUMER
 * surface.
 */

export const PEDAGOGY_INDEX_VIRTUAL_ID = "virtual:sophie/pedagogy-index";
const RESOLVED_ID = `\0${PEDAGOGY_INDEX_VIRTUAL_ID}`;

export function pedagogyIndexVirtualModule() {
  return {
    name: "sophie:pedagogy-index" as const,

    resolveId(id: string): string | undefined {
      if (id === PEDAGOGY_INDEX_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      const index = indexAccumulator.asPedagogyIndex();
      // JSON.stringify is sufficient because every value in the
      // index is plain JSON (strings/numbers/arrays). Body strings
      // are pre-rendered HTML; consumers embed via set:html.
      return [
        `export const definitions = ${JSON.stringify(index.definitions)};`,
        `export const equations = ${JSON.stringify(index.equations)};`,
        `export const keyInsights = ${JSON.stringify(index.keyInsights)};`,
        `export const figures = ${JSON.stringify(index.figures)};`,
        `export const misconceptions = ${JSON.stringify(index.misconceptions)};`,
      ].join("\n");
    },

    handleHotUpdate({
      file,
      server,
    }: {
      file: string;
      server: ViteServerLike;
    }): void {
      if (!file.endsWith(".mdx")) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
