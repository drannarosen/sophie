import { resolve } from "node:path";
import type { Plugin as VitePlugin } from "vite";
import { invalidateTopicFile } from "./skill-review-resolver.ts";

/**
 * Companion Vite plugin to `skillReviewResolverRemarkPlugin` (ADR
 * 0079; R+CR C3 follow-up). In dev mode, the remark plugin's
 * module-scoped caches (topic AST + topic-id → path map) survive
 * across HMR refreshes — without this Vite plugin, editing a
 * topic file leaves the resolver serving stale prompts/answers
 * until the dev server restarts, breaking the authoring inner
 * loop the resolver is designed to unlock.
 *
 * Behavior on each HMR file change:
 *   1. If the changed file is under `topicsDir`, call
 *      `invalidateTopicFile(absolutePath)` to drop its cached AST
 *      + the directory-scoped id↔path map.
 *   2. Use the chapter→topic dependency map (recorded during the
 *      remark plugin's resolution pass) to find chapter MDX
 *      modules that referenced this topic. Look those up in the
 *      Vite module graph and return them — Vite then re-runs the
 *      remark plugin against fresh topic content, propagating the
 *      change through to the rendered chapter.
 *
 * Surgical (not full-sweep) invalidation: chapters that didn't
 * reference the changed topic are NOT re-compiled. The dep map
 * is recorded conservatively (one entry per resolver invocation),
 * so the worst case for a chapter editing a topic is one rebuild
 * per dependent chapter.
 *
 * Production builds (one-shot, no HMR) are unaffected — the
 * caches live for the build duration and the plugin's
 * `handleHotUpdate` hook never fires.
 */
export interface SkillReviewResolverVitePluginOptions {
  /** Absolute path to the topics/ content directory. */
  topicsDir: string;
}

export function skillReviewResolverVitePlugin(
  options: SkillReviewResolverVitePluginOptions
): VitePlugin {
  const normalizedTopicsDir = resolve(options.topicsDir);

  return {
    name: "sophie:skill-review-resolver-hmr",
    handleHotUpdate(ctx) {
      const changedPath = resolve(ctx.file);
      if (!isUnderDir(changedPath, normalizedTopicsDir)) return;

      const dependentChapterPaths = invalidateTopicFile(changedPath);
      if (dependentChapterPaths.length === 0) {
        // Cache invalidated but no chapter had referenced this topic
        // yet (e.g., topic added before any chapter consumed it).
        // Let Vite handle the normal module-graph propagation.
        return;
      }

      // Surgical re-run: find dependent chapter modules in Vite's
      // module graph and return them so Vite re-invokes the MDX
      // pipeline (which runs the resolver against fresh topic AST).
      const dependentModules = [];
      for (const chapterPath of dependentChapterPaths) {
        const normalizedChapterPath = resolve(chapterPath);
        const mod = ctx.server.moduleGraph.getModuleById(normalizedChapterPath);
        if (mod) dependentModules.push(mod);
      }
      // Concat dependents with the original ctx.modules so Vite
      // also handles the topic file's own HMR (any direct consumers
      // of the topic module itself stay reactive).
      return [...ctx.modules, ...dependentModules];
    },
  };
}

/**
 * Path-prefix check that's safe against `topicsDir == "/foo"`
 * matching a sibling like `/foobar/...`. Normalizes both sides
 * and requires a trailing separator on the prefix.
 */
function isUnderDir(absPath: string, absDir: string): boolean {
  const dirWithSep = absDir.endsWith("/") ? absDir : `${absDir}/`;
  return absPath === absDir || absPath.startsWith(dirWithSep);
}
