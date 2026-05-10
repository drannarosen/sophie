/**
 * Repository abstraction over interactive-component state. Phase 0 ships
 * one implementation (`IndexedDBResponseStore`); the v3 server-sync seam
 * is `SyncedResponseStore` (interface only).
 */
export interface ResponseStore {
  get<T>(profile: string, chapter: string, key: string): Promise<T | undefined>;
  set<T>(
    profile: string,
    chapter: string,
    key: string,
    value: T
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
