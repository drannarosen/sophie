import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getUserId } from "./getUserId.ts";

const STORAGE_KEY = "sophie:user-id";

describe("getUserId", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("returns a stable per-browser id across calls", () => {
    const a = getUserId();
    const b = getUserId();
    expect(a).toBe(b);
  });

  it("prefixes generated ids with 'browser-'", () => {
    const id = getUserId();
    expect(id).toMatch(/^browser-/);
  });

  it("persists the id in localStorage on first call", () => {
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    const id = getUserId();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(id);
  });

  it("reuses a pre-existing localStorage value rather than overwriting", () => {
    window.localStorage.setItem(STORAGE_KEY, "browser-pre-existing");
    expect(getUserId()).toBe("browser-pre-existing");
  });
});
