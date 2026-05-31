import { z } from "zod";
import { DateOrTbd, NonEmptyString, Slug } from "./primitives.js";

// Per-term assignments registry: source of truth for assignedDate / dueDate /
// cross-chapter problem membership (ADR 0096, generalized in Amendment 1).
// Framework-pure — this schema enforces shape + intra-registry invariants
// only. The reference-integrity cross-refines (every `unit` resolves to a real
// unit; every `id` exists in that unit's practice set; every `kind` is declared
// in the course-spec `assignment_kinds` map when present) are NOT enforced here
// or in the loader (which does YAML-parse + schema validation only). They
// require the content collections + course-spec, available at
// `astro:config:setup` — not in `@sophie/core`, which is framework-pure
// (ADR 0001) — so they are deferred to the consumer-integration phase. Until
// then an unresolvable `unit`/`id` fails closed: no reveal date resolves, so
// the affected chapter's solutions stay hidden (the safe direction).
//
// `kind` is a free `Slug` (consumer-owned vocabulary, humanized for display),
// not a closed enum — a course owns its assignment kinds (homework, project,
// growth-memo, lab, …) without a platform PR per kind. `problems` is optional:
// its PRESENCE — not the `kind` label — drives the ADR 0096 gated-solution
// reveal, so an assignment that ships gradable problems gates identically for
// any kind, and one without (a project, a memo) never gates.

const ProblemGroupSchema = z
  .object({ unit: Slug, ids: z.array(NonEmptyString).min(1) })
  .strict();

const AssignmentSchema = z
  .object({
    id: Slug,
    title: NonEmptyString,
    kind: Slug,
    assignedDate: DateOrTbd,
    dueDate: DateOrTbd,
    problems: z.array(ProblemGroupSchema).min(1).optional(),
  })
  .strict()
  .refine(
    (a) =>
      a.assignedDate === "tbd" ||
      a.dueDate === "tbd" ||
      new Date(a.assignedDate) <= new Date(a.dueDate),
    {
      message: "assignedDate must be on or before dueDate",
      path: ["assignedDate"],
    }
  );

export const AssignmentRegistrySchema = z
  .object({ assignments: z.array(AssignmentSchema) })
  .strict()
  .refine(
    (reg) => {
      const seen = new Set<string>();
      for (const a of reg.assignments) {
        for (const g of a.problems ?? []) {
          for (const id of g.ids) {
            const key = `${g.unit}/${id}`;
            if (seen.has(key)) return false;
            seen.add(key);
          }
        }
      }
      return true;
    },
    {
      message: "each problem may be claimed by at most one assignment",
      path: ["assignments"],
    }
  );

export type AssignmentRegistry = z.infer<typeof AssignmentRegistrySchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
