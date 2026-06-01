import type { Announcement, AnnouncementRegistry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { activeAnnouncements } from "./home-announcement-projections.ts";

// ─── Fixtures ────────────────────────────────────────────────────────────
//
// `now` = 2026-06-15 (a fixed wall-clock); today (UTC slice) = "2026-06-15".
// Fixture dates are chosen around it: published 06-01 is in the past, 06-20 in
// the future; expire 06-10 is past, 06-30 is future, 06-15 is exactly today.

const NOW = new Date("2026-06-15T12:00:00Z");

/** A minimal `Announcement` — only the fields the projection reads/maps. */
function announcement(
  overrides: Partial<Announcement> &
    Pick<Announcement, "id" | "title" | "severity" | "publish_date">
): Announcement {
  return { ...overrides };
}

/** Wrap announcements into a registry. */
function registry(
  ...announcements: ReadonlyArray<Announcement>
): AnnouncementRegistry {
  return { announcements: [...announcements] };
}

describe("activeAnnouncements", () => {
  test("null registry → []", () => {
    expect(activeAnnouncements(null, NOW)).toEqual([]);
  });

  test("published in the past with no expire_date → included", () => {
    const reg = registry(
      announcement({
        id: "welcome",
        title: "Welcome",
        severity: "info",
        publish_date: "2026-06-01",
      })
    );
    expect(activeAnnouncements(reg, NOW)).toEqual([
      { id: "welcome", title: "Welcome", severity: "info" },
    ]);
  });

  test("publish_date in the future → excluded", () => {
    const reg = registry(
      announcement({
        id: "later",
        title: "Not Yet",
        severity: "info",
        publish_date: "2026-06-20",
      })
    );
    expect(activeAnnouncements(reg, NOW)).toEqual([]);
  });

  test("expire_date in the past → excluded", () => {
    const reg = registry(
      announcement({
        id: "stale",
        title: "Expired",
        severity: "notice",
        publish_date: "2026-06-01",
        expire_date: "2026-06-10",
      })
    );
    expect(activeAnnouncements(reg, NOW)).toEqual([]);
  });

  test("expire_date === today → included (inclusive upper bound)", () => {
    const reg = registry(
      announcement({
        id: "last-day",
        title: "Last Day",
        severity: "notice",
        publish_date: "2026-06-01",
        expire_date: "2026-06-15",
      })
    );
    expect(activeAnnouncements(reg, NOW)).toEqual([
      { id: "last-day", title: "Last Day", severity: "notice" },
    ]);
  });

  test("publish_date === today → included (inclusive lower bound)", () => {
    const reg = registry(
      announcement({
        id: "today",
        title: "Starts Today",
        severity: "info",
        publish_date: "2026-06-15",
      })
    );
    expect(activeAnnouncements(reg, NOW)).toEqual([
      { id: "today", title: "Starts Today", severity: "info" },
    ]);
  });

  test("body and href are carried through to the display shape", () => {
    const reg = registry(
      announcement({
        id: "rich",
        title: "Read This",
        body: "Office hours move to Thursday.",
        severity: "urgent",
        publish_date: "2026-06-01",
        href: "/syllabus#office-hours",
      })
    );
    expect(activeAnnouncements(reg, NOW)).toEqual([
      {
        id: "rich",
        title: "Read This",
        body: "Office hours move to Thursday.",
        severity: "urgent",
        href: "/syllabus#office-hours",
      },
    ]);
  });

  test("sorts urgent before notice before info regardless of publish_date", () => {
    // The info entry is the newest by date; severity still wins the ordering.
    const reg = registry(
      announcement({
        id: "i",
        title: "Info",
        severity: "info",
        publish_date: "2026-06-14",
      }),
      announcement({
        id: "u",
        title: "Urgent",
        severity: "urgent",
        publish_date: "2026-06-02",
      }),
      announcement({
        id: "n",
        title: "Notice",
        severity: "notice",
        publish_date: "2026-06-08",
      })
    );
    expect(activeAnnouncements(reg, NOW).map((a) => a.id)).toEqual([
      "u",
      "n",
      "i",
    ]);
  });

  test("same severity AND same publish_date → stable registry order", () => {
    const reg = registry(
      announcement({
        id: "first",
        title: "First Authored",
        severity: "info",
        publish_date: "2026-06-05",
      }),
      announcement({
        id: "second",
        title: "Second Authored",
        severity: "info",
        publish_date: "2026-06-05",
      })
    );
    expect(activeAnnouncements(reg, NOW).map((a) => a.id)).toEqual([
      "first",
      "second",
    ]);
  });

  test("within the same severity, the newer publish_date comes first", () => {
    const reg = registry(
      announcement({
        id: "old",
        title: "Older Notice",
        severity: "notice",
        publish_date: "2026-06-02",
      }),
      announcement({
        id: "new",
        title: "Newer Notice",
        severity: "notice",
        publish_date: "2026-06-10",
      })
    );
    expect(activeAnnouncements(reg, NOW).map((a) => a.id)).toEqual([
      "new",
      "old",
    ]);
  });

  test("3+ same-severity entries sort newest-first across both compare directions", () => {
    // Three entries force the comparator to fire on both DESC arms (the
    // `< → 1` tie-break arm is unreachable with a 2-element array). Locks the
    // ordering against an arm-swap refactor.
    const reg = registry(
      announcement({
        id: "mid",
        title: "Mid",
        severity: "notice",
        publish_date: "2026-06-05",
      }),
      announcement({
        id: "new",
        title: "New",
        severity: "notice",
        publish_date: "2026-06-10",
      }),
      announcement({
        id: "old",
        title: "Old",
        severity: "notice",
        publish_date: "2026-06-01",
      })
    );
    expect(activeAnnouncements(reg, NOW).map((a) => a.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });
});
