import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

/**
 * Contact block — instructor email + response window + optional async
 * channel (Slack / Discord / Canvas message). The `<Contact>` chrome
 * component renders this on the instructor page; the syllabus layout
 * also surfaces email + response_window_hours.
 */
const AsyncChannelSchema = z
  .object({
    kind: z.enum(["slack", "discord", "canvas-msg"]),
    ref: NonEmptyString,
  })
  .strict();

export const ContactSchema = z
  .object({
    email: z.email(),
    phone: z.string().optional(),
    response_window_hours: z.number().int().positive(),
    async_channel: AsyncChannelSchema.optional(),
  })
  .strict();

export type Contact = z.infer<typeof ContactSchema>;
