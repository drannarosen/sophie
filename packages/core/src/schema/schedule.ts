import { z } from "zod";
import { DateOrTbd, NonEmptyString, Slug } from "./primitives.js";

// Per-term class calendar: source of truth for dated calendar events
// (lectures, in-class activities, exams, holidays, breaks) (ADR 0098).
// Framework-pure — this schema enforces entry shape only. Deadlines do NOT
// live here: they have one home in the assignments registry (ADR 0096), and
// the "This Week" projection pulls them by date. So there is no `due` kind.
//
// `entry.date` is a concrete ISO date (no `tbd`): an undated schedule entry
// is meaningless. `term_start` IS `DateOrTbd` — a term may not be scheduled
// yet, and `tbd` simply omits the week-number labels downstream.
//
// `kind` is a CLOSED enum (unlike assignment kinds, which are free slugs):
// these are platform-universal calendar primitives. `activity` = in-class
// activities/worksheets/labs (meeting events, not deadlines); `holiday` = a
// single no-class day; `break` = a multi-day no-class span.
//
// `unit?` is shape-only here (a Slug). Reference-integrity — that the `unit`
// resolves to a real unit in the content collections — is deferred to the
// route projection and fails closed: an unresolvable `unit` simply doesn't
// contribute to a section's week-range (ADR 0001 keeps `@sophie/core`
// framework-pure; the collections are only visible at `astro:config:setup`).

export const ScheduleKind = z.enum([
  "lecture",
  "activity",
  "exam",
  "holiday",
  "break",
]);

const ScheduleEntrySchema = z
  .object({
    date: z.iso.date(),
    kind: ScheduleKind,
    title: NonEmptyString,
    unit: Slug.optional(),
  })
  .strict();

export const ScheduleSchema = z
  .object({
    term_start: DateOrTbd,
    entries: z.array(ScheduleEntrySchema),
  })
  .strict();

export type Schedule = z.infer<typeof ScheduleSchema>;
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;
