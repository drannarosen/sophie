/**
 * Repository abstraction over interactive-component state. Phase 0 ships
 * one implementation (`IndexedDBResponseStore`); the v3 server-sync seam
 * is `SyncedResponseStore` (interface only).
 *
 * Per ADR 0029, every persisted record carries a `Date.now()` timestamp
 * so the BroadcastChannel sync layer can do last-write-wins between
 * concurrent tabs. The wrapping is uniform across the API surface;
 * `useInteractive` is the only consumer that unwraps `value` for
 * component code.
 */
export interface StoredValue<T> {
  value: T;
  ts: number;
}

export interface ResponseStore {
  get<T>(
    profile: string,
    unit: string,
    key: string
  ): Promise<StoredValue<T> | undefined>;
  /**
   * Range read of every record for (profile, unit) whose key starts
   * with `keyPrefix` (or every record for the unit when `keyPrefix`
   * is omitted). Returned object is keyed by the *original* `key`
   * argument used at `set` time (i.e., the composite-key wrapper is
   * unwrapped before return).
   *
   * Added 2026-05-22 in Wedge B1 to back the `useInteractiveRange<T>`
   * hook that powers `<SpacedReview>` (per ADR 0007 amendment in
   * Wedge B1 plan). Same per-(profile, unit) scoping as the rest
   * of the interface; cross-unit aggregation is deferred to Wedge
   * D / the Cockpit work.
   */
  getAll<T>(
    profile: string,
    unit: string,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>>;
  /**
   * Cross-unit range read: returns merged (key → StoredValue) for
   * every record across the listed `units` whose key starts with
   * `keyPrefix`. Returned keys are unwrapped per `getAll`. Chapters
   * outside the list are excluded; an empty `units` array returns
   * `{}` without I/O. Default implementations fan out `getAll` per
   * unit and merge.
   *
   * Added 2026-05-22 in Wedge B-followup (W1) to back the
   * `useInteractiveRangeMulti<T>` hook that powers `<SpacedReview
   * section="…">` (section-scope rendering needs to aggregate
   * practice_attempt records across the units bound to the
   * Section's Units). Cockpit (ADR 0076) is the committed second
   * caller.
   *
   * **Collision semantics:** if two units in the list both contain
   * the same unwrapped `key`, the later-iterated unit wins in the
   * merge. In practice keys like `practice-attempt:<target_id>` are
   * disjoint across units in the same Section (each unit logs
   * attempts against its own target_ids), so collisions are rare.
   */
  getAllMulti<T>(
    profile: string,
    units: ReadonlyArray<string>,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>>;
  set<T>(
    profile: string,
    unit: string,
    key: string,
    stored: StoredValue<T>
  ): Promise<void>;
  delete(profile: string, unit: string, key: string): Promise<void>;
  clearUnit(profile: string, unit: string): Promise<void>;
}

export function compositeKey(
  profile: string,
  unit: string,
  key: string
): string {
  return `${profile}:${unit}:${key}`;
}

export function chapterKeyRange(
  profile: string,
  unit: string
): { lower: string; upper: string } {
  // Lexicographic range covering all keys for this profile+unit.
  // Upper bound uses U+FFFF so any string with this prefix sorts below it.
  return {
    lower: `${profile}:${unit}:`,
    upper: `${profile}:${unit}:￿`,
  };
}
