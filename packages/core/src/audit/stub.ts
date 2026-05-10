import { readFile } from "node:fs/promises";
import { ChapterSchema } from "@sophie/core/schema";
import matter from "gray-matter";

export interface AuditFinding {
  severity: "error" | "warning";
  message: string;
  path: PropertyKey[];
}

export async function auditFile(filePath: string): Promise<AuditFinding[]> {
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
