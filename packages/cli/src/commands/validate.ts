import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateCourseSpec } from "@sophie/core/schema";
import { defineCommand } from "citty";
import { parse as parseYaml } from "yaml";

/**
 * `sophie validate <file>` — validates a `course.sophie.yaml` against
 * `CourseSpecSchema` (ADR 0080). YAML parsing lives here (CLI is the
 * I/O boundary); the schema validation logic is in `@sophie/core/schema`
 * over a parsed JS object so `@sophie/core` keeps its framework-pure
 * runtime deps (ADR 0001).
 *
 * Output shape mirrors `sophie audit`:
 * - `OK <file>` on success (exit 0).
 * - `FAIL <file>` + one line per finding on failure (exit 1).
 */
export const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description:
      "Validate a Course Spec YAML file (course.sophie.yaml) against the schema.",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to a Course Spec YAML file.",
      required: true,
    },
  },
  async run({ args }) {
    const filePath = resolve(args.file);
    let parsed: unknown;
    try {
      parsed = parseYaml(readFileSync(filePath, "utf8"));
    } catch (err) {
      console.error(`FAIL  ${args.file}`);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [ERROR] <yaml-parse>: ${message}`);
      process.exit(1);
    }

    const findings = validateCourseSpec(parsed);
    if (findings.length === 0) {
      console.log(`OK  ${args.file}`);
      return;
    }
    console.error(`FAIL  ${args.file}`);
    for (const finding of findings) {
      console.error(`  [${finding.severity}] ${finding.message}`);
    }
    process.exit(1);
  },
});
