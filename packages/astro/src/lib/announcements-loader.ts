import fs from "node:fs";
import path from "node:path";
import {
  type AnnouncementRegistry,
  AnnouncementRegistrySchema,
} from "@sophie/core/schema";
import { parse as parseYaml } from "yaml";

/**
 * Load + validate `<consumerRoot>/announcements.sophie.yaml` at
 * config-setup time. Two-state return:
 *
 * - **null** when the file is absent. Means the consumer hasn't
 *   authored any banner notices yet — `defineSophieIntegration`
 *   registers the `virtual:sophie/announcements` plugin with a `null`
 *   payload (always-register pattern, ADR 0099) and the course-home
 *   announcement banner stays fail-closed (renders nothing).
 * - **AnnouncementRegistry** when the file exists + is schema-valid.
 *
 * Throws (no third return state) when the file exists but is
 * malformed YAML or schema-invalid. Those are **author errors that
 * must surface at config-setup**, not silently degrade to "no
 * announcements." The error message names the file path so the author
 * can locate it.
 *
 * YAML I/O lives in @sophie/astro (not @sophie/core) so @sophie/core
 * keeps its framework-pure runtime deps per ADR 0001 (the `yaml`
 * package is already a @sophie/astro dep for the figures + course-spec
 * + assignments + schedule loaders).
 */
export function loadAnnouncements(
  consumerRoot: string
): AnnouncementRegistry | null {
  const announcementsPath = path.join(
    consumerRoot,
    "announcements.sophie.yaml"
  );
  if (!fs.existsSync(announcementsPath)) return null;

  const source = fs.readFileSync(announcementsPath, "utf8");

  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (err) {
    throw new Error(
      `[sophie] announcements.sophie.yaml at ${announcementsPath} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const result = AnnouncementRegistrySchema.safeParse(raw);
  if (!result.success) {
    // Format Zod issues as `path: message` lines so the author can
    // see exactly which fields failed validation.
    const issues = result.error.issues
      .map(
        (issue) =>
          `  ${issue.path.map(String).join(".") || "<root>"}: ${issue.message}`
      )
      .join("\n");
    throw new Error(
      `[sophie] announcements.sophie.yaml at ${announcementsPath} is schema-invalid:\n${issues}`
    );
  }
  return result.data;
}
