#!/usr/bin/env -S npx tsx
/**
 * Markdown local-link checker for `docs/website/**\/*.md` (and `.mdx`).
 *
 * Codex P1.2 of the 2026-05-18 architecture audit surfaced 59
 * unresolved local-style targets across the docs site. E3 (PR #108)
 * fixed the most-cited stale ADR links; E3b (this script + sweep)
 * locks in a guard so future broken links don't accumulate.
 *
 * Scope:
 *   - Markdown link/image syntax: `[label](target)` and `![alt](target)`.
 *   - MyST `[label](target)` semantics: relative + absolute file
 *     paths that resolve under the repo root.
 *   - URL fragments (`#anchor`) are not validated against the target
 *     file's headings — too noisy + MyST does its own anchor checks.
 *
 * Skipped (not "broken" — out of scope):
 *   - `http://` / `https://` — would need network; that's a separate
 *     linkinator-style job.
 *   - `mailto:` / `tel:` / `javascript:` URIs.
 *   - Bare anchor targets (`#section-name`) — same-page; MyST handles.
 *   - File targets that resolve under `node_modules/`, `dist/`, etc.
 *
 * Output: one finding per broken local link, with the source file +
 * line + target path. Exits 0 always (informational mode) — wired
 * into CI as a non-blocking signal per the E3b decision. To switch
 * to enforcement later, set the `enforce` flag in the runner.
 *
 * Allowlist: `LINK_ALLOWLIST` below skips targets that are
 * intentionally non-resolvable (placeholder paths in ADR examples,
 * pre-launch package paths, etc.). Each entry should have a comment
 * explaining why it's allowlisted.
 *
 * Run: `pnpm lint:links`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname;
const DOCS_ROOT = join(REPO_ROOT, "docs/website");

/**
 * Build the MyST slug index for the docs site. MyST routes flatten
 * filenames + strip the `NNNN-` ADR prefix:
 *   docs/website/decisions/0007-persistence-indexeddb.md  →  /persistence-indexeddb/
 *   docs/website/reference/cli.md                         →  /cli/
 *
 * The slug rule mirrors `validation/index-generator.ts`'s `contractHref`
 * helper. Returns a set of all known slugs (with leading + trailing slash).
 */
function buildMystSlugIndex(): Set<string> {
  const slugs = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "_build" || name === ".astro") {
        continue;
      }
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.md$/.test(name)) continue;
      const basename = name.replace(/\.md$/, "");
      const slug = basename.replace(/^\d{4}-/, "");
      slugs.add(`/${slug}/`);
    }
  };
  walk(DOCS_ROOT);
  return slugs;
}

const MYST_SLUGS = buildMystSlugIndex();

/**
 * Targets that are intentionally non-resolvable. Entries should
 * carry a rationale comment.
 */
const LINK_ALLOWLIST = new Set<string>([
  // EXAMPLE links — literal strings in docs that illustrate
  // link syntax, not real navigation targets.
  "other.md", // docs-style-guide.md L224: how-to-write-a-related-link example
  "...", // 0046-equation-biography.md L401: placeholder ellipsis in ADR prose example

  // Planned-but-not-yet-written docs. Surface as placeholders; the
  // link target indicates intent. Remove from allowlist when the
  // referenced page lands.
  "../how-to/migrate-from-quarto.md", // textbook-use-cases.md L45
  "../vision/pedagogy/observable-to-model-to-inference.md", // tdr-template.md L245

  // Intentional out-of-tree refs to Anna's project memory files.
  // The memory dir is at ~/.claude/projects/-Users-anna-Teaching-sophie/memory/
  // — outside the repo's tracked tree but reachable from Anna's local
  // working dir. These links serve as breadcrumbs for human readers;
  // they don't need to resolve in the published MyST site.
  "../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md",
  "../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_aesthetic_unlocked_prelaunch.md",
]);

/**
 * Path prefixes whose targets should be skipped wholesale.
 */
const SKIP_PREFIXES: ReadonlyArray<string> = [
  "http://",
  "https://",
  "mailto:",
  "tel:",
  "javascript:",
  "file://",
  "data:",
  "#", // bare same-page anchor
];

interface BrokenLink {
  source: string;
  line: number;
  label: string;
  target: string;
  reason: "missing-file" | "missing-anchor-only" | "outside-tree";
}

