import { describe, expect, it } from "vitest";
import { MemoryResponseStore } from "./MemoryResponseStore.ts";

describe("MemoryResponseStore", () => {
  it("returns undefined for unknown keys", async () => {
    const store = new MemoryResponseStore("course-a");
    const got = await store.get("student", "ch", "k");
    expect(got).toBeUndefined();
  });

  it("set + get round-trips a value with timestamp", async () => {
    const store = new MemoryResponseStore("course-a");
    await store.set("student", "ch", "k", { value: 42, ts: 100 });
    const got = await store.get<number>("student", "ch", "k");
    expect(got).toEqual({ value: 42, ts: 100 });
  });

  it("supports per-profile namespacing", async () => {
    const store = new MemoryResponseStore("course-a");
    await store.set("student", "ch", "k", { value: 1, ts: 1 });
    await store.set("instructor", "ch", "k", { value: 2, ts: 2 });
    expect(await store.get("student", "ch", "k")).toEqual({
      value: 1,
      ts: 1,
    });
    expect(await store.get("instructor", "ch", "k")).toEqual({
      value: 2,
      ts: 2,
    });
  });

  it("supports per-chapter namespacing within a profile", async () => {
    const store = new MemoryResponseStore("course-a");
    await store.set("student", "ch1", "k", { value: 1, ts: 1 });
    await store.set("student", "ch2", "k", { value: 2, ts: 2 });
    expect(await store.get("student", "ch1", "k")).toEqual({
      value: 1,
      ts: 1,
    });
    expect(await store.get("student", "ch2", "k")).toEqual({
      value: 2,
      ts: 2,
    });
  });

  it("delete removes a single record without disturbing siblings", async () => {
    const store = new MemoryResponseStore("course-a");
    await store.set("student", "ch", "k1", { value: 1, ts: 1 });
    await store.set("student", "ch", "k2", { value: 2, ts: 2 });
    await store.delete("student", "ch", "k1");
    expect(await store.get("student", "ch", "k1")).toBeUndefined();
    expect(await store.get("student", "ch", "k2")).toEqual({
      value: 2,
      ts: 2,
    });
  });

  it("clearChapter removes every record for a (profile, chapter) pair", async () => {
    const store = new MemoryResponseStore("course-a");
    await store.set("student", "ch1", "k1", { value: 1, ts: 1 });
    await store.set("student", "ch1", "k2", { value: 2, ts: 2 });
    await store.set("student", "ch2", "k1", { value: 3, ts: 3 });
    await store.clearChapter("student", "ch1");
    expect(await store.get("student", "ch1", "k1")).toBeUndefined();
    expect(await store.get("student", "ch1", "k2")).toBeUndefined();
    expect(await store.get("student", "ch2", "k1")).toEqual({
      value: 3,
      ts: 3,
    });
  });

  it("clearChapter scopes to one profile only", async () => {
    const store = new MemoryResponseStore("course-a");
    await store.set("student", "ch", "k", { value: 1, ts: 1 });
    await store.set("instructor", "ch", "k", { value: 2, ts: 2 });
    await store.clearChapter("student", "ch");
    expect(await store.get("student", "ch", "k")).toBeUndefined();
    expect(await store.get("instructor", "ch", "k")).toEqual({
      value: 2,
      ts: 2,
    });
  });

  it("preserves the course identifier", () => {
    const store = new MemoryResponseStore("astr201");
    expect(store.course).toBe("astr201");
  });
});
