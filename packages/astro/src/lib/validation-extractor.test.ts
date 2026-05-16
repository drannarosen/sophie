import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractContractValidations } from "./validation-extractor.ts";

/**
 * Tests for `extractContractValidations` — the build-time walk that
 * reads every ADR + reference doc, parses its `validation:` frontmatter
 * block through the schema, and surfaces V0 (parse failure, ERROR) +
 * V8 (unknown key, INFO) findings.
 *
 * Layer split (ADR 0056 PR 3 hardening review): V0 + V8 live HERE
 * because they need raw `Record<string, unknown>` access to detect
 * schema rejection and stripped keys. V1–V7 — which operate on
 * already-typed `Validation` blocks — live in `pedagogy-audit.test.ts`.
 * This split eliminates every `as unknown as Validation` cast (the
 * fixtures here are raw frontmatter strings; the audit tests construct
 * typed `ContractValidationEntry` fixtures).
 */

/**
 * Create a tmp repo-root scaffold with a single contract file. The
 * scaffold mirrors the production layout
 * (`docs/website/{decisions,reference}/*.md`) so the extractor's
 * directory walk hits realistic paths.
 */
async function makeTmpRepoWithContract(opts: {
  /** Repo-root-relative path, e.g. "docs/website/decisions/0099-broken.md". */
  path: string;
  /** Raw markdown body (everything after the closing frontmatter `---`). May be empty. */
  body?: string;
  /** Frontmatter object — serialized as YAML. */
  frontmatter: Record<string, unknown>;
}): Promise<string> {
  const tmpRoot = await mkdtemp(join(tmpdir(), "sophie-validation-extractor-"));
  const filepath = join(tmpRoot, opts.path);
  const dir = filepath.slice(0, filepath.lastIndexOf("/"));
  await mkdir(dir, { recursive: true });
  const yaml = renderYamlFrontmatter(opts.frontmatter);
  const content = `---\n${yaml}---\n\n${opts.body ?? ""}`;
  await writeFile(filepath, content);
  return tmpRoot;
}

/**
 * Minimal YAML renderer for test fixtures. Handles the shapes we
 * actually feed: scalars (strings, numbers, null, booleans), one-level
 * nested objects, arrays of objects. Quotes all string values so dates
 * like "2026-05-14" parse as strings — gray-matter's default loader
 * would otherwise coerce them.
 */
