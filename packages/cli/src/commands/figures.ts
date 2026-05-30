import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isFigureFile } from "@sophie/core/schema";
import { defineCommand } from "citty";
import pc from "picocolors";
import sharp from "sharp";
import { diffFigures } from "../lib/diff-figures.ts";
import { loadFigureRegistry } from "../lib/load-figure-registry.ts";
import { type FigureDimensions, planDownscale } from "../lib/plan-downscale.ts";

/** Raster formats `downscale` re-encodes; SVG (vector) and GIF (animation) are skipped. */
const RASTER = /\.(png|jpe?g|webp|avif)$/i;

/** List figure-master basenames directly under `dir` (ADR 0094 convention). */
function listFigureFiles(dir: string): string[] {
  try {
    return readdirSync(resolve(dir), { withFileTypes: true })
      .filter((e) => e.isFile() && isFigureFile(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * `sophie figures check` — audit the registry against `src/figures/`
 * (ADR 0094). Reports orphans (masters no entry claims) and missing
 * (entries with no resolvable master and no legacy `src`), reusing the
 * shared `resolveFigureFile` convention so the audit and the build agree.
 * Mirrors `sophie audit`'s `OK`/`FAIL` + exit-code contract.
 */
const checkCommand = defineCommand({
  meta: {
    name: "check",
    description:
      "Audit the figure registry against src/figures/ (orphans + missing).",
  },
  args: {
    dir: {
      type: "string",
      default: "src/figures",
      description: "Directory of figure masters.",
    },
    registry: {
      type: "string",
      default: "src/content/figures.ts",
      description: "Module exporting the `figures` registry.",
    },
  },
  async run({ args }) {
    const registry = await loadFigureRegistry(args.registry);
    const files = listFigureFiles(args.dir);
    const { orphans, missing } = diffFigures(Object.values(registry), files);

    if (orphans.length === 0 && missing.length === 0) {
      console.log(
        pc.green(
          `OK  ${Object.keys(registry).length} figures, ${files.length} masters — no orphans or missing.`
        )
      );
      return;
    }

    console.error(pc.red("FAIL  figure registry / src/figures/ mismatch"));
    for (const m of missing) {
      console.error(`  ${pc.yellow("missing")} ${m.name}: ${m.reason}`);
    }
    for (const file of orphans) {
      console.error(
        `  ${pc.yellow("orphan")}  ${file}: no registry entry claims this file`
      );
    }
    process.exit(1);
  },
});

/**
 * `sophie figures downscale` — shrink oversized masters in place so the
 * committed source set stays lean (ADR 0094 source hygiene; the build's
 * `astro:assets` derivatives are a separate, ephemeral concern). Aspect
 * ratio preserved; lossy formats re-encoded at q90, PNG kept lossless.
 *
 * Overwrites source files, so it is **dry-run by default**: it prints
 * the plan and only writes with `--write`.
 */
const downscaleCommand = defineCommand({
  meta: {
    name: "downscale",
    description:
      "Downscale oversized figure masters to a long-edge cap (dry-run unless --write).",
  },
  args: {
    dir: {
      type: "string",
      default: "src/figures",
      description: "Directory of figure masters.",
    },
    max: {
      type: "string",
      default: "2560",
      description: "Maximum long-edge in pixels.",
    },
    write: {
      type: "boolean",
      default: false,
      description: "Apply the downscale in place (default: dry-run).",
    },
  },
  async run({ args }) {
    const dir = resolve(args.dir);
    const maxEdge = Number.parseInt(args.max, 10);
    if (!Number.isFinite(maxEdge) || maxEdge <= 0) {
      console.error(
        pc.red(`Invalid --max "${args.max}" (expected a positive integer).`)
      );
      process.exit(1);
    }

    const rasters = listFigureFiles(args.dir).filter((f) => RASTER.test(f));
    const dims: FigureDimensions[] = [];
    for (const file of rasters) {
      const meta = await sharp(join(dir, file)).metadata();
      if (meta.width && meta.height) {
        dims.push({ file, width: meta.width, height: meta.height });
      }
    }

    const plan = planDownscale(dims, maxEdge);
    if (plan.length === 0) {
      console.log(
        pc.green(`OK  ${dims.length} masters, all within ${maxEdge}px.`)
      );
      return;
    }

    for (const p of plan) {
      const action = args.write
        ? pc.cyan("downscale")
        : pc.dim("would downscale");
      console.log(
        `  ${action} ${p.file}  ${p.width}×${p.height} → ${p.targetWidth}×${p.targetHeight}`
      );
      if (!args.write) continue;

      const path = join(dir, p.file);
      const input = await readFile(path);
      let pipeline = sharp(input).resize(p.targetWidth, p.targetHeight);
      if (/\.jpe?g$/i.test(p.file)) {
        pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
      } else if (/\.webp$/i.test(p.file)) {
        pipeline = pipeline.webp({ quality: 90 });
      } else if (/\.avif$/i.test(p.file)) {
        pipeline = pipeline.avif({ quality: 90 });
      }
      // PNG falls through: sharp preserves the lossless input format.
      await writeFile(path, await pipeline.toBuffer());
    }

    const verb = args.write ? "Downscaled" : "Would downscale";
    console.log(
      args.write
        ? pc.green(`${verb} ${plan.length} master(s).`)
        : pc.yellow(
            `${verb} ${plan.length} master(s). Re-run with --write to apply.`
          )
    );
  },
});

/** `sophie figures` — figure-pipeline tooling (ADR 0094). */
export const figuresCommand = defineCommand({
  meta: {
    name: "figures",
    description: "Audit and downscale figure masters (ADR 0094).",
  },
  subCommands: {
    check: checkCommand,
    downscale: downscaleCommand,
  },
});
