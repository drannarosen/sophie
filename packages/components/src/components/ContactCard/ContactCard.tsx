import type { Contact } from "@sophie/core/schema";
import styles from "./ContactCard.module.css.js";

export interface ContactCardProps {
  contact: Contact;
  instructor: string;
  title?: string;
}

/**
 * Renders the instructor's contact card: name, email (mailto link),
 * expected response window, and optional async channel (Slack /
 * Discord / Canvas message). Used by SyllabusPage + InstructorPage.
 *
 * R10 landmark: `<section aria-labelledby>` (nested under page <main>).
 *
 * Email becomes a `mailto:` link so the contact card is functional
 * (one click to compose). Response-window hours render as plain
 * text — students need to know the expectation, not interact with it.
 */
export function ContactCard({
  contact,
  instructor,
  title = "Contact",
}: ContactCardProps) {
  const headingId = "contact-section-heading";

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Instructor</span>
          <span className={styles.value}>{instructor}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Response</span>
          <span className={styles.value}>
            within {contact.response_window_hours} hours
          </span>
        </div>
        {contact.async_channel && (
          <div className={styles.row}>
            <span className={styles.label}>Async</span>
            <span className={styles.value}>
              <span className={styles.channelKind}>
                {contact.async_channel.kind}
              </span>
              {contact.async_channel.ref}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
