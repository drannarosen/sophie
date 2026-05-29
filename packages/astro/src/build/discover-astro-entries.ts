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

      // Entry key = src-relative path minus extension; `preferences/`
      // index resolves to `preferences/index`, matching tsup's keys.
      const key = relative(srcDir, resolved).replace(/\.(ts|tsx)$/, "");
      entries[key] = resolved;
    }
  }

  return entries;
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

  const fence = astroSource.match(/^---\n([\s\S]*?)\n---/);
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
