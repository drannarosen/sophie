import type { FigureRegistryEntry } from "@sophie/core/schema";
import type { VitePluginLike } from "./vite-plugin-like";

/**
 * Vite plugin that exposes the consumer-supplied figures registry as
 * a virtual module importable from `@sophie/astro`-shipped routes
 * and layouts:
 *
 * ```ts
 * import { figures } from "virtual:sophie/figures";
 * ```
 *
 * Wiring: consumer apps configure the registry via
 * `defineSophieIntegration({ figures })`; the integration adds this
 * plugin to `vite.plugins` with the consumer-supplied literal
 * captured by closure. See ADR 0082.
 *
 * Unlike `pedagogyIndexVirtualModule()` (which reads from a module-
 * level accumulator populated by the remark extractor on every MDX
 * parse), this factory captures the consumer's figures literal once
 * at config-parse time. That means **figures changes do not HMR** —
 * editing `src/content/figures.ts` requires a dev-server restart.
 * This is a deliberate trade-off per ADR 0082 § Consequences: the
 * figures registry changes rarely, and the dev-server-restart cost
 * is acceptable. No `handleHotUpdate` hook is exposed here to make
 * the no-HMR semantics structural rather than easy to forget.
 */

export const FIGURES_VIRTUAL_ID = "virtual:sophie/figures";
const RESOLVED_ID = `\0${FIGURES_VIRTUAL_ID}`;

export function figuresVirtualModule(
  figures: Record<string, FigureRegistryEntry>
): VitePluginLike {
  // Boundary guard (PR β.3): the registry key IS the lookup key the
  // figure-registry store + `<FigureRef name>` resolve against, so a
  // key that disagrees with its own `name` field would silently
  // mis-resolve a chapter's figure references. Fail the build instead.
  // (Duplicate keys can't surface here — the input is an object
  // literal, which collapses repeated keys at parse time; the
  // figure-registry store's `onDuplicateKey: "throw"` default guards
  // any dynamic construction path.)
  for (const [key, entry] of Object.entries(figures)) {
    if (key !== entry.name) {
      throw new Error(
        `figures.ts entry key "${key}" does not match its name field "${entry.name}"`
      );
    }
  }
  return {
    name: "sophie:figures",

    resolveId(id: string): string | undefined {
      if (id === FIGURES_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      // JSON.stringify is sufficient because every field on
      // FigureRegistryEntry is plain JSON (strings/numbers).
      return `export const figures = ${JSON.stringify(figures)};\n`;
    },
  };
}