function renderYamlFrontmatter(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([k, v]) => renderEntry(k, v, 0))
    .join("");
}
function renderEntry(key: string, value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (value === null) return `${pad}${key}: null\n`;
  if (value === undefined) return "";
  if (typeof value === "string") return `${pad}${key}: "${value}"\n`;
  if (typeof value === "number" || typeof value === "boolean") {
    return `${pad}${key}: ${value}\n`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}${key}: []\n`;
    const items = value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const inner = Object.entries(item as Record<string, unknown>)
            .map(([k, v], i) => {
              if (i === 0) {
                return renderEntry(k, v, indent + 1).replace(
                  `${"  ".repeat(indent + 1)}`,
                  `${"  ".repeat(indent)}- `
                );
              }
              return renderEntry(k, v, indent + 1);
            })
            .join("");
          return inner;
        }
        return `${"  ".repeat(indent)}- ${item}\n`;
      })
      .join("");
    return `${pad}${key}:\n${items}`;
  }
  if (typeof value === "object") {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => renderEntry(k, v, indent + 1))
      .join("");
    return `${pad}${key}:\n${inner}`;
  }
  return "";
}

describe("extractContractValidations — V0 (schema parse failure)", () => {
  it("surfaces a V0 ERROR finding when the validation block fails schema parse", async () => {
    // status=validated requires last_validated_date — schema's V3
    // refinement rejects this, and V0 surfaces the rejection.
    const tmpRoot = await makeTmpRepoWithContract({
      path: "docs/website/decisions/0099-broken.md",
      frontmatter: {
        validation: {
          status: "validated",
          last_validated_date: null,
          evidence: [],
        },
      },
    });
    const { entries, findings } = await extractContractValidations(tmpRoot);
    const entry = entries.find((e) => e.path.endsWith("0099-broken.md"));
    expect(entry).toBeDefined();
    expect(entry?.validation).toBeUndefined();
    expect(
      findings.some((f) => f.code === "V0" && f.severity === "ERROR")
    ).toBe(true);
  });

  it("does not emit V0 for a well-formed validation block", async () => {
    const tmpRoot = await makeTmpRepoWithContract({
      path: "docs/website/decisions/0099-good.md",
      frontmatter: {
        validation: {
          status: "unvalidated",
          last_validated_date: null,
          evidence: [],
        },
      },
    });
    const { entries, findings } = await extractContractValidations(tmpRoot);
    const entry = entries.find((e) => e.path.endsWith("0099-good.md"));
    expect(entry?.validation).toBeDefined();
    expect(entry?.validation?.status).toBe("unvalidated");
    expect(findings.some((f) => f.code === "V0")).toBe(false);
  });
});

describe("extractContractValidations — V8 (unknown key)", () => {
  it("surfaces a V8 INFO finding for an unknown key in the validation block", async () => {
    const tmpRoot = await makeTmpRepoWithContract({
      path: "docs/website/decisions/0099-typo.md",
      frontmatter: {
        validation: {
          status: "unvalidated",
          last_validated_date: null,
          evidence: [],
          // typo: missing "ed". Zod 4's z.object() defaults to .strip(),
          // which would silently drop this; V8 catches it.
          last_validation_date: "2026-05-14",
        },
      },
    });
    const { findings } = await extractContractValidations(tmpRoot);
    const v8 = findings.find((f) => f.code === "V8");
    expect(v8).toBeDefined();
    expect(v8?.severity).toBe("INFO");
    expect(v8?.message).toContain("last_validation_date");
  });

  it("emits one V8 finding per unknown key", async () => {
    const tmpRoot = await makeTmpRepoWithContract({
      path: "docs/website/decisions/0099-multi-typo.md",
      frontmatter: {
        validation: {
          status: "unvalidated",
          last_validated_date: null,
          evidence: [],
          evidence_summary: "TODO",
          last_validation_date: "2026-05-14",
        },
      },
    });
    const { findings } = await extractContractValidations(tmpRoot);
    const v8s = findings.filter((f) => f.code === "V8");
    expect(v8s).toHaveLength(2);
  });

  it("does not emit V8 when all keys are known", async () => {
    const tmpRoot = await makeTmpRepoWithContract({
      path: "docs/website/decisions/0099-good-keys.md",
      frontmatter: {
        validation: {
          status: "unvalidated",
          last_validated_date: null,
          evidence: [],
          notes: "WIP",
        },
      },
    });
    const { findings } = await extractContractValidations(tmpRoot);
    expect(findings.some((f) => f.code === "V8")).toBe(false);
  });
});

describe("extractContractValidations — entry collection", () => {
  it("collects entries from both decisions/ and reference/ directories", async () => {
    const tmpRoot = await mkdtemp(
      join(tmpdir(), "sophie-validation-extractor-")
    );
    await mkdir(join(tmpRoot, "docs", "website", "decisions"), {
      recursive: true,
    });
    await mkdir(join(tmpRoot, "docs", "website", "reference"), {
      recursive: true,
    });
    await writeFile(
      join(tmpRoot, "docs", "website", "decisions", "0001-foo.md"),
      "---\ntitle: foo\n---\n"
    );
    await writeFile(
      join(tmpRoot, "docs", "website", "reference", "content-schema.md"),
      "---\ntitle: bar\n---\n"
    );
    const { entries } = await extractContractValidations(tmpRoot);
    const paths = entries.map((e) => e.path).sort();
    expect(paths).toEqual([
      "docs/website/decisions/0001-foo.md",
      "docs/website/reference/content-schema.md",
    ]);
  });

  it("skips template.md in the decisions directory", async () => {
    const tmpRoot = await mkdtemp(
      join(tmpdir(), "sophie-validation-extractor-")
    );
    await mkdir(join(tmpRoot, "docs", "website", "decisions"), {
      recursive: true,
    });
    await writeFile(
      join(tmpRoot, "docs", "website", "decisions", "template.md"),
      "---\ntitle: template\n---\n"
    );
    await writeFile(
      join(tmpRoot, "docs", "website", "decisions", "0001-real.md"),
      "---\ntitle: real\n---\n"
    );
    const { entries } = await extractContractValidations(tmpRoot);
    expect(entries.map((e) => e.path)).toEqual([
      "docs/website/decisions/0001-real.md",
    ]);
  });

  it("populates lastRevisedDate from a `**§N — YYYY-MM-DD —**` Revisions section", async () => {
    const tmpRoot = await mkdtemp(
      join(tmpdir(), "sophie-validation-extractor-")
    );
    await mkdir(join(tmpRoot, "docs", "website", "decisions"), {
      recursive: true,
    });
    await writeFile(
      join(tmpRoot, "docs", "website", "decisions", "0001-foo.md"),
      [
        "---",
        "title: foo",
        "---",
        "",
        "## Revisions",
        "",
        "**§1 — 2026-05-14 — initial**",
        "",
        "**§2 — 2026-05-15 — revision**",
        "",
      ].join("\n")
    );
    const { entries } = await extractContractValidations(tmpRoot);
    expect(entries[0]?.lastRevisedDate).toBe("2026-05-15");
  });

  it("populates lastRevisedDate from an H2-inline `## Revisions (YYYY-MM-DD —)` shape", async () => {
    const tmpRoot = await mkdtemp(
      join(tmpdir(), "sophie-validation-extractor-")
    );
    await mkdir(join(tmpRoot, "docs", "website", "decisions"), {
      recursive: true,
    });
    await writeFile(
      join(tmpRoot, "docs", "website", "decisions", "0001-foo.md"),
      [
        "---",
        "title: foo",
        "---",
        "",
        "## Revisions (2026-05-14 — initial)",
        "",
      ].join("\n")
    );
    const { entries } = await extractContractValidations(tmpRoot);
    expect(entries[0]?.lastRevisedDate).toBe("2026-05-14");
  });

  it("returns null for lastRevisedDate when no Revisions section is present", async () => {
    const tmpRoot = await mkdtemp(
      join(tmpdir(), "sophie-validation-extractor-")
    );
    await mkdir(join(tmpRoot, "docs", "website", "decisions"), {
      recursive: true,
    });
    await writeFile(
      join(tmpRoot, "docs", "website", "decisions", "0001-foo.md"),
      "---\ntitle: foo\n---\n"
    );
    const { entries } = await extractContractValidations(tmpRoot);
    expect(entries[0]?.lastRevisedDate).toBeNull();
  });
});
