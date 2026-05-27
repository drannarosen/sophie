import { afterEach, describe, expect, it, vi } from "vitest";

import { createPedagogyStore } from "./pedagogy-store.ts";

/**
 * Tests for the `createPedagogyStore<T>` factory that PR-C1's
 * definitions-store and PR-C2's equations-store now share (PR-C3,
 * decision #4). The factory itself is closure-scoped so each
 * `createPedagogyStore(...)` call returns a pristine store — no
 * `vi.resetModules()` gymnastics required between tests.
 */

interface SampleEntry {
  slug: string;
  label: string;
}

const alpha: SampleEntry = { slug: "alpha", label: "Alpha entry" };
const beta: SampleEntry = { slug: "beta", label: "Beta entry" };

describe("createPedagogyStore", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("T13: set(entries) populates the map; lookup(key) returns the entry", () => {
    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-t13",
      logTag: "[test:t13]",
      keyOf: (e) => e.slug,
    });

    store.set([alpha, beta]);

    expect(store.lookup("alpha")).toEqual(alpha);
    expect(store.lookup("beta")).toEqual(beta);
  });

  it("T14: lookup(missing) returns undefined", () => {
    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-t14",
      logTag: "[test:t14]",
      keyOf: (e) => e.slug,
    });

    store.set([alpha]);

    expect(store.lookup("missing")).toBeUndefined();
  });

  it("T15: auto-hydrates from <script id='...'> on first lookup when no setter was called", () => {
    const scriptId = "sophie-test-store-t15";
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/json";
    script.textContent = JSON.stringify([alpha, beta]);
    document.head.appendChild(script);

    const store = createPedagogyStore<SampleEntry>({
      scriptId,
      logTag: "[test:t15]",
      keyOf: (e) => e.slug,
    });

    expect(store.lookup("alpha")).toEqual(alpha);
    expect(store.lookup("beta")).toEqual(beta);
    expect(store.lookup("missing")).toBeUndefined();
  });

  it("set() suppresses later auto-hydration from the script tag", () => {
    const scriptId = "sophie-test-store-suppress";
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/json";
    script.textContent = JSON.stringify([alpha]);
    document.head.appendChild(script);

    const store = createPedagogyStore<SampleEntry>({
      scriptId,
      logTag: "[test:suppress]",
      keyOf: (e) => e.slug,
    });

    // SSR setter wins; the script-tag payload must NOT overwrite it.
    store.set([beta]);

    expect(store.lookup("beta")).toEqual(beta);
    expect(store.lookup("alpha")).toBeUndefined();
  });

  it("malformed script-tag payload: dev console.error fires + lookup returns undefined", () => {
    const scriptId = "sophie-test-store-malformed";
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/json";
    script.textContent = "not valid json {[";
    document.head.appendChild(script);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const store = createPedagogyStore<SampleEntry>({
      scriptId,
      logTag: "[test:malformed]",
      keyOf: (e) => e.slug,
    });

    expect(store.lookup("alpha")).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("[test:malformed]");
  });

  it("missing script tag: lookup returns undefined and never errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-absent",
      logTag: "[test:absent]",
      keyOf: (e) => e.slug,
    });

    expect(store.lookup("alpha")).toBeUndefined();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  // Wedge B-followup (W1) — `all()` accessor enables iteration over the
  // full collection (filter / map / reduce). Required by `<SpacedReview
  // section=…>` to enumerate Units in a Section. Cockpit (ADR 0076) is
  // the committed second caller — DRY pays off.
  it("all() returns the populated entries after set() (W1)", () => {
    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-all-set",
      logTag: "[test:all-set]",
      keyOf: (e) => e.slug,
    });

    store.set([alpha, beta]);
    expect(store.all()).toEqual([alpha, beta]);
  });

  it("all() returns [] before set() and with no script-tag hydration (W1)", () => {
    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-all-empty",
      logTag: "[test:all-empty]",
      keyOf: (e) => e.slug,
    });

    expect(store.all()).toEqual([]);
  });

  const gamma: SampleEntry = { slug: "alpha", label: "Gamma entry (dup key)" };

  it("default set() keeps the last entry on a duplicate key (last-write-wins)", () => {
    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-dup-default",
      logTag: "[test:dup-default]",
      keyOf: (e) => e.slug,
    });

    expect(() => store.set([alpha, gamma])).not.toThrow();
    expect(store.lookup("alpha")).toEqual(gamma);
  });

  it('onDuplicateKey: "throw" fails on a duplicate key, naming it', () => {
    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-dup-throw",
      logTag: "[test:dup-throw]",
      keyOf: (e) => e.slug,
      onDuplicateKey: "throw",
    });

    expect(() => store.set([alpha, gamma])).toThrowError(/alpha/);
  });

  it("all() hydrates from the script tag on first call if no setter ran (W1)", () => {
    const script = document.createElement("script");
    script.id = "sophie-test-store-all-hydrate";
    script.type = "application/json";
    script.textContent = JSON.stringify([alpha, beta]);
    document.head.appendChild(script);

    const store = createPedagogyStore<SampleEntry>({
      scriptId: "sophie-test-store-all-hydrate",
      logTag: "[test:all-hydrate]",
      keyOf: (e) => e.slug,
    });

    expect(store.all()).toEqual([alpha, beta]);
  });
});
