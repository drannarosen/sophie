import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

/**
 * Office-hours entry. `day` + `start_time` + `end_time` enable the
 * `<OfficeHours>` chrome component to render "next upcoming slot" at
 * a chapter callout; iCal export (deferred to follow-up sprint)
 * derives `RRULE=FREQ=WEEKLY;BYDAY=<day>` from these.
 */
export const OfficeHourSchema = z
  .object({
    day: z.enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "HH:MM 24-hour clock (e.g. '14:00')"),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "HH:MM 24-hour clock (e.g. '15:30')"),
    location: NonEmptyString,
    modality: z.enum(["in-person", "online", "hybrid"]),
    by_appointment: z.boolean(),
    note: z.string().optional(),
  })
  .strict();

export type OfficeHour = z.infer<typeof OfficeHourSchema>;
