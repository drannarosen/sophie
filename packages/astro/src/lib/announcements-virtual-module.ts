import type { AnnouncementRegistry } from "@sophie/core/schema";
import type { VitePluginLike } from "./vite-plugin-like";

/**
 * Vite plugin that exposes the consumer's `announcements.sophie.yaml`
 * (parsed + validated by `announcements-loader.ts`) as the
 * `virtual:sophie/announcements` virtual module. The course-home
 * dashboard route imports the banner registry via:
 *
 * ```ts
 * import { announcements } from "virtual:sophie/announcements";
 * ```
 *
 * Wiring: consumer apps configure notices by authoring
 * `announcements.sophie.yaml` at the consumer-course repo root.
 * `defineSophieIntegration` loads + validates it at
 * `astro:config:setup` and passes the parsed object to this factory;
 * the integration adds the returned plugin to `vite.plugins`.
 *
 * **R8 HMR strategy declaration.** Like `scheduleVirtualModule()`,
 * `assignmentsVirtualModule()`, and `courseSpecVirtualModule()` (and
 * unlike `pedagogyIndexVirtualModule()`, which reads from a module-level
 * accumulator the remark extractor repopulates on every MDX parse), this
 * factory captures the consumer's parsed announcements literal **once at
 * config-parse time**. That means **announcements.sophie.yaml changes do
 * not HMR** — editing the banner registry requires a dev-server restart.
 * This is a deliberate trade-off per ADR 0099 (mirrors course-spec +
 * figures + assignments + schedule): the registry changes rarely (it's
 * global course state, not authored prose), and the dev-server-restart
 * cost is acceptable. No `handleHotUpdate` hook is exposed here to make
 * the no-HMR semantics structural rather than easy to forget.
 *
 * See ADR 0099 for the schema; this module is the realized **fourth
 * instance** of "consumer-supplied literal exposed as a `T | null`
 * always-register virtual module" (figures was first, course-spec
 * second, assignments alongside, schedule third) — the R12-family slot
 * the always-register pattern note predicted.
 */
export const ANNOUNCEMENTS_VIRTUAL_ID = "virtual:sophie/announcements";
const RESOLVED_ID = `\0${ANNOUNCEMENTS_VIRTUAL_ID}`;

/**
 * `payload` can be `null` when the consumer hasn't authored
 * `announcements.sophie.yaml` yet. We still register the virtual module
 * (exporting `null`) so importers like the course-landing route can
 * `import { announcements } from "virtual:sophie/announcements"` without
 * the import resolution failing at build time. Consumers handle the
 * `null` case explicitly (the banner stays fail-closed).
 */
export function announcementsVirtualModule(
  payload: AnnouncementRegistry | null
): VitePluginLike {
  // JSON.stringify is sufficient because the validated AnnouncementRegistry
  // is plain JSON (every Zod-derived field resolves to a JSON-
  // serializable primitive or array/object thereof). null serializes
  // as the literal `null`.
  const literal = JSON.stringify(payload);
  return {
    name: "sophie:announcements",

    resolveId(id: string): string | undefined {
      if (id === ANNOUNCEMENTS_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      return `export const announcements = ${literal};\n`;
    },
  };
}
