import type { Schedule } from "@sophie/core/schema";
import type { VitePluginLike } from "./vite-plugin-like";

/**
 * Vite plugin that exposes the consumer's `schedule.sophie.yaml`
 * (parsed + validated by `schedule-loader.ts`) as the
 * `virtual:sophie/schedule` virtual module. The course-home dashboard
 * route imports the class calendar via:
 *
 * ```ts
 * import { schedule } from "virtual:sophie/schedule";
 * ```
 *
 * Wiring: consumer apps configure the calendar by authoring
 * `schedule.sophie.yaml` at the consumer-course repo root.
 * `defineSophieIntegration` loads + validates it at
 * `astro:config:setup` and passes the parsed object to this factory;
 * the integration adds the returned plugin to `vite.plugins`.
 *
 * **R8 HMR strategy declaration.** Like `assignmentsVirtualModule()`
 * and `courseSpecVirtualModule()` (and unlike `pedagogyIndexVirtualModule()`,
 * which reads from a module-level accumulator the remark extractor
 * repopulates on every MDX parse), this factory captures the consumer's
 * parsed schedule literal **once at config-parse time**. That means
 * **schedule.sophie.yaml changes do not HMR** — editing the calendar
 * requires a dev-server restart. This is a deliberate trade-off per
 * ADR 0098 (mirrors course-spec + figures + assignments): the calendar
 * changes rarely (it's global course state, not authored prose), and
 * the dev-server-restart cost is acceptable. No `handleHotUpdate` hook
 * is exposed here to make the no-HMR semantics structural rather than
 * easy to forget.
 *
 * See ADR 0098 for the schema; this module is the realized **third
 * instance** of "consumer-supplied literal exposed as a `T | null`
 * always-register virtual module" (figures was first, course-spec
 * second, assignments alongside) — the R12-family slot the
 * always-register pattern note predicted.
 */
export const SCHEDULE_VIRTUAL_ID = "virtual:sophie/schedule";
const RESOLVED_ID = `\0${SCHEDULE_VIRTUAL_ID}`;

/**
 * `payload` can be `null` when the consumer hasn't authored
 * `schedule.sophie.yaml` yet. We still register the virtual module
 * (exporting `null`) so importers like the course-landing route can
 * `import { schedule } from "virtual:sophie/schedule"` without the
 * import resolution failing at build time. Consumers handle the
 * `null` case explicitly (the week-ranges / This-Week card stay
 * fail-closed).
 */
export function scheduleVirtualModule(
  payload: Schedule | null
): VitePluginLike {
  // JSON.stringify is sufficient because the validated Schedule is
  // plain JSON (every Zod-derived field resolves to a JSON-
  // serializable primitive or array/object thereof). null serializes
  // as the literal `null`.
  const literal = JSON.stringify(payload);
  return {
    name: "sophie:schedule",

    resolveId(id: string): string | undefined {
      if (id === SCHEDULE_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      return `export const schedule = ${literal};\n`;
    },
  };
}
