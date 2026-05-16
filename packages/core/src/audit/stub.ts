import { readFile } from "node:fs/promises";
import { ChapterSchema } from "@sophie/core/schema";
import matter from "gray-matter";

/**
 * Renamed from `AuditFinding` (2026-05-16) to disambiguate from the
 * broader `AuditFinding` shape in `@sophie/core/schema/audit.ts` (the
 * pedagogy-audit finding used by `runPedagogyAudit` across the
 * codebase). This shape is specific to per-chapter frontmatter
 * validation as run by the CLI's `sophie audit <file>` command.
 */
export interface ChapterFrontmatterFinding {
  severity: "error" | "warning";
  message: string;
  path: PropertyKey[];
}

export async function auditFile(
  filePath: string
): Promise<ChapterFrontmatterFinding[]> {
  const source = await readFile(filePath, "utf8");
  const parsed = matter(source);
  const result = ChapterSchema.safeParse(parsed.data);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    severity: "error",
    message: issue.message,
    path: [...issue.path],
  }));
}
