import type { OfficeHour } from "@sophie/core/schema";
import { useId } from "react";
import styles from "./OfficeHoursTable.module.css.js";

export interface OfficeHoursTableProps {
  hours: ReadonlyArray<OfficeHour>;
  title?: string;
}

/**
 * Renders the instructor's office-hours schedule as a table. Used by
 * SyllabusPage + InstructorPage; iCal export (deferred per H6) will
 * eventually derive RRULE=FREQ=WEEKLY;BYDAY=<day> from this same data.
 *
 * R10 landmark: `<section aria-labelledby>` (nested under page <main>).
 *
 * `by_appointment: true` slots get an italic annotation; per-slot
 * notes (e.g. "Sign up via Calendly") render below the row to keep
 * the table primary row scannable.
 */
export function OfficeHoursTable({
  hours,
  title = "Office Hours",
}: OfficeHoursTableProps) {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope='col'>Day</th>
            <th scope='col'>Time</th>
            <th scope='col'>Location</th>
            <th scope='col'>Modality</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((slot) => (
            <tr key={`${slot.day}-${slot.start_time}-${slot.location}`}>
              <td>{slot.day}</td>
              <td>
                {slot.start_time}–{slot.end_time}
                {slot.by_appointment && (
                  <>
                    {" "}
                    <span className={styles.byAppointment}>
                      (by appointment)
                    </span>
                  </>
                )}
                {slot.note && <span className={styles.note}>{slot.note}</span>}
              </td>
              <td>{slot.location}</td>
              <td>
                <span className={styles.modality}>{slot.modality}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
