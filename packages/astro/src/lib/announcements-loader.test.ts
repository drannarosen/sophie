import fs, { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadAnnouncements } from "./announcements-loader.ts";

/**
 * Minimal valid announcements YAML for tests. A single entry with the
 * smallest shape that satisfies AnnouncementRegistrySchema (ADR 0099):
 * `id` + `title` + `severity` + `publish_date`.
 */
const MINIMAL_VALID_ANNOUNCEMENTS = `
announcements:
  - id: welcome
    title: "Welcome to the course"
    severity: info
    publish_date: "2027-01-19"
`;

describe("loadAnnouncements", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "sophie-announcements-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("returns null when announcements.sophie.yaml is missing", () => {
    expect(loadAnnouncements(root)).toBeNull();
  });

  test("loads + parses a valid announcements registry", () => {
    fs.writeFileSync(
      path.join(root, "announcements.sophie.yaml"),
      MINIMAL_VALID_ANNOUNCEMENTS
    );
    const registry = loadAnnouncements(root);
    expect(registry?.announcements[0]?.id).toBe("welcome");
    expect(registry?.announcements[0]?.severity).toBe("info");
    expect(registry?.announcements[0]?.publish_date).toBe("2027-01-19");
  });

  test("loads an entry with an optional expire_date + href + body", () => {
    fs.writeFileSync(
      path.join(root, "announcements.sophie.yaml"),
      `
announcements:
  - id: midterm-reminder
    title: "Midterm next week"
    body: "Review chapters 1-4."
    severity: urgent
    publish_date: "2027-03-01"
    expire_date: "2027-03-10"
    href: "/schedule"
`
    );
    const registry = loadAnnouncements(root);
    expect(registry?.announcements[0]?.expire_date).toBe("2027-03-10");
    expect(registry?.announcements[0]?.href).toBe("/schedule");
    expect(registry?.announcements[0]?.body).toBe("Review chapters 1-4.");
  });

  test("throws curated error on malformed YAML", () => {
    // Unterminated flow sequence — genuinely unparseable YAML, so this
    // exercises the parseYaml() catch branch (distinct from the
    // schema-invalid path covered by the test below).
    fs.writeFileSync(
      path.join(root, "announcements.sophie.yaml"),
      "announcements: ["
    );
    expect(() => loadAnnouncements(root)).toThrow(
      /announcements\.sophie\.yaml/i
    );
  });

  test("throws schema-invalid error when severity is not in the enum", () => {
    fs.writeFileSync(
      path.join(root, "announcements.sophie.yaml"),
      `
announcements:
  - id: bad-severity
    title: "Bad severity"
    severity: critical
    publish_date: "2027-01-19"
`
    );
    expect(() => loadAnnouncements(root)).toThrow(
      /announcements\.sophie\.yaml/i
    );
  });

  test("throws schema-invalid error when publish_date is after expire_date", () => {
    fs.writeFileSync(
      path.join(root, "announcements.sophie.yaml"),
      `
announcements:
  - id: inverted-window
    title: "Inverted window"
    severity: notice
    publish_date: "2027-03-10"
    expire_date: "2027-03-01"
`
    );
    expect(() => loadAnnouncements(root)).toThrow(
      /announcements\.sophie\.yaml/i
    );
  });
});
