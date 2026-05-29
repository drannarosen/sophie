import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * Derives the tsup `entry` map for every module a copied-verbatim
 * `.astro` file imports AS A VALUE.
 *
 * The bug class this defends against: `@sophie/astro`'s `build` script
 * copies `src/**\/*.astro` verbatim into `dist/`. A copied `.astro` whose
 * `import { x } from "../lib/foo"` resolves at runtime to
 * `dist/lib/foo.js` — which exists only if `lib/foo` is a tsup entry.
 * A hand-maintained entry map silently drops entries; the omission
 * passes unit tests and `pnpm build` but breaks at the consumer Astro
 * build. This walk makes the map self-derive from the `.astro` imports.
 *
 * Value-vs-type discrimination uses the TypeScript compiler API (not
 * regex) so `import type { X }` and inline `import { type X }` — which
 * erase at build and must NOT produce an entry — are excluded robustly.
 *
 * Known parsing boundaries (intentionally not defended *here*): the
 * frontmatter fence regex assumes the file opens with a leading `---`
 * fence, and a literal `---` or `</script>` appearing inside a string
 * literal could truncate chunk extraction early. These are silent-miss
 * vectors — a missed import produces no entry and breaks only at the
 * consumer Astro build. The backstop is the independent raw-text
 * validator below (`findMissingEntries`): it re-scans each `.astro`
 * file's RAW text with a deliberately different parse mechanism (regex,
 * not the TS compiler), so a blind spot in *this* structured extraction
 * is converted into a LOUD build-time failure rather than a silent miss.
 * The one known-reachable vector (CRLF line endings) is fixed directly
 * in the fence + `<script>` regexes below.
 */
export function discoverAstroEntries(srcDir: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const astroFile of findAstroFiles(srcDir)) {
    const astroDir = dirname(astroFile);
    const source = readFileSync(astroFile, "utf8");

    for (const specifier of valueImportSpecifiers(source)) {
      // Only relative specifiers can resolve into this package's src.
      if (!specifier.startsWith(".")) continue;

      const resolved = resolveToBuildableSource(
        resolve(astroDir, specifier),
        srcDir
      );
      if (!resolved) continue;

      entries[entryKeyFor(srcDir, resolved)] = resolved;
    }
  }

  return entries;
}

/** A value-import the validator found that no tsup entry covers. */
export interface MissingEntry {
  /** Absolute path of the `.astro` file containing the import. */
  file: string;
  /** The raw module specifier as written in the `.astro` source. */
  specifier: string;
  /** The entry key the import resolves to but which is absent. */
  expectedKey: string;
}

/**
 * Independent second-pass validator (the approved self-validation
 * guard). Re-scans each `.astro` file's RAW text with a regex — a
 * DELIBERATELY DIFFERENT parse mechanism than `discoverAstroEntries`
 * (which uses the TS compiler API on extracted chunks). The independence
 * is the point: a blind spot in the structured extraction (CRLF, a
 * string literal that truncates chunk parsing, a `<script>` shape the
 * splitter misses) is caught here and turned into a LOUD build failure
 * instead of a silent missing dist entry.
 *
 * For each relative specifier that resolves to a buildable
 * `src/**\/*.{ts,tsx}` target, the expected entry key is asserted present
 * in `entryKeys` (the FINAL INTRINSIC ∪ discovered set). A value-import
 * whose target is missing → reported. Type-only imports are skipped via
 * a lightweight check on the matched statement text — deliberately
 * INDEPENDENT of discovery's TS-compiler classification.
 *
 * Asymmetry by design: discovery erring silent = broken consumer build
 * (BAD); this validator erring = a loud build error a human resolves
 * (acceptable). It is allowed to be slightly conservative; it must never
 * be silent. Returns [] when clean.
 */
export function findMissingEntries(
  srcDir: string,
  entryKeys: ReadonlySet<string> | readonly string[]
): MissingEntry[] {
  const keys = entryKeys instanceof Set ? entryKeys : new Set(entryKeys);
  const missing: MissingEntry[] = [];

  for (const astroFile of findAstroFiles(srcDir)) {
    const astroDir = dirname(astroFile);
    const source = readFileSync(astroFile, "utf8");

    for (const { specifier, statement } of rawImportStatements(source)) {
      if (!specifier.startsWith(".")) continue;
      if (isTypeOnlyStatement(statement)) continue;

      const resolved = resolveToBuildableSource(
        resolve(astroDir, specifier),
        srcDir
      );
      if (!resolved) continue;

      const expectedKey = entryKeyFor(srcDir, resolved);
      if (!keys.has(expectedKey)) {
        missing.push({ file: astroFile, specifier, expectedKey });
      }
    }
  }

  return missing;
}

/**
 * Raw-text scan for import statements: matches both
 * `import ... from "<spec>"` (single/double quotes) and side-effect
 * `import "<spec>"`. Returns the specifier plus the full matched
 * statement text so the type-only check can inspect it. This sees
 * imports the structured chunk extraction can miss.
 */
