import { z } from "zod";

export const EffortLevel = z.enum(["skimmed", "read", "studied"]);
export type EffortLevel = z.infer<typeof EffortLevel>;

export const EffortLogPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  prompt: z.string().min(1),
});

export type EffortLogProps = z.infer<typeof EffortLogPropsSchema>;
