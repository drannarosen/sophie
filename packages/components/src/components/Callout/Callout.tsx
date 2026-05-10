import { useId } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./Callout.module.css.js";
import type { CalloutProps } from "./Callout.schema.ts";

const variantTitles: Record<NonNullable<CalloutProps["variant"]>, string> = {
  info: "Note",
  warning: "Warning",
  tip: "Tip",
  caution: "Caution",
};

export function Callout({
  variant = "info",
  title,
  id,
  interactive = false,
  children,
}: CalloutProps) {
  const accessibleTitle = title ?? variantTitles[variant];
  const className = `${styles.callout} ${styles[variant] ?? ""}`.trim();

  return (
    <aside role='note' aria-label={accessibleTitle} className={className}>
      {(title !== undefined || interactive) && (
        <p className={styles.title}>{accessibleTitle}</p>
      )}
      <div className={styles.body}>{children}</div>
      {interactive && id !== undefined && (
        <ReviewedRow calloutId={id} variant={variant} />
      )}
      {interactive && id === undefined && (
        <DevWarningMissingId variant={variant} />
      )}
    </aside>
  );
}

function ReviewedRow({
  calloutId,
  variant,
}: {
  calloutId: string;
  variant: NonNullable<CalloutProps["variant"]>;
}) {
  const checkboxId = useId();
  const { value: reviewed, setValue: setReviewed } = useInteractive(
    `callout:${calloutId}:reviewed`,
    false
  );

  return (
    <div className={styles.reviewedRow}>
      <input
        id={checkboxId}
        type='checkbox'
        checked={reviewed}
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
    </div>
  );
}

function DevWarningMissingId({ variant }: { variant: string }) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[@sophie/components] <Callout variant="${variant}" interactive> requires an \`id\` prop for persistence; rendering without the checkbox. Add an id to enable review-tracking.`
    );
  }
  return null;
}
