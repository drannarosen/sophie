import { defineCommand } from "citty";

// Placeholder; full relocation in Phase 6.
export const auditCommand = defineCommand({
  meta: {
    name: "audit",
    description:
      "Validate a Sophie chapter file's frontmatter against the schema.",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to a chapter MDX file.",
      required: true,
    },
  },
  async run() {
    throw new Error("audit command relocation pending (Phase 6).");
  },
});
