import type { ChapterEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Chapters store. Per ADR 0038 and PR-C3 decision #4 (the
 * `createPedagogyStore<T>` factory): the SSR setter +
 * client-side-script-tag-hydration boilerplate lives in the shared
 * factory in `../../runtime/pedagogy-store.ts`.
 *
 * Distinct from PR-C1/C2/C3 inline-ref stores in two ways:
 *   1. The data is consumer-app-owned (forwarded from
 *      `getCollection('chapters')` by `<TextbookLayout>`), not
 *      extractor-populated. Mirrors `figureRegistry` (PR-C3) in this
 *      respect.
 *   2. Both the typed factory `lookup` and the underlying store
 *      surface are exposed via the named `chapterStore` object so
 *      `<ChapterRef>` (and future consumers that read both
 *      chapters + modules) can pass the store reference around
 *      without rebinding the lookup function.
 *
 * Script-tag id: `sophie-pedagogy-chapters` — joins the family of
 * `sophie-pedagogy-*` ids established by PR-C1/C2/C3.
 */

export const chapterStore = createPedagogyStore<ChapterEntry>({
  scriptId: "sophie-pedagogy-chapters",
  logTag: "[ChapterRef:chapters]",
  keyOf: (c) => c.slug,
});

export const __setChapters = chapterStore.set;
