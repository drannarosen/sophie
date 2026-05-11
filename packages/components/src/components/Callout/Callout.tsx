import { useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./Callout.module.css.js";
import type {
  CalloutProps,
  CalloutVariant,
  InteractiveCalloutProps,
} from "./Callout.schema.ts";

const variantTitles: Record<CalloutVariant, string> = {
  info: "Note",
  warning: "Warning",
  tip: "Tip",
  caution: "Caution",
  roadmap: "Roadmap",
  summary: "Summary",
  "key-insight": "Key Insight",
};

export function Callout({ variant = "info", title, children }: CalloutProps) {
  const accessibleTitle = title ?? variantTitles[variant];
  const className = `${styles.callout} ${styles[variant] ?? ""}`.trim();

  return (
    <aside role='note' aria-label={accessibleTitle} className={className}>
      {title !== undefined && <p className={styles.title}>{accessibleTitle}</p>}
      <div className={styles.body}>{children}</div>
    </aside>
  );
}

/**
 * Persistence-bearing Callout. Use with `client:load` in MDX so each
 * instance becomes its own React island. course/chapter/id thread the
 * state into per-course IndexedDB.
 */
export function InteractiveCallout({
  course,
  chapter,
  id,
  variant = "info",
  title,
  children,
}: InteractiveCalloutProps) {
  const accessibleTitle = title ?? variantTitles[variant];
  const className = `${styles.callout} ${styles[variant] ?? ""}`.trim();

  return (
    <aside role='note' aria-label={accessibleTitle} className={className}>
      {title !== undefined && <p className={styles.title}>{accessibleTitle}</p>}
      <div className={styles.body}>{children}</div>
      <ReviewedRow
        course={course}
        chapter={chapter}
        calloutId={id}
        variant={variant}
      />
    </aside>
  );
}

function ReviewedRow({
  course,
  chapter,
  calloutId,
  variant,
}: {
  course: string;
  chapter: string;
  calloutId: string;
  variant: CalloutVariant;
}) {
  const checkboxId = useId();
  // Spread `controlProps` per ADR-codified hydration guard pattern
  // (coding-standards.md § Persistence-bearing controls). Keeps clicks
  // landing before IDB-fetch resolution from being silently overwritten.
  const {
    value: reviewed,
    setValue: setReviewed,
    hydrated,
    controlProps,
  } = useInteractive(course, chapter, `callout:${calloutId}:reviewed`, false);

  return (
    <div className={styles.reviewedRow}>
      <input
        id={checkboxId}
        type='checkbox'
        checked={reviewed}
        {...controlProps}
        onChange={(event) => setReviewed(event.target.checked)}
        aria-describedby={`${checkboxId}-label`}
      />
      <label
        id={`${checkboxId}-label`}
        htmlFor={checkboxId}
        className={`${styles.reviewedLabel} ${reviewed ? styles.reviewed : ""}`.trim()}
        data-variant={variant}
      >
        {reviewed ? "Reviewed" : "Mark as reviewed"}
      </label>
      <HydrationAnnouncer
        hydrated={hydrated}
        label='Mark-as-reviewed control ready'
      />
    </div>
  );
}
