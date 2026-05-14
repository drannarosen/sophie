import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// One-pass migration that moves ADR lifecycle metadata out of mystmd
// frontmatter (where it triggers "extra keys ignored" warnings) into a
// `:::{admonition} ADR metadata` block right after the H1.
//
// Migrates these keys: status, deciders, supersedes, superseded-by, amends
// (the last only present on ADR 0035 at time of writing).
//
// Idempotent: skips any file that already contains an
// `:::{admonition} ADR metadata` block.
//
// Run via: pnpm exec tsx docs/website/scripts/adr-metadata-migrate.ts

const here = dirname(fileURLToPath(import.meta.url));
const decisionsDir = join(here, "..", "decisions");

const ADR_FILENAME = /^\d{4}-.+\.md$/;
const METADATA_KEYS = [
  "status",
  "deciders",
  "supersedes",
  "superseded-by",
  "amends",
] as const;
const ADMONITION_MARKER = ":::{admonition} ADR metadata";

interface Frontmatter {
  // Insertion-ordered map of key -> raw YAML scalar/inline-list string.
  // We only parse top-level `key: value` lines; ADR frontmatter never
  // uses block scalars or nested maps.
  entries: Map<string, string>;
}

function parseFrontmatter(source: string): { fm: Frontmatter; body: string } {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("No frontmatter block found");
  }
  const [, raw, body] = match;
  const entries = new Map<string, string>();
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();
    entries.set(key, value);
  }
  return { fm: { entries }, body };
}

function renderValue(rawValue: string): string {
  // Inline list `[anna]` or `[a, b]` -> comma-joined scalar.
  const list = rawValue.match(/^\[(.*)\]$/);
  if (list) {
    return list[1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(", ");
  }
  return rawValue;
}

function displayKey(key: string): string {
  // "superseded-by" -> "Superseded by", "amends" -> "Amends"
  const spaced = key.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildAdmonition(fm: Frontmatter): string {
  const lines: string[] = [ADMONITION_MARKER];
  for (const key of METADATA_KEYS) {
    const raw = fm.entries.get(key);
    if (raw === undefined) continue;
    if (raw === "~") continue;
    lines.push(`- **${displayKey(key)}**: ${renderValue(raw)}`);
  }
  lines.push(":::");
  return lines.join("\n");
}

function buildFrontmatter(fm: Frontmatter): string {
  const kept: string[] = [];
  for (const [key, value] of fm.entries) {
    if ((METADATA_KEYS as readonly string[]).includes(key)) continue;
    kept.push(`${key}: ${value}`);
  }
  return kept.length > 0 ? `---\n${kept.join("\n")}\n---\n` : "";
}

function injectAdmonition(body: string, admonition: string): string {
  const lines = body.split("\n");
  const h1Idx = lines.findIndex((line) => line.startsWith("# "));
  if (h1Idx === -1) {
    throw new Error("No H1 (`# `) found in body");
  }
  const before = lines.slice(0, h1Idx + 1);
  const after = lines.slice(h1Idx + 1);
  while (after.length > 0 && after[0].trim() === "") {
    after.shift();
  }
  return [...before, "", admonition, "", ...after].join("\n");
}

async function migrateFile(filePath: string): Promise<"migrated" | "skipped"> {
  const source = await readFile(filePath, "utf-8");
  if (source.includes(ADMONITION_MARKER)) {
    return "skipped";
  }
  const { fm, body } = parseFrontmatter(source);
  const hasMetadata = METADATA_KEYS.some((k) => fm.entries.has(k));
  if (!hasMetadata) {
    return "skipped";
  }
  const newFrontmatter = buildFrontmatter(fm);
  const admonition = buildAdmonition(fm);
  const newBody = injectAdmonition(body, admonition);
  await writeFile(filePath, newFrontmatter + newBody, "utf-8");
  return "migrated";
}

async function main(): Promise<void> {
  const names = (await readdir(decisionsDir))
    .filter((name) => ADR_FILENAME.test(name))
    .sort();
  let migrated = 0;
  let skipped = 0;
  for (const name of names) {
    const result = await migrateFile(join(decisionsDir, name));
    if (result === "migrated") {
      migrated++;
      console.log(`migrated: ${name}`);
    } else {
      skipped++;
      console.log(`skipped:  ${name}`);
    }
  }
  console.log(
    `\nDone. ${migrated} migrated, ${skipped} skipped (out of ${names.length} ADRs).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
