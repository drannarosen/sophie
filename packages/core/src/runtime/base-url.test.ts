import { afterEach, describe, expect, it } from "vitest";
import { getSophieBaseUrl, setSophieBaseUrl } from "./base-url.ts";

// globalThis-backed store: clear the key after each test so set→get
// state never leaks between cases (the unset-returns-undefined case
// would otherwise see a stale base from a prior test).
afterEach(() => {
  delete (globalThis as { __SOPHIE_BASE_URL__?: string }).__SOPHIE_BASE_URL__;
});

describe("sophie base-url store", () => {
  it("round-trips a non-root base set→get", () => {
    setSophieBaseUrl("/astr201/");
    expect(getSophieBaseUrl()).toBe("/astr201/");
  });

  it("round-trips a root base set→get", () => {
    setSophieBaseUrl("/");
    expect(getSophieBaseUrl()).toBe("/");
  });

  it("returns undefined when unset", () => {
    expect(getSophieBaseUrl()).toBeUndefined();
  });
});
