import { auditFile } from "@sophie/core/audit";
import { defineCommand } from "citty";

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
  async run({ args }) {
    const findings = await auditFile(args.file);
    if (findings.length === 0) {
      console.log(`OK  ${args.file}`);
      return;
    }
    console.error(`FAIL  ${args.file}`);
    for (const finding of findings) {
      const where = finding.path.length > 0 ? finding.path.join(".") : "<root>";
      console.error(`  [${finding.severity}] ${where}: ${finding.message}`);
    }
    process.exit(1);
  },
});
