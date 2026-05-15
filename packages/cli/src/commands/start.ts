import { defineCommand } from "citty";
import { runStart } from "../lib/run-start.ts";

export const startCommand = defineCommand({
  meta: {
    name: "start",
    description:
      "Start the Sophie dev server (Astro + @sophie/components watch + @sophie/theme watch + pedagogy-index HMR).",
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
      description: "Port to bind the dev server to. Default 4321.",
      required: false,
      default: "4321",
    },
    host: {
      type: "string",
      description: "Host to bind the dev server to. Default localhost.",
      required: false,
      default: "localhost",
    },
    open: {
      type: "boolean",
      description: "Open the dev URL in the default browser on start.",
      required: false,
      default: false,
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
      open: Boolean(args.open),
    };

    // Test-harness escape: the citty arg-parsing tests in start.test.ts
    // exercise runCommand which invokes run(). Without this guard those
    // tests would trigger real spawn orchestration. The env flag is set
    // by the start.test.ts beforeAll hook.
    if (process.env.SOPHIE_CLI_TEST_HARNESS === "1") {
      return { args: normalized };
    }
    await runStart(normalized);
    return { args: normalized };
  },
});
