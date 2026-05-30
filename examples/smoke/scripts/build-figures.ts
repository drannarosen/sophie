import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

// Generates examples/smoke/src/content/figures.ts from
// astr201-sp26/assets/figures.yml, copying the image files actually
// referenced by the listed chapter sources into examples/smoke/public/figures/.
//
// Idempotent: re-runs from scratch each time. Re-run when any of the
// chapter sources or figures.yml changes.

interface YamlFigureEntry {
  path: string;
  caption?: string;
  alt?: string;
  credit?: string;
  module?: number;
}

interface YamlRegistry {
  figures: Record<string, YamlFigureEntry>;
}

const here = dirname(fileURLToPath(import.meta.url));
const smokeRoot = resolve(here, "..");

const astr201Root = process.env.ASTR201_REPO
  ? resolve(process.env.ASTR201_REPO)
  : "/Users/anna/Teaching/astr201-sp26";

const chapterQmds = [
  join(
    astr201Root,
    "modules/module-01/readings/lecture-01-spoiler-alerts-reading.qmd"
  ),
  join(
    astr201Root,
    "modules/module-02/readings/lecture-03-spectra-and-composition-reading.qmd"
  ),
];
const figuresYaml = join(astr201Root, "assets/figures.yml");
const publicFigures = join(smokeRoot, "public/figures");
const figuresSrcDir = join(smokeRoot, "src/figures");
const figuresTs = join(smokeRoot, "src/content/figures.ts");

// ADR 0094 regression guard: this representative subset is routed through
// the build-time optimization path instead of the legacy `public/`
// passthrough. Each named master is copied to `src/figures/<name>.<ext>`
// (convention-resolved) and its registry entry is emitted **metadata-only**
// (no `src`), so the integration's `astro:assets` codegen produces a
// responsive `<picture>`. The figures e2e asserts the srcset; the rest of
// the registry stays legacy so both paths are exercised. Smoke is a
// throwaway Phase-0 target (ADR 0023), so one figure is enough.
const OPTIMIZED_FIGURES = new Set(["cosmic-distance-ladder"]);

console.log(`Reading figure registry:  ${figuresYaml}`);
for (const qmd of chapterQmds) {
  console.log(`Reading chapter source:   ${qmd}`);
}

const yamlText = await readFile(figuresYaml, "utf8");

const usedNamesSet = new Set<string>();
for (const qmd of chapterQmds) {
  const chapterText = await readFile(qmd, "utf8");
  for (const name of extractFigureRefs(chapterText)) {
    usedNamesSet.add(name);
  }
}
const usedNames = [...usedNamesSet].sort();
console.log(
  `Chapters reference ${usedNames.length} unique figures across ${chapterQmds.length} sources.`
);

const registry = parseYaml(yamlText) as YamlRegistry;
if (registry?.figures === undefined) {
  console.error("figures.yml is missing the top-level `figures:` key.");
  process.exit(1);
}

const missing: string[] = [];
const entries: Array<[string, ResolvedEntry]> = [];

for (const name of usedNames) {
  const yamlEntry = registry.figures[name];
  if (yamlEntry === undefined) {
    missing.push(name);
    continue;
  }
  if (yamlEntry.alt === undefined || yamlEntry.alt.trim() === "") {
    console.error(
      `Figure "${name}" is missing a non-empty alt text in figures.yml. Required by FigureSchema.`
    );
    process.exit(1);
  }
  entries.push([name, resolveEntry(name, yamlEntry)]);
}

if (missing.length > 0) {
  console.error(
    `Missing from figures.yml: ${missing.map((n) => `"${n}"`).join(", ")}`
  );
  process.exit(1);
}

await rm(publicFigures, { recursive: true, force: true });
await mkdir(publicFigures, { recursive: true });
await rm(figuresSrcDir, { recursive: true, force: true });
await mkdir(figuresSrcDir, { recursive: true });

for (const [name, entry] of entries) {
  const sourceFile = join(astr201Root, entry.sourceRelPath);
  if (entry.optimized) {
    const destFile = join(figuresSrcDir, entry.figureFileName);
    await copyFile(sourceFile, destFile);
    console.log(
      `  optimized ${name.padEnd(30)} → src/figures/${entry.figureFileName}`
    );
  } else {
    const destFile = join(publicFigures, entry.fileName);
    await copyFile(sourceFile, destFile);
    console.log(`  copied    ${name.padEnd(30)} ← ${entry.sourceRelPath}`);
  }
}

await mkdir(dirname(figuresTs), { recursive: true });
await writeFile(figuresTs, renderFiguresTs(entries), "utf8");
console.log(`\nWrote ${figuresTs} (${entries.length} entries)`);

interface ResolvedEntry {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  sourceRelPath: string;
  fileName: string;
  /** Routed through the ADR 0094 optimization path (metadata-only entry). */
  optimized: boolean;
  /** Destination basename under `src/figures/` when optimized: `<name>.<ext>`. */
  figureFileName: string;
}

function extractFigureRefs(qmd: string): string[] {
  const seen = new Set<string>();
  const re = /\{\{<\s*fig\s+([a-z0-9][a-z0-9-]*)/g;
  for (const match of qmd.matchAll(re)) {
    if (match[1] !== undefined) seen.add(match[1]);
  }
  return [...seen].sort();
}

function resolveEntry(name: string, raw: YamlFigureEntry): ResolvedEntry {
  // YAML paths are project-rooted ("/assets/images/..."). Strip the
  // leading slash so join() resolves relative to astr201Root.
  const rel = raw.path.replace(/^\/+/, "");
  const fileName = basename(rel);
  return {
    src: `/figures/${fileName}`,
    alt: raw.alt as string,
    caption: raw.caption,
    credit: raw.credit,
    sourceRelPath: rel,
    fileName,
    optimized: OPTIMIZED_FIGURES.has(name),
    // Convention key: src/figures/<registry-name>.<ext> (resolveFigureFile).
    figureFileName: `${name}${extname(fileName)}`,
  };
}

function renderFiguresTs(rows: Array<[string, ResolvedEntry]>): string {
  const header = `// GENERATED by scripts/build-figures.ts — DO NOT EDIT BY HAND.
// Re-run with \`pnpm --filter smoke figures\`.
//
// Source: /Users/anna/Teaching/astr201-sp26/assets/figures.yml
// Legacy entries: image copied into public/figures/ (entry carries \`src\`).
// Optimized entries (ADR 0094 guard): master copied into src/figures/<name>.<ext>
// and emitted metadata-only (no \`src\`) so astro:assets builds a <picture>.

import type { FigureRegistry } from "@sophie/components/runtime";

export const figures: FigureRegistry = {
`;
  const body = rows
    .map(([name, e]) => {
      const lines = [
        `  ${JSON.stringify(name)}: {`,
        `    name: ${JSON.stringify(name)},`,
      ];
      // Optimized entries are metadata-only — the master resolves by
      // convention from src/figures/ (ADR 0094); a `src` would shadow it.
      if (!e.optimized) {
        lines.push(`    src: ${JSON.stringify(e.src)},`);
      }
      lines.push(`    alt: ${JSON.stringify(e.alt)},`);
      if (e.caption !== undefined) {
        lines.push(`    caption: ${JSON.stringify(e.caption)},`);
      }
      if (e.credit !== undefined) {
        lines.push(`    credit: ${JSON.stringify(e.credit)},`);
      }
      lines.push("  },");
      return lines.join("\n");
    })
    .join("\n");
  return `${header}${body}\n};\n`;
}
