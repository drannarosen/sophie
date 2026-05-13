import type { Chapter } from "./chapter.js";

/**
 * Returns chapters belonging to a single module, sorted in display
 * order. Sort key precedence:
 *
 *   1. Chapters with `order` defined come first, sorted ascending.
 *   2. Chapters without `order` fall back to `title.localeCompare`.
 *
 * Pure function; no side effects. Caller passes the full chapter
 * list (e.g., `(await getCollection("chapters")).map(c => c.data)`)
 * plus the module slug.
 */
export function chaptersForModule<
  T extends Pick<Chapter, "title" | "module"> & { order?: number },
>(moduleSlug: string, chapters: ReadonlyArray<T>): T[] {
  return chapters
    .filter((c) => c.module === moduleSlug)
    .slice()
    .sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return a.title.localeCompare(b.title);
    });
}