function listMarkdown(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "_build" || name === ".astro") {
      continue;
    }
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      listMarkdown(full, out);
      continue;
    }
    if (!/\.(md|mdx)$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

const LINK_RE = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function shouldSkipTarget(target: string): boolean {
  for (const prefix of SKIP_PREFIXES) {
    if (target.startsWith(prefix)) return true;
  }
  return false;
}

function resolveTarget(
  sourceAbsPath: string,
  target: string
): { absPath: string; outsideTree: boolean } | null {
  // Strip query and fragment for filesystem resolution.
  const cleanTarget = target.split(/[?#]/)[0] ?? "";
  if (cleanTarget === "") {
    // Pure-anchor link to same page (handled by SKIP_PREFIXES "#"
    // already; this branch is defensive).
    return null;
  }

  let absPath: string;
  if (cleanTarget.startsWith("/")) {
    // MyST-style absolute targets are slug-routes, not filesystem
    // paths. Look up in the slug index first (handled by the caller
    // via a separate code path); fall back to docs-root resolution
    // only for genuine filesystem prefixes (rare in practice).
    if (MYST_SLUGS.has(cleanTarget)) {
      return null; // resolved via slug index — caller treats null as "OK"
    }
    absPath = join(DOCS_ROOT, cleanTarget.slice(1));
  } else if (isAbsolute(cleanTarget)) {
    return { absPath: cleanTarget, outsideTree: true };
  } else {
    absPath = resolve(dirname(sourceAbsPath), cleanTarget);
  }

  return { absPath, outsideTree: false };
}

function tryResolveExtensions(absPath: string): string | null {
  // MyST links often omit the `.md` extension; try with + without.
  try {
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      // Accept directory targets — MyST auto-generates section
      // landing pages from `myst.yml` TOC entries for directories
      // without a literal `index.md`. Treat the directory's
      // existence as resolution success.
      return absPath;
    }
    return absPath;
  } catch {}
  // Try appending common extensions.
  for (const ext of [".md", ".mdx"]) {
    try {
      statSync(absPath + ext);
      return absPath + ext;
    } catch {}
  }
  return null;
}

function scanFile(sourceAbsPath: string, broken: BrokenLink[]): void {
  const source = readFileSync(sourceAbsPath, "utf8");
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    for (const match of line.matchAll(LINK_RE)) {
      const [, , label, target] = match;
      if (!target || shouldSkipTarget(target)) continue;
      if (LINK_ALLOWLIST.has(target)) continue;

      const resolved = resolveTarget(sourceAbsPath, target);
      if (resolved === null) continue;
      if (resolved.outsideTree) {
        broken.push({
          source: relative(REPO_ROOT, sourceAbsPath),
          line: i + 1,
          label: label ?? "",
          target,
          reason: "outside-tree",
        });
        continue;
      }

      const found = tryResolveExtensions(resolved.absPath);
      if (found === null) {
        broken.push({
          source: relative(REPO_ROOT, sourceAbsPath),
          line: i + 1,
          label: label ?? "",
          target,
          reason: "missing-file",
        });
      }
    }
  }
}

function main(): void {
  const broken: BrokenLink[] = [];
  const files = listMarkdown(DOCS_ROOT);
  for (const file of files) {
    scanFile(file, broken);
  }

  console.log(`Markdown link checker (Codex P1.2 / E3b)`);
  console.log(`Scanned: ${files.length} files under docs/website/`);
  console.log("");

  if (broken.length === 0) {
    console.log("All local links resolve. ✓");
    return;
  }

  // Group by source for readable output.
  const bySource = new Map<string, BrokenLink[]>();
  for (const b of broken) {
    const list = bySource.get(b.source) ?? [];
    list.push(b);
    bySource.set(b.source, list);
  }
  const sortedSources = Array.from(bySource.keys()).sort();
  for (const source of sortedSources) {
    const links = bySource.get(source) ?? [];
    console.log(`${source}`);
    for (const link of links) {
      console.log(
        `  L${link.line}  [${link.label}](${link.target})  — ${link.reason}`
      );
    }
    console.log("");
  }

  console.log(
    `Total: ${broken.length} broken local link${broken.length === 1 ? "" : "s"} across ${sortedSources.length} file${sortedSources.length === 1 ? "" : "s"}.`
  );
  console.log("");
  console.log(
    "Informational only — does not fail CI. Add to LINK_ALLOWLIST if intentional, or fix the target."
  );
}

main();
