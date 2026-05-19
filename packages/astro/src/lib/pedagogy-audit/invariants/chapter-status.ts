import type { AuditExtras, FindingSink } from "../types.ts";

/**
 * Chapter-status audit invariant (CS2) per ADR 0051.
 *
 *   CS2 INFO — chapter has `status: draft` — excluded from the student
 *              build. Surfaces in audit so the author sees what's been
 *              filtered out.
 *
 * The slug list comes via `extras.draftChapterSlugs` because
 * TextbookLayout filters drafts BEFORE setChapters; the audit's
 * `index.chapters` is the student-visible subset, so the unfiltered
 * slugs come from outside the index.
 *
 * CS1 (chapter MDX missing required `status:` frontmatter) is enforced
 * upstream at the `ChapterSchema` Zod layer — the audit never fires
 * that code because the build fails earlier.
 */
export function checkChapterStatus(
  extras: AuditExtras,
  sink: FindingSink
): void {
  for (const slug of extras.draftChapterSlugs ?? []) {
    sink.info.push({
      severity: "INFO",
      code: "CS2",
      message: `CS2: chapter "${slug}" has status: draft — excluded from the student build per ADR 0051.`,
      location: { chapter: slug },
    });
  }
}
