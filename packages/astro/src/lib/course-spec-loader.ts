import fs from "node:fs";
import path from "node:path";
import { type CourseSpec, CourseSpecSchema } from "@sophie/core/schema";
import { parse as parseYaml } from "yaml";

/**
 * Load + validate `<consumerRoot>/course.sophie.yaml` at config-setup
 * time. Two-state return:
 *
 * - **null** when the file is absent. Means the consumer hasn't
 *   authored a spec yet — `defineSophieIntegration` skips the
 *   `virtual:sophie/course-spec` plugin + the course-info route
 *   injections. Back-compat with consumers that haven't migrated to
 *   v0.2 chrome yet.
 * - **CourseSpec** when the file exists + is schema-valid.
 *
 * Throws (no third return state) when the file exists but is
 * malformed YAML or schema-invalid. Those are **author errors that
 * must surface at config-setup**, not silently degrade to "no chrome
 * routes." The error message names the file path so the author can
 * locate it.
 *
 * YAML I/O lives in @sophie/astro (not @sophie/core) so @sophie/core
 * keeps its framework-pure runtime deps per ADR 0001 (the `yaml`
 * package is already a @sophie/astro dep for the figures loader).
 */
export function loadCourseSpec(consumerRoot: string): CourseSpec | null {
  const specPath = path.join(consumerRoot, "course.sophie.yaml");
  if (!fs.existsSync(specPath)) return null;

  const source = fs.readFileSync(specPath, "utf8");

  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (err) {
    throw new Error(
      `[sophie] course.sophie.yaml at ${specPath} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const result = CourseSpecSchema.safeParse(raw);
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
      `[sophie] course.sophie.yaml at ${specPath} is schema-invalid:\n${issues}`
    );
  }
  return result.data;
}
