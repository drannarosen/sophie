import type { Accessibility } from "@sophie/core/schema";
import styles from "./AccessibilitySection.module.css.js";

export interface AccessibilitySectionProps {
  accessibility: Accessibility;
  title?: string;
}

/**
 * Renders the course's accessibility surface: DRC link, DRC contact
 * email, and request deadline (in weeks). The prose-ref to
 * institution-specific accommodations language is composed *adjacent*
 * to this section by the layout — not rendered inside the section
 * itself — so this component stays purely structural.
 *
 * R10 landmark: `<section aria-labelledby>` (nested under page <main>).
 *
 * Used by both SyllabusPage (overview view) and AccommodationsPage
 * (full view with prose); the difference is what the layout composes
 * around it.
 */
export function AccessibilitySection({
  accessibility,
  title = "Accessibility & Accommodations",
}: AccessibilitySectionProps) {
  const headingId = "accessibility-section-heading";

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>DRC office</span>
          <span className={styles.value}>
            <a
              href={accessibility.drc_link}
              rel='noopener noreferrer'
              target='_blank'
            >
              Disability Resource Center →
            </a>
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>
            <a href={`mailto:${accessibility.contact_email}`}>
              {accessibility.contact_email}
            </a>
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Deadline</span>
          <span className={styles.value}>
            Submit requests at least {accessibility.request_deadline_weeks} week
            {accessibility.request_deadline_weeks === 1 ? "" : "s"} before an
            exam or graded activity.
          </span>
        </div>
      </div>
    </section>
  );
}
