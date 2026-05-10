import type { ReactNode } from "react";
import { z } from "zod";

export const CalloutVariant = z.enum(["info", "warning", "tip", "caution"]);
export type CalloutVariant = z.infer<typeof CalloutVariant>;

export const CalloutPropsSchema = z.object({
  variant: CalloutVariant.optional(),
  title: z.string().optional(),
  id: z.string().optional(),
  interactive: z.boolean().optional(),
  children: z.custom<ReactNode>(),
});

export type CalloutProps = z.infer<typeof CalloutPropsSchema>;
