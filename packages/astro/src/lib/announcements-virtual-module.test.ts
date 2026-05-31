import type { AnnouncementRegistry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  ANNOUNCEMENTS_VIRTUAL_ID,
  announcementsVirtualModule,
} from "./announcements-virtual-module.ts";

/**
 * Unit coverage for `announcementsVirtualModule()` — the Vite plugin
 * that exposes the consumer's parsed `announcements.sophie.yaml` as the
 * `virtual:sophie/announcements` module. Mirrors schedule-virtual-module
 * test shape per ADR 0099 precedent (always-register, `T | null`).
 */

const RESOLVED_ID = `\0${ANNOUNCEMENTS_VIRTUAL_ID}`;

const FIXTURE_ANNOUNCEMENTS = {
  announcements: [
    {
      id: "welcome",
      title: "Welcome to the course",
      severity: "info",
      publish_date: "2027-01-19",
    },
  ],
} as unknown as AnnouncementRegistry;

describe("announcementsVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = announcementsVirtualModule(FIXTURE_ANNOUNCEMENTS);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(ANNOUNCEMENTS_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = announcementsVirtualModule(FIXTURE_ANNOUNCEMENTS);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId("react")).toBeUndefined();
    expect(resolveId("./local-file.ts")).toBeUndefined();
    expect(resolveId("virtual:sophie/figures")).toBeUndefined();
    expect(resolveId("virtual:sophie/schedule")).toBeUndefined();
  });
});

describe("announcementsVirtualModule — load", () => {
  test("emits a JS module exporting `announcements` for the resolved id", () => {
    const plugin = announcementsVirtualModule(FIXTURE_ANNOUNCEMENTS);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const announcements");
    expect(code).toContain("welcome");
    expect(code).toContain("2027-01-19");
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = announcementsVirtualModule(FIXTURE_ANNOUNCEMENTS);
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("\0virtual:sophie/figures")).toBeUndefined();
    expect(load("react")).toBeUndefined();
  });
});

describe("announcementsVirtualModule — plugin shape", () => {
  test("names the plugin so Vite can dedupe + report", () => {
    const plugin = announcementsVirtualModule(FIXTURE_ANNOUNCEMENTS);
    expect(plugin.name).toBe("sophie:announcements");
  });

  test("does not expose handleHotUpdate (no HMR by design — R8)", () => {
    const plugin = announcementsVirtualModule(FIXTURE_ANNOUNCEMENTS);
    expect("handleHotUpdate" in plugin).toBe(false);
  });
});

describe("announcementsVirtualModule — null-announcements (always-register)", () => {
  test("emits `announcements = null` when no registry is loaded (consumer hasn't authored announcements.sophie.yaml yet)", () => {
    const plugin = announcementsVirtualModule(null);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const announcements = null");
  });

  test("still resolves the virtual id when announcements is null (import always succeeds)", () => {
    const plugin = announcementsVirtualModule(null);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(ANNOUNCEMENTS_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });
});
