import { spawn } from "node:child_process";
import { defineCommand } from "citty";

export const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Start the Astro dev server in the given Sophie target.",
  },
  args: {
    path: {
      type: "positional",
      description: "Path to the Astro project (default: current directory).",
      required: false,
      default: ".",
    },
  },
  async run({ args }) {
    return await new Promise<void>((resolve, reject) => {
      const child = spawn("astro", ["dev"], {
        cwd: args.path,
        stdio: "inherit",
        shell: true,
      });
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`astro dev exited with code ${code ?? "null"}`));
      });
      child.on("error", reject);
    });
  },
});
