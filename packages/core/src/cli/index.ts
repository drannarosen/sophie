import { defineCommand } from "citty";
import { auditCommand } from "./commands/audit.js";
import { devCommand } from "./commands/dev.js";

export const main = defineCommand({
  meta: {
    name: "sophie",
    version: "0.0.0",
    description:
      "Sophie CLI — schema-driven, AI-authorable scientific textbooks.",
  },
  subCommands: {
    dev: devCommand,
    audit: auditCommand,
  },
});
