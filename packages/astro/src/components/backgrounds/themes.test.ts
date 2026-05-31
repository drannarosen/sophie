import { describe, expect, test } from "vitest";
import {
  type BackgroundDescriptor,
  DEFAULT_HOME_BACKGROUND,
  resolveHomeBackground,
} from "./themes.ts";

/**
 * `resolveHomeBackground` is the single swap point for the home-background
 * theme slot (ADR 0097 #4). These tests pin the default-fallback contract
 * and prove the resolver is the only place a theme id maps to a renderer.
 */
describe("resolveHomeBackground", () => {
  test("absent id → starfield default", () => {
    const descriptor = resolveHomeBackground();
    expect(descriptor.id).toBe(DEFAULT_HOME_BACKGROUND);
    expect(descriptor.kind).toBe("starfield");
  });

  test("unknown id → starfield default (never throws)", () => {
    const descriptor = resolveHomeBackground("does-not-exist");
    expect(descriptor.id).toBe(DEFAULT_HOME_BACKGROUND);
    expect(descriptor.kind).toBe("starfield");
  });

  test("the registered id resolves to its descriptor", () => {
    const descriptor = resolveHomeBackground("starfield");
    expect(descriptor).toMatchObject({ id: "starfield", kind: "starfield" });
  });

  test("default id is itself a resolvable registry entry", () => {
    // Guards the invariant the fallback relies on: the default key must
    // exist in the registry, else `resolveHomeBackground` would return
    // `undefined` for an unknown id.
    const viaDefault = resolveHomeBackground(DEFAULT_HOME_BACKGROUND);
    expect(viaDefault.id).toBe(DEFAULT_HOME_BACKGROUND);
  });

  test("seam contract: a hypothetical second id resolves without throwing", () => {
    // Adding a second theme is a registry-entry addition, not a signature
    // change. Until one exists, an arbitrary id must still resolve (to the
    // default) — the shell never branches on specific ids, only on
    // `descriptor.kind`. This asserts the no-throw fallback that makes a
    // future addition a one-line change.
    const second: BackgroundDescriptor = resolveHomeBackground("aurora");
    expect(second).toBeDefined();
    expect(second.kind).toBe("starfield");
  });
});
