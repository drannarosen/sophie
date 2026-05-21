import {
  AlertCircle,
  ChevronDown,
  CircleAlert,
  Info,
  Lightbulb,
  ListChecks,
  Milestone,
  Sparkles,
  Telescope,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { type ComponentType, useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { MathText } from "../../runtime/MathText.tsx";
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
  "deep-dive": "Deep Dive",
  "the-more-you-know": "The More You Know",
};

/**
 * Collapsible-by-default variants (Session 9 P3): renderer wraps the
 * body in a native `<details>` disclosure widget so readers opt-in to
 * depth/enrichment content. Native `<details>` gives free keyboard +
 * screen-reader semantics; print mode auto-expands via CSS
 * (`@media print` in Callout.module.css).
 */
const COLLAPSIBLE_VARIANTS = new Set<CalloutVariant>([
  "deep-dive",
  "the-more-you-know",
]);

/**
 * Variant-injected title prefix (Session 9 P3). The author writes the
 * specific bit ("How the distance ladder works"); the renderer
 * prepends the variant-owned prefix ("Deep Dive: "). When no title is
 * supplied, falls through to `variantTitles[variant]` as before.
 */
const TITLE_PREFIX: Partial<Record<CalloutVariant, string>> = {
  "deep-dive": "Deep Dive: ",
  "the-more-you-know": "The More You Know: ",
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
  // Session 9 P3: depth + enrichment surfaces. Telescope keeps the
  // Sophie astronomy lineage while generalizing to "looking deeper";
  // Sparkles matches the NBC "The More You Know" shooting-star
  // imagery without literally being a star.
  "deep-dive": Telescope,
  "the-more-you-know": Sparkles,
};

export function Callout({
  variant = "info",
  title,
  id,
  children,
}: CalloutProps) {
  const visibleTitle = resolveVisibleTitle(variant, title);
  const Icon = variantIcons[variant];
  const className = `${styles.callout} ${styles[variant] ?? ""}`.trim();
  const isCollapsible = COLLAPSIBLE_VARIANTS.has(variant);

  // Collapsible variants (deep-dive, the-more-you-know): wrap body in
  // native <details> for free a11y + print-mode auto-expand via CSS.
  // No JS, no persistence — for a "remembered open state across
  // reload" follow-up, see the design note in the Session 9 P3 PR.
  //
  // a11y: outer <aside> uses aria-labelledby (not aria-label) pointing
  // at the summary's title span, so NVDA/JAWS resolve both references
  // to the same content and de-duplicate the announcement. Without
  // this, landmark navigation announces the title and then the summary
  // announces it again on focus. Per 2026-05-19 architecture audit P1
  // #1. Prefer the author-supplied id derivative when present (stable
  // across renders) and fall back to React's useId() (unique-but-
  // hydration-safe) when no id is provided.
  const generatedTitleId = useId();
  if (isCollapsible) {
    const titleSpanId = id !== undefined ? `${id}-title` : generatedTitleId;
    return (
      <aside
        role='note'
        aria-labelledby={titleSpanId}
        className={className}
        {...(id !== undefined ? { id } : {})}
      >
        <details className={styles.disclosure}>
          <summary className={styles.titleBar}>
            <Icon className={styles.icon} size={18} aria-hidden />
            <MathText id={titleSpanId} className={styles.title}>
              {visibleTitle}
            </MathText>
            <ChevronDown className={styles.chevron} size={18} aria-hidden />
          </summary>
          <div className={styles.body}>{children}</div>
        </details>
      </aside>
    );
  }

  return (
    <aside
      role='note'
      aria-label={visibleTitle}
      className={className}
      {...(id !== undefined ? { id } : {})}
    >
      <header className={styles.titleBar}>
        <Icon className={styles.icon} size={18} aria-hidden />
        <MathText className={styles.title}>{visibleTitle}</MathText>
      </header>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}

/**
 * Compose the visible title from variant + author-supplied title.
 *
 *   - For variants with a `TITLE_PREFIX` entry (deep-dive,
 *     the-more-you-know): "Deep Dive: " + author title. When no
 *     author title is provided, falls through to the variant default
 *     (e.g. "Deep Dive").
 *   - For other variants: author title overrides; variant default is
 *     the fallback.
 */
function resolveVisibleTitle(
  variant: CalloutVariant,
  title: string | undefined
): string {
  const prefix = TITLE_PREFIX[variant];
  if (prefix && title) return `${prefix}${title}`;
  return title ?? variantTitles[variant];
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
