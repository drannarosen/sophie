import type { CourseSpec } from "@sophie/core/schema";

/**
 * Structural type for the minimal Vite plugin shape we return.
 * Avoids importing the Vite `Plugin` type directly, which differs
 * between vite@7 and vite@8 (both resolvable under @sophie/astro's
 * peer range). The integration file casts the returned value to
 * `PluginOption` at the consumer boundary; here we keep the type
 * local and inferable so neither vite version's `Plugin` shape leaks
 * into our public API. Mirrors figures-virtual-module.ts:12-16 per
 * fix B7 of the post-review revision.
 */
interface VitePluginLike {
  name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
}

/**
 * Vite plugin that exposes the consumer's `course.sophie.yaml`
 * (parsed + validated by `course-spec-loader.ts`) as the
 * `virtual:sophie/course-spec` virtual module. Chrome components +
 * layouts import the spec via:
 *
 * ```ts
 * import { courseSpec } from "virtual:sophie/course-spec";
 * ```
 *
 * Wiring: consumer apps configure the spec by authoring
 * `course.sophie.yaml` at the consumer-course repo root.
 * `defineSophieIntegration` loads + validates the spec at
 * `astro:config:setup` and passes the parsed object to this factory;
 * the integration adds the returned plugin to `vite.plugins`.
 *
 * **R8 HMR strategy declaration.** Unlike `pedagogyIndexVirtualModule()`
 * (which reads from a module-level accumulator the remark extractor
 * repopulates on every MDX parse), this factory captures the
 * consumer's parsed spec literal **once at config-parse time**. That
 * means **course.sophie.yaml changes do not HMR** — editing the spec
 * requires a dev-server restart. This is a deliberate trade-off per
 * ADR 0082 § Consequences (mirrors figures-virtual-module): the
 * spec changes rarely (it's global course state, not authored prose),
 * and the dev-server-restart cost is acceptable. No
 * `handleHotUpdate` hook is exposed here to make the no-HMR
 * semantics structural rather than easy to forget.
 *
 * See ADR 0082 § Consequences for the broader pattern; this module
 * is the second instance of "consumer-supplied literal exposed as
 * virtual module" (figures was first), and the third when iCal +
 * schedule ship in the follow-up sprint.
 */
export const COURSE_SPEC_VIRTUAL_ID = "virtual:sophie/course-spec";
const RESOLVED_ID = `\0${COURSE_SPEC_VIRTUAL_ID}`;

export function courseSpecVirtualModule(spec: CourseSpec): VitePluginLike {
  // JSON.stringify is sufficient because the validated CourseSpec is
  // plain JSON (every Zod-derived field resolves to a JSON-
  // serializable primitive or array/object thereof — see ADR 0080's
  // strict-object discipline).
  const literal = JSON.stringify(spec);
  return {
    name: "sophie:course-spec",

    resolveId(id: string): string | undefined {
      if (id === COURSE_SPEC_VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id: string): string | undefined {
      if (id !== RESOLVED_ID) return undefined;
      return `export const courseSpec = ${literal};\n`;
    },
  };
}
