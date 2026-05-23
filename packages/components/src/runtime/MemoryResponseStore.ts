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
    unit: string,
    key: string
  ): Promise<StoredValue<T> | undefined> {
    const record = this.records.get(compositeKey(profile, unit, key));
    return record as StoredValue<T> | undefined;
  }

  async getAll<T>(
    profile: string,
    unit: string,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>> {
    const chapterPrefix = `${profile}:${unit}:`;
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

  async getAllMulti<T>(
    profile: string,
    units: ReadonlyArray<string>,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>> {
    if (units.length === 0) return {};
    const perChapter = await Promise.all(
      units.map((ch) => this.getAll<T>(profile, ch, keyPrefix))
    );
    return Object.assign({}, ...perChapter) as Record<string, StoredValue<T>>;
  }

  async set<T>(
    profile: string,
    unit: string,
    key: string,
    stored: StoredValue<T>
  ): Promise<void> {
    this.records.set(
      compositeKey(profile, unit, key),
      stored as StoredValue<unknown>
    );
  }

  async delete(profile: string, unit: string, key: string): Promise<void> {
    this.records.delete(compositeKey(profile, unit, key));
  }

  async clearUnit(profile: string, unit: string): Promise<void> {
    const prefix = `${profile}:${unit}:`;
    for (const k of [...this.records.keys()]) {
      if (k.startsWith(prefix)) this.records.delete(k);
    }
  }
}
