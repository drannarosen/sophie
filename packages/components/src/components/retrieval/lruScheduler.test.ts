import { describe, expect, it } from "vitest";
import { selectLeastRecentlyAttempted } from "./lruScheduler.ts";

const attempts = [
  { target_id: "eq:a", updated_at: "2026-05-21T09:00:00Z" },
  { target_id: "eq:b", updated_at: "2026-05-21T10:00:00Z" },
  { target_id: "eq:c", updated_at: "2026-05-21T11:00:00Z" },
] as const;

describe("selectLeastRecentlyAttempted", () => {
  it("returns the N least-recently-attempted target_ids", () => {
    const result = selectLeastRecentlyAttempted({ attempts, max: 2 });
    expect(result).toEqual(["eq:a", "eq:b"]);
  });

  it("returns [] when attempts is empty", () => {
    expect(selectLeastRecentlyAttempted({ attempts: [], max: 5 })).toEqual([]);
  });

  it("returns [] when max is 0 or negative", () => {
    expect(selectLeastRecentlyAttempted({ attempts, max: 0 })).toEqual([]);
    expect(selectLeastRecentlyAttempted({ attempts, max: -1 })).toEqual([]);
  });

  it("returns all targets when max exceeds attempt count", () => {
    expect(selectLeastRecentlyAttempted({ attempts, max: 100 })).toEqual([
      "eq:a",
      "eq:b",
      "eq:c",
    ]);
  });

  it("filters by target_id prefix when scope.targetPrefix is set", () => {
    const mixed = [
      ...attempts,
      { target_id: "topic:logs", updated_at: "2026-05-21T08:00:00Z" },
    ];
    expect(
      selectLeastRecentlyAttempted({
        attempts: mixed,
        max: 5,
        scope: { targetPrefix: "eq:" },
      })
    ).toEqual(["eq:a", "eq:b", "eq:c"]);
  });

  it("deduplicates: multiple attempts of same target collapse using most-recent ts", () => {
    const dup = [
      { target_id: "eq:a", updated_at: "2026-05-21T09:00:00Z" },
      { target_id: "eq:a", updated_at: "2026-05-21T12:00:00Z" },
      { target_id: "eq:b", updated_at: "2026-05-21T10:00:00Z" },
    ];
    // eq:a's most-recent attempt is 12:00; eq:b is 10:00.
    // LRU = eq:b first (older recent attempt), then eq:a.
    expect(selectLeastRecentlyAttempted({ attempts: dup, max: 2 })).toEqual([
      "eq:b",
      "eq:a",
    ]);
  });
});
