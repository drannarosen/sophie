import {
  compositeKey,
  type ResponseStore,
  type StoredValue,
} from "./ResponseStore.ts";

/**
 * In-memory `ResponseStore` implementation. Holds state in a `Map` for
 * the lifetime of the JS process (within-tab navigation and per-route
 * page transitions preserve state; full page reloads do not).
 *
 * Used by `FallbackResponseStore` as the fallback target when IndexedDB
 * is unavailable (Safari private mode, quota-exhausted storage, browser
 * extensions disabling IDB). Per ADR 0007: when persistence is
 * unavailable, the interactive layer downgrades to *session-only*
 * storage with a one-time `console.warn`, NOT into the `error` status
 * — students keep using the feature within their session, they just
 * lose state on reload. The persistence mode surfaces on
 * `UseInteractiveResult.persistence` so components can render a
 * "your progress won't be saved" notice.
 *
 * Per ADR 0029: every stored record carries a `Date.now()` timestamp;
 * the in-memory implementation honors the same shape so BroadcastChannel
 * sync between tabs works identically (though tab-cross-talk via
 * BroadcastChannel still works without IDB — just doesn't durably
 * persist).
 */
export class MemoryResponseStore implements ResponseStore {
  readonly course: string;
  private readonly records = new Map<string, StoredValue<unknown>>();

  constructor(course: string) {
    this.course = course;
  }

  async get<T>(
    profile: string,
    chapter: string,
    key: string
  ): Promise<StoredValue<T> | undefined> {
    const record = this.records.get(compositeKey(profile, chapter, key));
    return record as StoredValue<T> | undefined;
  }

  async getAll<T>(
    profile: string,
    chapter: string,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>> {
    const chapterPrefix = `${profile}:${chapter}:`;
    const fullPrefix =
      keyPrefix !== undefined ? `${chapterPrefix}${keyPrefix}` : chapterPrefix;
    const out: Record<string, StoredValue<T>> = {};
    for (const [composite, record] of this.records) {
      if (!composite.startsWith(fullPrefix)) continue;
      const key = composite.slice(chapterPrefix.length);
      out[key] = record as StoredValue<T>;
    }
    return out;
  }

  async set<T>(
    profile: string,
    chapter: string,
    key: string,
    stored: StoredValue<T>
  ): Promise<void> {
    this.records.set(
      compositeKey(profile, chapter, key),
      stored as StoredValue<unknown>
    );
  }

  async delete(profile: string, chapter: string, key: string): Promise<void> {
    this.records.delete(compositeKey(profile, chapter, key));
  }

  async clearChapter(profile: string, chapter: string): Promise<void> {
    const prefix = `${profile}:${chapter}:`;
    for (const k of [...this.records.keys()]) {
      if (k.startsWith(prefix)) this.records.delete(k);
    }
  }
}
