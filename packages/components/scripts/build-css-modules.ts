import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import postcssModules from "postcss-modules";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const srcDir = join(pkgRoot, "src");
const distDir = join(pkgRoot, "dist");

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

async function processOne(srcPath: string): Promise<void> {
  const css = await readFile(srcPath, "utf8");
  const relFromSrc = relative(srcDir, srcPath);
  const distCssPath = join(distDir, relFromSrc);
  const distJsPath = `${distCssPath}.js`;

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

  // Emit a tiny ESM companion that side-effect-loads the mangled CSS
  // and default-exports the class-name map. The CSS import is relative
  // so the consumer's bundler (or Node ESM with a CSS loader) resolves
  // it next to the .js file.
  const cssBasename = relFromSrc.split("/").at(-1) ?? "";
  const companion = [
    `import "./${cssBasename}";`,
    `const styles = ${JSON.stringify(exportTokens, null, 2)};`,
    `export default styles;`,
    "",
  ].join("\n");
  await writeFile(distJsPath, companion, "utf8");

  console.log(
    `  ${relFromSrc} → ${relative(pkgRoot, distCssPath)} (+ .js, ${
      Object.keys(exportTokens).length
    } classes)`
  );
}

const files = await findCssModules(srcDir);
if (files.length === 0) {
  console.log("No .module.css files found under src/.");
} else {
  console.log(`Processing ${files.length} CSS Module file(s):`);
  await Promise.all(files.map(processOne));
  console.log("CSS Modules build complete.");
}
