import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

// Course-home announcements registry: source of truth for build-time-gated
// banner notices (ADR 0099). Framework-pure — this schema enforces entry
// shape + the publish/expire ordering invariant only. Whether an announcement
// is currently active (its publish window contains "now") is NOT decided here:
// that is the integration's injected-`now` projection, fail-closed, mirroring
// the assignments/schedule projections (ADRs 0096, 0098).
//
// `publish_date` is a concrete ISO date (no `tbd`): an announcement with no
// start is meaningless. `expire_date` is optional — absent means "never
// expires" (open-ended notice). Both are `z.iso.date()`, so ISO `YYYY-MM-DD`
// strings compare lexicographically the same as chronologically — the refine
// below uses a plain string `<=`, no `Date` construction.
//
// `severity` is a CLOSED enum (info | notice | urgent): these map to the
// platform's scoped `--sophie-home-*` banner palette, not to course-owned
// vocabulary, so unlike assignment `kind` they are not free slugs.

export const AnnouncementSeverity = z.enum(["info", "notice", "urgent"]);

const AnnouncementSchema = z
  .object({
    id: Slug,
    title: NonEmptyString,
    body: NonEmptyString.optional(),
    severity: AnnouncementSeverity,
    publish_date: z.iso.date(),
    expire_date: z.iso.date().optional(),
    href: NonEmptyString.optional(),
  })
  .strict()
  .refine(
    (a) => a.expire_date === undefined || a.publish_date <= a.expire_date,
    {
      message: "publish_date must be on or before expire_date",
      path: ["publish_date"],
    }
  );

export const AnnouncementRegistrySchema = z
  .object({ announcements: z.array(AnnouncementSchema) })
  .strict();

export type AnnouncementRegistry = z.infer<typeof AnnouncementRegistrySchema>;
export type Announcement = z.infer<typeof AnnouncementSchema>;