function rawImportStatements(
  astroSource: string
): { specifier: string; statement: string }[] {
  const results: { specifier: string; statement: string }[] = [];

  // `import <clause> from "<spec>"` / `'<spec>'`.
  const fromRe = /import\b([\s\S]*?)\bfrom\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null = fromRe.exec(astroSource);
  while (m !== null) {
    results.push({ specifier: m[2] ?? "", statement: m[0] });
    m = fromRe.exec(astroSource);
  }

  // Side-effect `import "<spec>"` (no `from`).
  const sideRe = /import\s*["']([^"']+)["']/g;
  m = sideRe.exec(astroSource);
  while (m !== null) {
    results.push({ specifier: m[1] ?? "", statement: m[0] });
    m = sideRe.exec(astroSource);
  }

  return results;
}

/**
 * Lightweight type-only detection on raw statement text (independent of
 * discovery's TS-compiler classification). Skips `import type ...` and
 * `import { ... }` blocks where EVERY named binding is `type X`. A
 * default/namespace import, or any named block retaining one value
 * binding, is treated as a value import.
 *
 * Scope note: this inspects ONLY the `{...}` brace block, so a
 * default-binding import with an all-`type` brace
 * (`import defaultThing, { type T } from "./x"`) reads as type-only.
 * Harmless: discovery's own classifier handles that shape correctly,
 * so the entry is present regardless — the validator's skip never
 * causes a silent miss for any input discovery sees correctly.
 */
function isTypeOnlyStatement(statement: string): boolean {
  if (/^import\s+type\b/.test(statement)) return true;

  const braces = statement.match(/\{([\s\S]*?)\}/);
  if (!braces?.[1]) return false; // default/namespace/side-effect: value import

  const names = braces[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (names.length === 0) return false;
  return names.every((name) => /^type\s/.test(name));
}

/**
 * Entry key = src-relative path minus extension; `preferences/index.ts`
 * → `preferences/index`, matching tsup's keys. Single source of the key
 * formula shared by discovery and the validator.
 */
function entryKeyFor(srcDir: string, resolved: string): string {
  return relative(srcDir, resolved).replace(/\.(ts|tsx)$/, "");
}

/** Recursively collect every `.astro` file under `srcDir` (Node 20+). */
function findAstroFiles(srcDir: string): string[] {
  return readdirSync(srcDir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".astro"))
    .map((d) => join(d.parentPath, d.name));
}

/**
 * Extract every module specifier imported AS A VALUE from an `.astro`
 * file's frontmatter fence and `<script>` blocks. Type-only imports
 * (`import type {...}`) and named imports that are *entirely* inline-type
 * specifiers (`import { type X }`) are excluded; side-effect imports
 * (`import "..."`) and any import with at least one value binding are
 * kept.
 */
function valueImportSpecifiers(astroSource: string): string[] {
  const specifiers: string[] = [];

  for (const chunk of tsChunks(astroSource)) {
    const sourceFile = ts.createSourceFile(
      "chunk.ts",
      chunk,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ false,
      ts.ScriptKind.TS
    );

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

      const clause = statement.importClause;
      // No clause → side-effect import (`import "..."`): keep (it still
      // forces dist resolution of the target).
      if (!clause) {
        specifiers.push(statement.moduleSpecifier.text);
        continue;
      }

      // `import type {...}` / `import type X` erases entirely.
      if (clause.isTypeOnly) continue;

      if (hasValueBinding(clause)) {
        specifiers.push(statement.moduleSpecifier.text);
      }
    }
  }

  return specifiers;
}

/**
 * True when an import clause retains at least one value binding after
 * inline `type` specifiers are stripped — i.e. a default import, a
 * namespace import, or any non-`type` named specifier.
 */
function hasValueBinding(clause: ts.ImportClause): boolean {
  if (clause.name) return true; // default import
  const bindings = clause.namedBindings;
  if (!bindings) return false;
  if (ts.isNamespaceImport(bindings)) return true; // `* as ns`
  return bindings.elements.some((el) => !el.isTypeOnly);
}

/**
 * Split `.astro` source into TypeScript-parseable chunks: the leading
 * frontmatter fence (between the first two `---` lines) plus every
 * `<script>...</script>` body.
 */
function tsChunks(astroSource: string): string[] {
  const chunks: string[] = [];

  // `\r?\n` tolerates CRLF line endings; the `<script>` body uses
  // `[\s\S]*?` which already matches `\r`, so it is CRLF-safe as-is.
  const fence = astroSource.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fence?.[1] !== undefined) chunks.push(fence[1]);

  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null = scriptRe.exec(astroSource);
  while (match !== null) {
    if (match[1] !== undefined) chunks.push(match[1]);
    match = scriptRe.exec(astroSource);
  }

  return chunks;
}

/**
 * Resolve an absolute, possibly-extensionless module path to the real
 * buildable source file (`.ts`/`.tsx`, including `/index.{ts,tsx}`).
 * Returns null when the target is not a buildable src module (another
 * `.astro` file, a `.css` side-effect import, a missing path, or a file
 * outside `srcDir`).
 */
function resolveToBuildableSource(
  absSpecifier: string,
  srcDir: string
): string | null {
  // Normalize an explicit `.ts`/`.tsx`/`.js` extension to the real file.
  const withoutExt = absSpecifier.replace(/\.(ts|tsx|js)$/, "");

  const candidates = [
    `${withoutExt}.ts`,
    `${withoutExt}.tsx`,
    join(withoutExt, "index.ts"),
    join(withoutExt, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    // Guard against escaping srcDir (defensive; `..` chains shouldn't
    // climb out of a package's own src in practice).
    if (relative(srcDir, candidate).startsWith("..")) return null;
    return candidate;
  }

  return null;
}
