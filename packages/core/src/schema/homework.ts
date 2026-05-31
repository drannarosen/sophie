import { z } from "zod";
import { DateOrTbd, NonEmptyString, Slug } from "./primitives.js";

// Per-term homework registry: source of truth for assignedDate / dueDate /
// cross-chapter problem membership (ADR 0096). Framework-pure — this schema
// enforces shape + intra-registry invariants only. The reference-integrity
// cross-refines (every `unit` resolves to a real unit; every `id` exists in
// that unit's practice set) are NOT enforced here or in the loader (which does
// YAML-parse + schema validation only). They require the content collections,
// available at `astro:config:setup` — not in `@sophie/core`, which is
// framework-pure (ADR 0001) — so they are deferred to the consumer-integration
// phase. Until then an unresolvable `unit`/`id` fails closed: no reveal date
// resolves, so the affected chapter's solutions stay hidden (the safe direction).

const ProblemGroupSchema = z
  .object({ unit: Slug, ids: z.array(NonEmptyString).min(1) })
  .strict();

const HomeworkSchema = z
  .object({
    id: Slug,
    title: NonEmptyString,
    assignedDate: DateOrTbd,
    dueDate: DateOrTbd,
    problems: z.array(ProblemGroupSchema).min(1),
  })
  .strict()
  .refine(
    (hw) =>
      hw.assignedDate === "tbd" ||
      hw.dueDate === "tbd" ||
      new Date(hw.assignedDate) <= new Date(hw.dueDate),
    {
      message: "assignedDate must be on or before dueDate",
      path: ["assignedDate"],
    }
  );

export const HomeworkRegistrySchema = z
  .object({ homework: z.array(HomeworkSchema) })
  .strict()
  .refine(
    (reg) => {
      const seen = new Set<string>();
      for (const hw of reg.homework) {
        for (const g of hw.problems) {
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
      message: "each problem may be claimed by at most one homework",
      path: ["homework"],
    }
  );

export type HomeworkRegistry = z.infer<typeof HomeworkRegistrySchema>;
export type Homework = z.infer<typeof HomeworkSchema>;
