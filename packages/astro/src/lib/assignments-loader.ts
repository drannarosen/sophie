import fs from "node:fs";
import path from "node:path";
import {
  type AssignmentRegistry,
  AssignmentRegistrySchema,
} from "@sophie/core/schema";
import { parse as parseYaml } from "yaml";

/**
 * Load + validate `<consumerRoot>/assignments.sophie.yaml` at config-setup
 * time. Two-state return:
 *
 * - **null** when the file is absent. Means the consumer hasn't
 *   authored an assignments registry yet — `defineSophieIntegration`
 *   registers the `virtual:sophie/assignments` plugin with a `null`
 *   payload (always-register pattern, ADR 0096) and the solutions
 *   reveal gate stays fail-closed for every chapter.
 * - **AssignmentRegistry** when the file exists + is schema-valid.
 *
 * Throws (no third return state) when the file exists but is
 * malformed YAML or schema-invalid. Those are **author errors that
 * must surface at config-setup**, not silently degrade to "no
 * registry." The error message names the file path so the author can
 * locate it.
 *
 * YAML I/O lives in @sophie/astro (not @sophie/core) so @sophie/core
 * keeps its framework-pure runtime deps per ADR 0001 (the `yaml`
 * package is already a @sophie/astro dep for the figures + course-spec
 * loaders).
 */
export function loadAssignments(
  consumerRoot: string
): AssignmentRegistry | null {
  const registryPath = path.join(consumerRoot, "assignments.sophie.yaml");
  if (!fs.existsSync(registryPath)) return null;

  const source = fs.readFileSync(registryPath, "utf8");

  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (err) {
    throw new Error(
      `[sophie] assignments.sophie.yaml at ${registryPath} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const result = AssignmentRegistrySchema.safeParse(raw);
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
      `[sophie] assignments.sophie.yaml at ${registryPath} is schema-invalid:\n${issues}`
    );
  }
  return result.data;
}
