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
    chapter: string,
    key: string
  ): Promise<StoredValue<T> | undefined> {
    const db = await this.db();
    const stored = await db.get(STORE, compositeKey(profile, chapter, key));
    return stored as StoredValue<T> | undefined;
  }

  async set<T>(
    profile: string,
    chapter: string,
    key: string,
    stored: StoredValue<T>
  ): Promise<void> {
    const db = await this.db();
    await db.put(
      STORE,
      stored as StoredValue<unknown>,
      compositeKey(profile, chapter, key)
    );
  }

  async delete(profile: string, chapter: string, key: string): Promise<void> {
    const db = await this.db();
    await db.delete(STORE, compositeKey(profile, chapter, key));
  }

  async clearChapter(profile: string, chapter: string): Promise<void> {
    const db = await this.db();
    const { lower, upper } = chapterKeyRange(profile, chapter);
    const tx = db.transaction(STORE, "readwrite");
    let cursor = await tx.store.openKeyCursor(IDBKeyRange.bound(lower, upper));
    while (cursor !== null) {
      await tx.store.delete(cursor.key);
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}
