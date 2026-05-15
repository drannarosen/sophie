import { defineCommand } from "citty";

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
    // Implementation lands in Task 5.1. For now, return parsed args so
    // the citty arg-parsing tests can assert against the shape.
    const port = Number.parseInt(String(args.port), 10);
    return { args: { ...args, port } };
  },
});
