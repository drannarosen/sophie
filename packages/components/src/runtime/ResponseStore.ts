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
    chapter: string,
    key: string
  ): Promise<StoredValue<T> | undefined>;
  /**
   * Range read of every record for (profile, chapter) whose key starts
   * with `keyPrefix` (or every record for the chapter when `keyPrefix`
   * is omitted). Returned object is keyed by the *original* `key`
   * argument used at `set` time (i.e., the composite-key wrapper is
   * unwrapped before return).
   *
   * Added 2026-05-22 in Wedge B1 to back the `useInteractiveRange<T>`
   * hook that powers `<SpacedReview>` (per ADR 0007 amendment in
   * Wedge B1 plan). Same per-(profile, chapter) scoping as the rest
   * of the interface; cross-chapter aggregation is deferred to Wedge
   * D / the Cockpit work.
   */
  getAll<T>(
    profile: string,
    chapter: string,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>>;
  set<T>(
    profile: string,
    chapter: string,
    key: string,
    stored: StoredValue<T>
  ): Promise<void>;
  delete(profile: string, chapter: string, key: string): Promise<void>;
  clearChapter(profile: string, chapter: string): Promise<void>;
}

export function compositeKey(
  profile: string,
  chapter: string,
  key: string
): string {
  return `${profile}:${chapter}:${key}`;
}

export function chapterKeyRange(
  profile: string,
  chapter: string
): { lower: string; upper: string } {
  // Lexicographic range covering all keys for this profile+chapter.
  // Upper bound uses U+FFFF so any string with this prefix sorts below it.
  return {
    lower: `${profile}:${chapter}:`,
    upper: `${profile}:${chapter}:￿`,
  };
}
