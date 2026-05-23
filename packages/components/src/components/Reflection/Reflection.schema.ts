import { z } from "zod";

export const ReflectionPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  prompt: z.string().min(1),
  placeholder: z.string().optional(),
});

export type ReflectionProps = z.infer<typeof ReflectionPropsSchema>;
