import type { HomeworkRegistry } from "@sophie/core/schema";
import type { VitePluginLike } from "./vite-plugin-like.ts";

/**
 * Vite plugin that exposes the consumer's `homework.sophie.yaml`
 * (parsed + validated by `homework-loader.ts`) as the
 * `virtual:sophie/homework` virtual module. The Solutions reveal gate
 * imports the registry via:
 *
 * ```ts
 * import { homework } from "virtual:sophie/homework";
 * ```
 *
 * Wiring: consumer apps configure the registry by authoring
 * `homework.sophie.yaml` at the consumer-course repo root.
 * `defineSophieIntegration` loads + validates it at
 * `astro:config:setup` and passes the parsed object to this factory;
 * the integration adds the returned plugin to `vite.plugins`.
 *
 * **R8 HMR strategy declaration.** Like `courseSpecVirtualModule()`
 * (and unlike `pedagogyIndexVirtualModule()`, which reads from a
 * module-level accumulator the remark extractor repopulates on every
 * MDX parse), this factory captures the consumer's parsed registry
 * literal **once at config-parse time**. That means
 * **homework.sophie.yaml changes do not HMR** — editing the registry
 * requires a dev-server restart. This is a deliberate trade-off per
 * ADR 0096 § Consequences (mirrors course-spec + figures): the
 * registry changes rarely (it's global course state, not authored
 * prose), and the dev-server-restart cost is acceptable. No
 * `handleHotUpdate` hook is exposed here to make the no-HMR
 * semantics structural rather than easy to forget.
 *
 * See ADR 0096 for the broader pattern; this module is the third
 * instance of "consumer-supplied literal exposed as virtual module"
 * (figures was first, course-spec second).
 */
export const HOMEWORK_VIRTUAL_ID = "virtual:sophie/homework";
const RESOLVED_ID = `\0${HOMEWORK_VIRTUAL_ID}`;

/**
 * `registry` can be `null` when the consumer hasn't authored
 * `homework.sophie.yaml` yet. We still register the virtual module
 * (exporting `null`) so importers like the Solutions route can
 * `import { homework } from "virtual:sophie/homework"` without the
 * import resolution failing at build time. Consumers handle the
 * `null` case explicitly (the reveal gate stays fail-closed for every
 * chapter).
 */
export function homeworkVirtualModule(
  registry: HomeworkRegistry | null
): VitePluginLike {
  // JSON.stringify is sufficient because the validated HomeworkRegistry
  // is plain JSON (every Zod-derived field resolves to a JSON-
  // serializable primitive or array/object thereof). null serializes
  // as the literal `null`.
  const literal = JSON.stringify(registry);
  return {
    name: "sophie:homework",

    resolveId(id: string): string | undefined {
      if (id === HOMEWORK_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      return `export const homework = ${literal};\n`;
    },
  };
}
