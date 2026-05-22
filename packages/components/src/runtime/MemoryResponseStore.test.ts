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

  describe("getAll — range read across keys (Wedge B1)", () => {
    it("returns {} when nothing is stored for the chapter", async () => {
      const store = new MemoryResponseStore("course-a");
      const out = await store.getAll("student", "ch1");
      expect(out).toEqual({});
    });

    it("returns every (key → StoredValue) for the chapter when no prefix is given", async () => {
      const store = new MemoryResponseStore("course-a");
      await store.set("student", "ch1", "k1", { value: 1, ts: 1 });
      await store.set("student", "ch1", "k2", { value: 2, ts: 2 });
      const out = await store.getAll<number>("student", "ch1");
      expect(out).toEqual({
        k1: { value: 1, ts: 1 },
        k2: { value: 2, ts: 2 },
      });
    });

    it("filters by keyPrefix when supplied", async () => {
      const store = new MemoryResponseStore("course-a");
      await store.set("student", "ch1", "practice-attempt:eq:sb", {
        value: "a",
        ts: 1,
      });
      await store.set("student", "ch1", "practice-attempt:eq:saha", {
        value: "b",
        ts: 2,
      });
      await store.set("student", "ch1", "predict:p1:answer", {
        value: "c",
        ts: 3,
      });
      const out = await store.getAll<string>(
        "student",
        "ch1",
        "practice-attempt:"
      );
      expect(out).toEqual({
        "practice-attempt:eq:sb": { value: "a", ts: 1 },
        "practice-attempt:eq:saha": { value: "b", ts: 2 },
      });
    });

    it("scopes to one (profile, chapter) only — sibling profiles + chapters excluded", async () => {
      const store = new MemoryResponseStore("course-a");
      await store.set("student", "ch1", "k", { value: 1, ts: 1 });
      await store.set("instructor", "ch1", "k", { value: 2, ts: 2 });
      await store.set("student", "ch2", "k", { value: 3, ts: 3 });
      const out = await store.getAll<number>("student", "ch1");
      expect(out).toEqual({ k: { value: 1, ts: 1 } });
    });

    it("unwraps the composite-key wrapper — returned keys match the third get() arg", async () => {
      const store = new MemoryResponseStore("course-a");
      await store.set("student", "ch1", "practice-attempt:eq:sb", {
        value: "x",
        ts: 1,
      });
      const out = await store.getAll<string>("student", "ch1");
      expect(Object.keys(out)).toEqual(["practice-attempt:eq:sb"]);
    });
  });
});
