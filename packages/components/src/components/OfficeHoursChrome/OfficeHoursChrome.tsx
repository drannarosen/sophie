import { Fragment } from "react";
import { useCourseSpec } from "../../runtime/course-spec-store.ts";
import styles from "./OfficeHoursChrome.module.css.js";

/**
 * Inline chrome component surfacing the course's office hours
 * directly in chapter MDX — `<OfficeHours />`. Schema-default-only;
 * reads from `spec.office_hours` via useCourseSpec().
 *
 * v0.2 renders all declared slots compactly. Original design doc
 * mentioned "renders next upcoming slot(s)" — that's a follow-up
 * once schedule.yaml lands (need today's date + recurrence logic
 * to compute "next upcoming"); for now all slots is the simplest
 * useful surface.
 *
 * Naming note: file is `OfficeHoursChrome` to avoid the collision
 * with the existing `<OfficeHoursTable>` info-page section
 * component. The MDX-author export will alias to `OfficeHours` at
 * the root barrel.
 *
 * Chrome (not pedagogy) per ADR 0058 — no epistemic role declared.
 */
export function OfficeHoursChrome() {
  const spec = useCourseSpec();
  const slots = spec.office_hours;

  if (!slots || slots.length === 0) {
    return (
      <span className={styles.chrome} data-office-hours='empty'>
        <span className={styles.label}>Office hours:</span>
        <span className={styles.empty}>not set</span>
      </span>
    );
  }

  return (
    <span className={styles.chrome} data-office-hours-count={slots.length}>
      <span className={styles.label}>Office hours:</span>
      {slots.map((slot, idx) => (
        <Fragment key={`${slot.day}-${slot.start_time}`}>
          {idx > 0 && (
            <span className={styles.separator} aria-hidden='true'>
              ·
            </span>
          )}
          <span className={styles.slot}>
            <span className={styles.day}>{slot.day}</span> {slot.start_time}–
            {slot.end_time}
            <span className={styles.location}>({slot.location})</span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}
