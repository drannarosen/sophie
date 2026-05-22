import { IndexedDBResponseStore } from "./IndexedDBResponseStore.ts";
import { MemoryResponseStore } from "./MemoryResponseStore.ts";
import type { ResponseStore, StoredValue } from "./ResponseStore.ts";

/**
 * Two persistence modes a Sophie consumer can observe.
 *
 * - `persistent`: backed by IndexedDB. Survives reload, tab close, and
 *   browser restart. The default contract.
 * - `session`: backed by `MemoryResponseStore`. Survives within the
 *   current JS process; lost on reload. Engaged when IndexedDB is
 *   unavailable (Safari private mode, storage-quota-exhausted, IDB
 *   disabled by extension or admin policy).
 */
export type PersistenceMode = "persistent" | "session";

/**
 * `ResponseStore` wrapper that tries IndexedDB first and falls back to
 * `MemoryResponseStore` on failure. Implements ADR 0007's promised
 * runtime contract:
 *
 *   "When IDB is unavailable, `ResponseStore` swaps to a
 *    `MemoryResponseStore` and `useInteractive` exposes
 *    `persistence: 'session' | 'persistent'`."
 *
 * Behavior:
 *
 * 1. The first call to any method (typically `get` for hydration)
 *    tries the IDB-backed store.
 * 2. If that call rejects (open failure, quota exhausted, blocked-by-
 *    extension), the wrapper:
 *      - Sets `persistence = "session"`.
 *      - Logs a one-time `console.warn` so authoring environments
 *        notice the downgrade.
 *      - Notifies any subscribers via `subscribePersistenceChange`.
 *      - Retries the operation against the in-memory store, returning
 *        its result.
 * 3. Every subsequent call goes straight to the in-memory store; no
 *    further IDB calls are attempted for this course.
 *
 * Note on detection scope: synchronous environment checks (e.g.,
 * `typeof indexedDB === "undefined"` in SSR / Node) are NOT performed
 * here — the wrapper assumes browser code paths. The IDB store throws
 * synchronously in environments without `indexedDB`, which still
 * routes through the same async catch path via the wrapper's first
 * call.
 *
 * Per ADR 0007 + ADR 0053 (CF5 — runtime fallback): the contract is
 * "no thrown errors at the persistence layer; downgrades engage
 * transparently."
 */
export class FallbackResponseStore implements ResponseStore {
  readonly course: string;
  private readonly primary: IndexedDBResponseStore;
  private readonly fallback: MemoryResponseStore;
  private fallbackEngaged = false;
  private persistence: PersistenceMode = "persistent";
  private warnedOnce = false;
  private readonly subscribers = new Set<(mode: PersistenceMode) => void>();

  constructor(course: string) {
    this.course = course;
    this.primary = new IndexedDBResponseStore(course);
    this.fallback = new MemoryResponseStore(course);
  }

  /**
   * Current persistence mode. `"persistent"` while IDB is healthy;
   * flips to `"session"` (permanently for this store instance) on
   * first failure.
   */
  getPersistence(): PersistenceMode {
    return this.persistence;
  }

  /**
   * Subscribe to persistence-mode changes. Useful for `useInteractive`
   * to react when the wrapper downgrades mid-session (the first
   * hydration call fails after a successful prior session, etc.).
   * Returns an unsubscribe function. The current mode is NOT replayed
   * to a new subscriber — callers should read `getPersistence()` first.
   */
  subscribePersistenceChange(
    callback: (mode: PersistenceMode) => void
  ): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifyChange(): void {
    for (const cb of this.subscribers) cb(this.persistence);
  }

  private engageFallback(err: unknown): void {
    if (this.fallbackEngaged) return;
    this.fallbackEngaged = true;
    this.persistence = "session";
    if (
      !this.warnedOnce &&
      (typeof process === "undefined" || process.env?.NODE_ENV !== "production")
    ) {
      this.warnedOnce = true;
      console.warn(
        `[Sophie] IndexedDB unavailable for course "${this.course}". Falling back to in-memory storage — changes won't persist across reload. This is the documented ADR 0007 fallback contract; see UseInteractiveResult.persistence to surface this to students.`,
        err
      );
    }
    this.notifyChange();
  }

  private active(): ResponseStore {
    return this.fallbackEngaged ? this.fallback : this.primary;
  }

  async get<T>(
    profile: string,
    chapter: string,
    key: string
  ): Promise<StoredValue<T> | undefined> {
    if (this.fallbackEngaged) {
      return this.fallback.get<T>(profile, chapter, key);
    }
    try {
      return await this.primary.get<T>(profile, chapter, key);
    } catch (err) {
      this.engageFallback(err);
      return this.fallback.get<T>(profile, chapter, key);
    }
  }

  async getAll<T>(
    profile: string,
    chapter: string,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>> {
    if (this.fallbackEngaged) {
      return this.fallback.getAll<T>(profile, chapter, keyPrefix);
    }
    try {
      return await this.primary.getAll<T>(profile, chapter, keyPrefix);
    } catch (err) {
      this.engageFallback(err);
      return this.fallback.getAll<T>(profile, chapter, keyPrefix);
    }
  }

  async set<T>(
    profile: string,
    chapter: string,
    key: string,
    stored: StoredValue<T>
  ): Promise<void> {
    if (this.fallbackEngaged) {
      return this.fallback.set(profile, chapter, key, stored);
    }
    try {
      await this.primary.set(profile, chapter, key, stored);
    } catch (err) {
      this.engageFallback(err);
      await this.fallback.set(profile, chapter, key, stored);
    }
  }

  async delete(profile: string, chapter: string, key: string): Promise<void> {
    return this.active().delete(profile, chapter, key);
  }

  async clearChapter(profile: string, chapter: string): Promise<void> {
    return this.active().clearChapter(profile, chapter);
  }
}
