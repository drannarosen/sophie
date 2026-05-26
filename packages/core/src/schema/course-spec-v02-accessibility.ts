import { z } from "zod";

/**
 * Accessibility block. `drc_link` points at the institution's DRC
 * (Disability Resource Center) intake page; `request_deadline_weeks`
 * declares how far in advance accommodation requests must land before
 * exams. Optional `prose_ref` points at a fragment carrying
 * institution-specific accommodations language.
 */
export const AccessibilitySchema = z
  .object({
    drc_link: z.url(),
    contact_email: z.email(),
    request_deadline_weeks: z.number().int().nonnegative(),
    prose_ref: z
      .string()
      .regex(/^prose\//)
      .optional(),
  })
  .strict();

export type Accessibility = z.infer<typeof AccessibilitySchema>;
