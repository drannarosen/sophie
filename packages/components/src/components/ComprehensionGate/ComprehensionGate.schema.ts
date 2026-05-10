import { z } from "zod";

export const ComprehensionLevel = z.enum(["got-it", "revisit", "stuck"]);
export type ComprehensionLevel = z.infer<typeof ComprehensionLevel>;

export const ComprehensionGatePropsSchema = z.object({
  course: z.string().min(1),
  chapter: z.string().min(1),
  id: z.string().min(1),
  prompt: z.string().min(1),
});

export type ComprehensionGateProps = z.infer<
  typeof ComprehensionGatePropsSchema
>;
