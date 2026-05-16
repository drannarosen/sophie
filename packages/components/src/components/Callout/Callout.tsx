import {
  AlertCircle,
  CircleAlert,
  Info,
  Lightbulb,
  ListChecks,
  Milestone,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { type ComponentType, useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./Callout.module.css.js";
import type {
  CalloutProps,
  CalloutVariant,
  InteractiveCalloutProps,
} from "./Callout.schema.ts";

// Default visible title for each variant. Used as both the visible
// title-bar label and the aria-label fallback when no `title` prop is
// passed. Per visual-polish-target.md the title bar is core anatomy —
// every callout renders it (vs the prior behavior where the visible
// title only appeared when an explicit `title` prop was set).
// (PR-5 build-bust: turbo cache invalidation for VR Update workflow.)
const variantTitles: Record<CalloutVariant, string> = {
  info: "Note",
  warning: "Warning",
  tip: "Tip",
  caution: "Caution",
  roadmap: "Roadmap",
  summary: "Summary",
  "key-insight": "Key insight",
  misconception: "Misconception",
};

// Per-variant Lucide icon (per ADR 0039 the pedagogy layer imports
// directly from `lucide-react`). Status-family variants use enclosed
// road-sign shapes (Info/Triangle/Circle); brand-family + structural
// variants use concept-glyphs (Zap/CircleAlert/ListChecks/Milestone).
// Shape language reinforces the durable-vs-ephemeral split locked in
// visual-polish-target.md.
type LucideIcon = ComponentType<{
  size?: number | string;
  "aria-hidden"?: boolean;
  className?: string;
}>;
const variantIcons: Record<CalloutVariant, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  tip: Lightbulb,
  caution: AlertCircle,
  roadmap: Milestone,
  summary: ListChecks,
  "key-insight": Zap,
  misconception: CircleAlert,
};

export function Callout({
  variant = "info",
  title,
  id,
  children,
}: CalloutProps) {
  const visibleTitle = title ?? variantTitles[variant];
  const Icon = variantIcons[variant];
  const className = `${styles.callout} ${styles[variant] ?? ""}`.trim();

  return (
    <aside
      role='note'
      aria-label={visibleTitle}
      className={className}
      {...(id !== undefined ? { id } : {})}
    >
      <header className={styles.titleBar}>
        <Icon className={styles.icon} size={18} aria-hidden />
        <span className={styles.title}>{visibleTitle}</span>
      </header>
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
  const visibleTitle = title ?? variantTitles[variant];
  const Icon = variantIcons[variant];
  const className = `${styles.callout} ${styles[variant] ?? ""}`.trim();

  return (
    <aside role='note' aria-label={visibleTitle} className={className} id={id}>
      <header className={styles.titleBar}>
        <Icon className={styles.icon} size={18} aria-hidden />
        <span className={styles.title}>{visibleTitle}</span>
      </header>
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
