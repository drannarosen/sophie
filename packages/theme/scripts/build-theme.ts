import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { anchors, brand } from "../src/anchors.ts";
import { checkContrast } from "./contrast.ts";
import { generateCSS } from "./generate-css.ts";
import { generateTailwind } from "./generate-tailwind.ts";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "dist");

const checks = [
  checkContrast("brand.teal.text on paper", brand.teal.text, anchors.paper),
  checkContrast("brand.rose.text on paper", brand.rose.text, anchors.paper),
  checkContrast("brand.violet.text on paper", brand.violet.text, anchors.paper),
];

const failures = checks.filter((c) => !c.passesAA);
if (failures.length > 0) {
  console.error("WCAG AA contrast check failed for:");
  for (const f of failures) {
    console.error(
      `  ${f.label}: ${f.fg} on ${f.bg} = ${f.ratio.toFixed(2)}:1 (need ≥ 4.5:1)`
    );
  }
  console.error(
    "Tune the failing brand-*-text hex in packages/theme/src/anchors.ts."
  );
  process.exit(1);
}

console.log("WCAG AA contrast check:");
for (const c of checks) {
  console.log(`  ${c.label}: ${c.ratio.toFixed(2)}:1  ✓`);
}

await mkdir(distDir, { recursive: true });
await writeFile(join(distDir, "theme.css"), generateCSS(), "utf8");
await writeFile(join(distDir, "tailwind.css"), generateTailwind(), "utf8");

console.log(`Wrote ${join(distDir, "theme.css")}`);
console.log(`Wrote ${join(distDir, "tailwind.css")}`);
