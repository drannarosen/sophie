import { defineCommand } from "citty";
import { runPreview } from "../lib/run-preview.ts";

export const previewCommand = defineCommand({
  meta: {
    name: "preview",
    description:
      "Build the consumer's Astro site and serve the production output. Used for e2e, print verification, pre-merge checks.",
  },
  args: {
    path: {
      type: "positional",
      description: "Path to the Astro project (default: current directory).",
      required: false,
      default: ".",
    },
    port: {
      type: "string",
      description: "Port to bind the preview server to. Default 4321.",
      required: false,
      default: "4321",
    },
    host: {
      type: "string",
      description: "Host to bind the preview server to. Default localhost.",
      required: false,
      default: "localhost",
    },
    build: {
      type: "boolean",
      description: "Run astro build before previewing. Default true.",
      required: false,
      default: true,
    },
  },
  async run({ args }) {
    const port = Number.parseInt(String(args.port), 10);
    if (Number.isNaN(port)) {
      throw new Error(`Invalid --port value: ${args.port}`);
    }
    const normalized = {
      path: String(args.path),
      port,
      host: String(args.host),
      build: Boolean(args.build),
    };

    // Test-harness escape: the citty arg-parsing tests in preview.test.ts
    // exercise runCommand which invokes run(). Without this guard those
    // tests would trigger real `astro build` + `astro preview` spawns.
    // The env flag is set by the preview.test.ts beforeAll hook.
    if (process.env.SOPHIE_CLI_TEST_HARNESS === "1") {
      return { args: normalized };
    }
    await runPreview(normalized);
    return { args: normalized };
  },
});
