import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from "idb";
import {
  chapterKeyRange,
  compositeKey,
  type ResponseStore,
  type StoredValue,
} from "./ResponseStore.ts";

interface SophieDB extends DBSchema {
  responses: {
    key: string;
    value: StoredValue<unknown>;
  };
}

// v2 (ADR 0029): records are wrapped as `{ value, ts }` for LWW sync.
// Pre-launch posture per Anna's directive — no legacy-shape unwrap; the
// upgrade drops the old store and recreates it. Any developer test
// state in IDB is discarded on first load post-upgrade.
const DB_VERSION = 2;
const STORE = "responses";

export class IndexedDBResponseStore implements ResponseStore {
  readonly course: string;
  private dbPromise: Promise<IDBPDatabase<SophieDB>> | null = null;

  constructor(course: string) {
    this.course = course;
  }

  private db(): Promise<IDBPDatabase<SophieDB>> {
    if (this.dbPromise === null) {
      this.dbPromise = openDB<SophieDB>(`sophie-${this.course}`, DB_VERSION, {
        upgrade(db) {
          if (db.objectStoreNames.contains(STORE)) {
            db.deleteObjectStore(STORE);
          }
          db.createObjectStore(STORE);
        },
      });
    }
    return this.dbPromise;
  }

  async get<T>(
    profile: string,
    unit: string,
    key: string
  ): Promise<StoredValue<T> | undefined> {
    const db = await this.db();
    const stored = await db.get(STORE, compositeKey(profile, unit, key));
    return stored as StoredValue<T> | undefined;
  }

  async getAll<T>(
    profile: string,
    unit: string,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>> {
    const db = await this.db();
    const chapterPrefix = `${profile}:${unit}:`;
    const lower =
      keyPrefix !== undefined ? `${chapterPrefix}${keyPrefix}` : chapterPrefix;
    // U+FFFF caps the lex range so any string with this prefix sorts below it.
    const upper = `${lower}￿`;
    const out: Record<string, StoredValue<T>> = {};
    const tx = db.transaction(STORE, "readonly");
    let cursor = await tx.store.openCursor(IDBKeyRange.bound(lower, upper));
    while (cursor !== null) {
      const composite = cursor.key as string;
      const key = composite.slice(chapterPrefix.length);
      out[key] = cursor.value as StoredValue<T>;
      cursor = await cursor.continue();
    }
    await tx.done;
    return out;
  }

  async getAllMulti<T>(
    profile: string,
    units: ReadonlyArray<string>,
    keyPrefix?: string
  ): Promise<Record<string, StoredValue<T>>> {
    if (units.length === 0) return {};
    // Fan out to one getAll per unit and merge. Each getAll opens
    // its own short transaction; the IDB engine handles concurrency.
    // Single broader cursor over multiple disjoint unit ranges
    // would need a discontinuous IDBKeyRange (not supported); the
    // per-unit fan-out keeps each transaction's range contiguous
    // and lets the engine optimize within each.
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
    const db = await this.db();
    await db.put(
      STORE,
      stored as StoredValue<unknown>,
      compositeKey(profile, unit, key)
    );
  }

  async delete(profile: string, unit: string, key: string): Promise<void> {
    const db = await this.db();
    await db.delete(STORE, compositeKey(profile, unit, key));
  }

  async clearUnit(profile: string, unit: string): Promise<void> {
    const db = await this.db();
    const { lower, upper } = chapterKeyRange(profile, unit);
    const tx = db.transaction(STORE, "readwrite");
    let cursor = await tx.store.openKeyCursor(IDBKeyRange.bound(lower, upper));
    while (cursor !== null) {
      await tx.store.delete(cursor.key);
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}
