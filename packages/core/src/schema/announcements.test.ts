import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { AnnouncementRegistrySchema } from "./announcements.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return parseYaml(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

describe("AnnouncementRegistrySchema", () => {
  it("accepts the valid YAML fixture", () => {
    const result = AnnouncementRegistrySchema.safeParse(
      loadFixture("announcements-valid.yaml")
    );
    expect(result.success).toBe(true);
  });

  it("rejects a severity outside the enum", () => {
    // `severity` is a closed enum: info | notice | urgent. "critical" is not
    // a member.
    const result = AnnouncementRegistrySchema.safeParse({
      announcements: [
        {
          id: "midterm-moved",
          title: "Midterm moved",
          severity: "critical",
          publish_date: "2026-02-01",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown extra key (.strict)", () => {
    const result = AnnouncementRegistrySchema.safeParse({
      announcements: [
        {
          id: "midterm-moved",
          title: "Midterm moved",
          severity: "info",
          publish_date: "2026-02-01",
          dismissible: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects expire_date before publish_date via the refine", () => {
    // safeParse + path/message assertion (not a bare toThrow): `.strict()`
    // alone would reject many shapes, so we pin the refine specifically by
    // asserting its issue path + message.
    const result = AnnouncementRegistrySchema.safeParse(
      loadFixture("invalid/announcements-publish-after-expire.yaml")
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual([
      "announcements",
      0,
      "publish_date",
    ]);
    expect(result.error.issues[0]?.message).toBe(
      "publish_date must be on or before expire_date"
    );
  });

  it("accepts a minimal announcement with only required fields", () => {
    // body / expire_date / href are all optional.
    const result = AnnouncementRegistrySchema.safeParse({
      announcements: [
        {
          id: "welcome",
          title: "Welcome to the course",
          severity: "info",
          publish_date: "2026-01-20",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
