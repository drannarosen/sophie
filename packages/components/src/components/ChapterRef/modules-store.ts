import type { ModuleEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Modules store. Mirrors `chapters-store.ts`: consumer-app-owned data
 * forwarded from `getCollection('modules')` by `<TextbookLayout>`,
 * surfaced via the shared `createPedagogyStore<T>` factory (PR-C3
 * decision #4).
 *
 * Used by `<ChapterRef>`'s hover-preview to resolve the parent
 * module title from a chapter's `module` slug — the "module
 * breadcrumb" line of PR-C4 decision #2's three-line card.
 *
 * Script-tag id: `sophie-pedagogy-modules`.
 */

export const moduleStore = createPedagogyStore<ModuleEntry>({
  scriptId: "sophie-pedagogy-modules",
  logTag: "[ChapterRef:modules]",
  keyOf: (m) => m.slug,
});

export const __setModules = moduleStore.set;
