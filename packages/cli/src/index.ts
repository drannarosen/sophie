import { defineCommand } from "citty";
import { auditCommand } from "./commands/audit.ts";
import { figuresCommand } from "./commands/figures.ts";
import { previewCommand } from "./commands/preview.ts";
import { startCommand } from "./commands/start.ts";
import { validateCommand } from "./commands/validate.ts";

export const main = defineCommand({
  meta: {
    name: "sophie",
    version: "0.0.0",
    description:
      "Sophie CLI — schema-driven, AI-authorable scientific textbooks.",
  },
  subCommands: {
    start: startCommand,
    dev: startCommand,
    preview: previewCommand,
    audit: auditCommand,
    validate: validateCommand,
    figures: figuresCommand,
  },
});
