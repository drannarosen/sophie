import { defineCommand } from "citty";

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
    return { args: { ...args, port } };
  },
});
