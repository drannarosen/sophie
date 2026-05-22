/**
 * `selectLeastRecentlyAttempted` — Wedge B1 stub scheduler for
 * `<SpacedReview>`. Picks the `max` least-recently-attempted targets
 * from a `practice_attempt`-shaped queue, deduplicated by target_id
 * using each target's *most recent* attempt timestamp.
 *
 * Replaced by the real FSRS scheduler when Wedge D ships. The function
 * signature is the swap point; consumers compose this util as a pure
 * function so no schema change is required to upgrade.
 */
export interface AttemptLike {
  target_id: string;
  /** ISO 8601 timestamp (BaseRecordSchema.updated_at semantics). */
  updated_at: string;
}

export interface SelectArgs<T extends AttemptLike> {
  attempts: ReadonlyArray<T>;
  max: number;
  scope?: {
    /** If set, only consider attempts whose target_id starts with this. */
    targetPrefix?: string;
  };
}

export function selectLeastRecentlyAttempted<T extends AttemptLike>(
  args: SelectArgs<T>
): string[] {
  const { attempts, max, scope } = args;
  if (max <= 0) return [];

  const filtered =
    scope?.targetPrefix !== undefined
      ? attempts.filter((a) => a.target_id.startsWith(scope.targetPrefix ?? ""))
      : attempts;

  // Dedupe by target_id, keeping the most recent timestamp per target.
  const latestByTarget = new Map<string, string>();
  for (const a of filtered) {
    const prior = latestByTarget.get(a.target_id);
    if (prior === undefined || a.updated_at > prior) {
      latestByTarget.set(a.target_id, a.updated_at);
    }
  }

  // Sort by timestamp ascending — oldest "most recent attempt" first.
  const sorted = [...latestByTarget.entries()].sort((a, b) => {
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
  });

  return sorted.slice(0, max).map(([target_id]) => target_id);
}
