#!/usr/bin/env node
// One-shot migration: add a default `validation:` frontmatter block to
// every ADR + reference doc that does not already carry one.
//
// Per ADR 0056 Decision 1 (scope: ADRs + reference contracts) and
// Decision 2 (default state: unvalidated). Idempotent — re-running is
// a no-op for files that already declare a `validation:` block.

import { glob, readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";

const ROOTS = ["docs/website/decisions", "docs/website/reference"];

const DEFAULT_VALIDATION = {
  status: "unvalidated",
  last_validated_date: null,
  evidence: [],
};

const SKIP_FILENAMES = new Set(["template.md"]);

async function collectPaths() {
  const paths = [];
  for (const root of ROOTS) {
    for await (const entry of glob(`${root}/*.md`)) {
      const filename = entry.split("/").pop();
      if (SKIP_FILENAMES.has(filename)) continue;
      paths.push(entry);
    }
  }
  return paths.sort();
}

async function migrate(path) {
  const source = await readFile(path, "utf8");
  const { data, content } = matter(source);
  if (data.validation) {
    return "skipped";
  }
  data.validation = DEFAULT_VALIDATION;
  const next = matter.stringify(content, data);
  await writeFile(path, next, "utf8");
  return "added";
}

async function main() {
  const paths = await collectPaths();
  let added = 0;
  let skipped = 0;
  for (const path of paths) {
    const result = await migrate(path);
    if (result === "added") {
      added += 1;
    } else {
      skipped += 1;
    }
  }
  console.log(
    `Added validation block to ${added} files; skipped ${skipped} (already had a block).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
