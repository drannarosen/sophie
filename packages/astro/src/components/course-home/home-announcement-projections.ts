import type { Announcement, AnnouncementRegistry } from "@sophie/core/schema";

/**
 * Pure build-time projection of the announcements registry (ADR 0099) into the
 * stacked-banner display shape the course-home banner renders (ADR 0097 #5).
 * A sibling `.ts` to `home-schedule-projections.ts` / `home-card-projections.ts`
 * per ADR 0061's focused-files rule — the announcement-gating cluster is its own
 * cohesive seam, distinct from the calendar and card derivations.
 *
 * The function is pure with an INJECTED `now` — there is NO `new Date()` reading
 * the wall-clock and NO virtual-module import. The dispatcher (Task 5) owns the
 * impure edges: it reads `virtual:sophie/announcements` + the single build
 * wall-clock and feeds the props down.
 *
 * DATE COMPARISON: `publish_date`/`expire_date` are `z.iso.date()`
 * (zero-padded `YYYY-MM-DD`), so ISO strings sort lexicographically ==
 * chronologically — the gate + sort use STRING comparison against a
 * `YYYY-MM-DD` slice of `now` (`now.toISOString().slice(0, 10)`, the exact
 * today-derivation `home-schedule-projections.ts` uses — one UTC date basis,
 * no second convention). No `Date` parsing of the announcement dates, no
 * timezone drift.
 */

/**
 * The display shape the banner renders. `publish_date`/`expire_date` are gating
 * inputs only — not rendered — so they are dropped from the output; the banner
 * shows `title`/`body`/`severity`/`href`.
 */
export interface ActiveAnnouncement {
  /** Announcement id — stable key. */
  readonly id: string;
  /** Banner heading. */
  readonly title: string;
  /** Optional banner body prose. */
  readonly body?: string;
  /** Drives the scoped `--sophie-home-*` palette + the sort order. */
  readonly severity: "info" | "notice" | "urgent";
  /** Optional link target the banner exposes. */
  readonly href?: string;
}

/** Sort rank — lower sorts first (urgent before notice before info). */
const SEVERITY_RANK: Record<ActiveAnnouncement["severity"], number> = {
  urgent: 0,
  notice: 1,
  info: 2,
};

function isActive(a: Announcement, today: string): boolean {
  return (
    a.publish_date <= today &&
    (a.expire_date === undefined || today <= a.expire_date)
  );
}

/**
 * Build the ordered list of currently-active announcements (ADR 0099). Keep
 * only those whose publish window contains `now` — `publish_date <= today <=
 * (expire_date ?? +∞)`, fail-closed (a future-published or already-expired
 * notice is dropped). Sort by severity (urgent > notice > info), tie-broken by
 * `publish_date` DESC (newest first). A `null` registry yields `[]` (the banner
 * is then dropped — no empty chrome). `now` is INJECTED.
 */
export function activeAnnouncements(
  registry: AnnouncementRegistry | null,
  now: Date
): ActiveAnnouncement[] {
  if (!registry) return [];
  const today = now.toISOString().slice(0, 10);

  return registry.announcements
    .filter((a) => isActive(a, today))
    .sort((a, b) => {
      const byRank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (byRank !== 0) return byRank;
      // Tie-break: newer publish_date first (reversed string compare).
      return a.publish_date < b.publish_date
        ? 1
        : a.publish_date > b.publish_date
          ? -1
          : 0;
    })
    .map((a) => ({
      id: a.id,
      title: a.title,
      ...(a.body !== undefined ? { body: a.body } : {}),
      severity: a.severity,
      ...(a.href !== undefined ? { href: a.href } : {}),
    }));
}
