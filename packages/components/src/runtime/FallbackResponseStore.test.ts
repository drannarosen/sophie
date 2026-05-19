import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FallbackResponseStore } from "./FallbackResponseStore.ts";
import { IndexedDBResponseStore } from "./IndexedDBResponseStore.ts";

/**
 * Tests for `FallbackResponseStore` — the wrapper that implements ADR
 * 0007's promised runtime contract: when IndexedDB is unavailable, the
 * persistence layer downgrades to in-memory storage with a one-time
 * `console.warn`, NOT into an error state.
 *
 * Pre-2026-05-18 (this PR), no such fallback existed. ADR 0007 + ADR
 * 0053 cited the contract as `validated`; the cited test file did NOT
 * exercise IDB unavailability. The Codex 2026-05-18 review caught the
 * gap. This test suite is the validation evidence those ADRs reference.
 */

describe("FallbackResponseStore", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe("happy path — IndexedDB is healthy", () => {
    it("reports `persistent` mode before any operation", () => {
      const store = new FallbackResponseStore("happy-1");
      expect(store.getPersistence()).toBe("persistent");
    });

    it("uses IndexedDB for set/get and stays in `persistent` mode", async () => {
      const store = new FallbackResponseStore("happy-2");
      await store.set("student", "ch", "k", { value: 42, ts: 100 });
      const got = await store.get<number>("student", "ch", "k");
      expect(got).toEqual({ value: 42, ts: 100 });
      expect(store.getPersistence()).toBe("persistent");
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does not call subscribers when fallback never engages", async () => {
      const store = new FallbackResponseStore("happy-3");
      const callback = vi.fn();
      store.subscribePersistenceChange(callback);
      await store.set("student", "ch", "k", { value: 1, ts: 100 });
      await store.get("student", "ch", "k");
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("fallback path — IndexedDB fails on first call", () => {
    function mockIDBFailure(): void {
      vi.spyOn(IndexedDBResponseStore.prototype, "get").mockRejectedValue(
        new Error("simulated IDB unavailability (Safari private mode)")
      );
      vi.spyOn(IndexedDBResponseStore.prototype, "set").mockRejectedValue(
        new Error("simulated IDB unavailability")
      );
    }

    it("engages fallback + flips to `session` on first failed `get`", async () => {
      mockIDBFailure();
      const store = new FallbackResponseStore("fail-1");
      expect(store.getPersistence()).toBe("persistent");
      const result = await store.get("student", "ch", "k");
      expect(result).toBeUndefined(); // memory store has no record yet
      expect(store.getPersistence()).toBe("session");
    });

    it("engages fallback + flips to `session` on first failed `set`", async () => {
      mockIDBFailure();
      const store = new FallbackResponseStore("fail-2");
      await store.set("student", "ch", "k", { value: "hello", ts: 200 });
      expect(store.getPersistence()).toBe("session");
      // Subsequent get returns the value via the memory fallback.
      const got = await store.get<string>("student", "ch", "k");
      expect(got).toEqual({ value: "hello", ts: 200 });
    });

    it("emits a one-time `console.warn` when fallback engages", async () => {
      mockIDBFailure();
      const store = new FallbackResponseStore("fail-3");
      await store.get("student", "ch", "k");
      await store.get("student", "ch", "k2");
      await store.set("student", "ch", "k3", { value: 1, ts: 1 });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toMatch(
        /IndexedDB unavailable for course "fail-3"/
      );
    });

    it("notifies persistence-change subscribers on first fallback engagement", async () => {
      mockIDBFailure();
      const store = new FallbackResponseStore("fail-4");
      const callback = vi.fn();
      store.subscribePersistenceChange(callback);
      await store.get("student", "ch", "k");
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("session");
      // Second operation: subscriber NOT called again (state is stable).
      await store.set("student", "ch", "k", { value: 1, ts: 1 });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("unsubscribe() prevents future notifications", async () => {
      mockIDBFailure();
      const store = new FallbackResponseStore("fail-5");
      const callback = vi.fn();
      const unsubscribe = store.subscribePersistenceChange(callback);
      unsubscribe();
      await store.get("student", "ch", "k");
      expect(callback).not.toHaveBeenCalled();
    });

    it("subsequent operations go straight to memory (no further IDB calls)", async () => {
      const getSpy = vi
        .spyOn(IndexedDBResponseStore.prototype, "get")
        .mockRejectedValue(new Error("IDB unavailable"));
      const setSpy = vi
        .spyOn(IndexedDBResponseStore.prototype, "set")
        .mockRejectedValue(new Error("IDB unavailable"));
      const store = new FallbackResponseStore("fail-6");
      await store.get("student", "ch", "k"); // engages fallback (1 IDB get call)
      expect(getSpy).toHaveBeenCalledTimes(1);
      await store.get("student", "ch", "k2");
      await store.set("student", "ch", "k3", { value: 1, ts: 1 });
      await store.get("student", "ch", "k3");
      // No additional IDB calls after the first.
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).not.toHaveBeenCalled();
    });

    it("set + get round-trip works in fallback mode", async () => {
      mockIDBFailure();
      const store = new FallbackResponseStore("fail-7");
      await store.set("student", "ch1", "k", { value: { a: 1 }, ts: 100 });
      await store.set("student", "ch1", "k2", { value: { b: 2 }, ts: 200 });
      const r1 = await store.get<{ a: number }>("student", "ch1", "k");
      const r2 = await store.get<{ b: number }>("student", "ch1", "k2");
      expect(r1).toEqual({ value: { a: 1 }, ts: 100 });
      expect(r2).toEqual({ value: { b: 2 }, ts: 200 });
    });

    it("clearChapter scopes correctly under fallback", async () => {
      mockIDBFailure();
      const store = new FallbackResponseStore("fail-8");
      await store.set("student", "ch1", "k1", { value: 1, ts: 1 });
      await store.set("student", "ch1", "k2", { value: 2, ts: 2 });
      await store.set("student", "ch2", "k1", { value: 3, ts: 3 });
      await store.clearChapter("student", "ch1");
      expect(await store.get("student", "ch1", "k1")).toBeUndefined();
      expect(await store.get("student", "ch1", "k2")).toBeUndefined();
      // ch2 untouched.
      expect(await store.get("student", "ch2", "k1")).toEqual({
        value: 3,
        ts: 3,
      });
    });
  });

  describe("delete + clearChapter in healthy mode", () => {
    it("delete removes a stored record", async () => {
      const store = new FallbackResponseStore("del-1");
      await store.set("student", "ch", "k", { value: 99, ts: 1 });
      expect(await store.get("student", "ch", "k")).toEqual({
        value: 99,
        ts: 1,
      });
      await store.delete("student", "ch", "k");
      expect(await store.get("student", "ch", "k")).toBeUndefined();
    });

    it("clearChapter scopes to the named chapter only", async () => {
      const store = new FallbackResponseStore("del-2");
      await store.set("student", "ch1", "k", { value: 1, ts: 1 });
      await store.set("student", "ch2", "k", { value: 2, ts: 2 });
      await store.clearChapter("student", "ch1");
      expect(await store.get("student", "ch1", "k")).toBeUndefined();
      expect(await store.get("student", "ch2", "k")).toEqual({
        value: 2,
        ts: 2,
      });
    });
  });
});
