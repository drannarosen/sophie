import type { AuditExtras, FindingSink } from "../types.ts";

/**
 * Chapter-status audit invariant (CS2) per ADR 0051.
 *
 *   CS2 INFO — Unit has `status: draft` — excluded from the student
 *              build. Surfaces in audit so the author sees what's been
 *              filtered out.
 *
 * W2/D2 graduation: `status` lives on `UnitEntry` now (was the
 * deleted `ChapterEntry`). The slug list comes via
 * `extras.draftChapterSlugs` which TextbookLayout populates from
 * `units.filter(u => u.data.status === 'draft').map(u => u.data.id)`.
 * Per W2/D4's 1:1 convention the unit id equals the chapter slug,
 * so the `draftChapterSlugs` field name persists through W2; W3
 * will rename it to `draftUnitIds`.
 *
 * CS1 (Unit metadata missing required `status:` field) is enforced
 * upstream at the `UnitSchema` Zod layer — the audit never fires
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
      location: { unit: slug },
    });
  }
}
