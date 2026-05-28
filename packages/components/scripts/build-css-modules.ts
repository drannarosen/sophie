import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import postcssModules from "postcss-modules";

// Builds CSS Module wrappers for @sophie/components.
//
// Per source `Foo.module.css` file:
//   - Emit dist/.../Foo.module.css (with class names mangled).
//   - Emit a tiny ESM companion `Foo.module.css.js` that default-exports
//     the class-name map (NO side-effect CSS import) BESIDE the tsup chunk
//     that imports it. esbuild marks `./Foo.module.css.js` external and
//     rebases that sibling import to the chunk's own directory, so the
//     companion must sit next to the chunk:
//       - Components reachable from the main barrel land in dist/index.js
//         (root) → companion at dist/Foo.module.css.js.
//       - Plot-using figures under src/figures/ are isolated to the
//         `figures/index` entry (dist/figures/index.js — the Plot-isolation
//         boundary, ADR 0022 amendment; NOT re-exported from the main
//         barrel) → companion at dist/figures/Foo.module.css.js.
//     See companionJsPath() below.
//
// After all per-file work:
//   - Concatenate every emitted mangled `.module.css` into a single
//     dist/styles.css. @sophie/astro's <SophieChapter> side-effect-imports
//     this bundle once, alongside theme.css and katex.css. (The companion
//     `.js` carries only the class-name map; styles.css carries the CSS,
//     loaded once globally regardless of which chunk uses it.)
//
// Why no per-component side-effect:
//   The previous design had the wrapper do `import "./Foo.module.css"` so
//   that Vite would inject component CSS automatically. That broke Astro's
//   config-loader (Node ESM can't resolve `.css`) — caught by the Phase 0
//   step 7 vertical-slice acceptance exercise (ADR 0023). Bundling all CSS
//   into one stylesheet sidesteps the issue and matches industry patterns
//   (MUI, Chakra, etc.).

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const srcDir = join(pkgRoot, "src");
const distDir = join(pkgRoot, "dist");

interface ProcessResult {
  distCssPath: string;
  distJsPath: string;
  relFromSrc: string;
  classCount: number;
}

async function findCssModules(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findCssModules(full)));
    } else if (entry.isFile() && entry.name.endsWith(".module.css")) {
      out.push(full);
    }
  }
  return out;
}

// Output chunk a CSS module's component lands in, keyed on source path.
// CSS modules under `src/figures/` bundle exclusively into the
// `figures/index` entry (dist/figures/index.js); everything else lands in
// the root `dist/index.js` chunk (directly or via a root-level shared
// chunk). The companion `.module.css.js` must be a sibling of that chunk —
// see the header comment. Extend this when a new isolation-boundary entry
// (one NOT re-exported from the main barrel) owns CSS-importing components.
function companionJsPath(relFromSrc: string, srcPath: string): string {
  const chunkDir = relFromSrc.startsWith(`figures${sep}`)
    ? join(distDir, "figures")
    : distDir;
  return join(chunkDir, `${basename(srcPath)}.js`);
}

async function processOne(srcPath: string): Promise<ProcessResult> {
  const css = await readFile(srcPath, "utf8");
  const relFromSrc = relative(srcDir, srcPath);
  const distCssPath = join(distDir, relFromSrc);
  const distJsPath = companionJsPath(relFromSrc, srcPath);

  let exportTokens: Record<string, string> = {};
  const result = await postcss([
    postcssModules({
      generateScopedName: "[local]_[hash:base64:5]",
      getJSON: (_filename, json) => {
        exportTokens = json;
      },
    }),
  ]).process(css, { from: srcPath, to: distCssPath });

  await mkdir(dirname(distCssPath), { recursive: true });
  await writeFile(distCssPath, result.css, "utf8");

  // Companion ESM module beside its consuming chunk (companionJsPath).
  // Default-exports the class-name map. No side-effect CSS import — the
  // bundle is loaded once via dist/styles.css.
  const companion = [
    `const styles = ${JSON.stringify(exportTokens, null, 2)};`,
    `export default styles;`,
    "",
  ].join("\n");
  await mkdir(dirname(distJsPath), { recursive: true });
  await writeFile(distJsPath, companion, "utf8");

  return {
    distCssPath,
    distJsPath,
    relFromSrc,
    classCount: Object.keys(exportTokens).length,
  };
}

const files = await findCssModules(srcDir);
if (files.length === 0) {
  console.log("No .module.css files found under src/.");
  process.exit(0);
}

console.log(`Processing ${files.length} CSS Module file(s):`);
const results = await Promise.all(files.map(processOne));
for (const r of results) {
  console.log(
    `  ${r.relFromSrc} → ${relative(pkgRoot, r.distCssPath)} + ${relative(pkgRoot, r.distJsPath)} (${r.classCount} classes)`
  );
}

// Concatenate every emitted mangled CSS into dist/styles.css.
results.sort((a, b) => a.relFromSrc.localeCompare(b.relFromSrc));
const bundleParts: string[] = [
  "/* @sophie/components — bundled component stylesheets.",
  " * Generated by scripts/build-css-modules.ts. Do not edit by hand.",
  " * Side-effect-imported once by @sophie/astro/<SophieChapter>.",
  " */",
  "",
];
for (const r of results) {
  const mangled = await readFile(r.distCssPath, "utf8");
  bundleParts.push(`/* ${r.relFromSrc} */`);
  bundleParts.push(mangled.trimEnd());
  bundleParts.push("");
}
const bundlePath = join(distDir, "styles.css");
await mkdir(distDir, { recursive: true });
await writeFile(bundlePath, bundleParts.join("\n"), "utf8");
console.log(
  `\nWrote ${relative(pkgRoot, bundlePath)} (${results.length} files concatenated)`
);
console.log("CSS Modules build complete.");
