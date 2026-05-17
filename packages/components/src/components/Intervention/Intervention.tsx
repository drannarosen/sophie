import { useId } from "react";
import { getInterventionByName } from "../../intervention/intervention-index.ts";
import styles from "./Intervention.module.css.js";
import type { InterventionProps } from "./Intervention.schema.ts";

/**
 * Distinct sub-card pairing a misconception with a cognitive-science-
 * grounded remediation move (ADR 0044). Renders inside a misconception
 * Aside when `addresses="this"`, or standalone with `addresses="<slug>"`
 * + a leading "↗ Addresses: ..." cross-reference header.
 *
 * Card anatomy (design §D4):
 *
 *   ┌─ [type-pill] · citation chip ─────────┐
 *   │ Body prose                            │
 *   │                                       │
 *   │ Limits: ... (optional sub-section)    │
 *   └───────────────────────────────────────┘
 *
 * `type === "custom"` substitutes the author-supplied `name` for the
 * type-pill label and omits the citation chip — the AI ledger
 * (ADR 0042) still records the intervention as a custom move; only
 * the visual differs.
 *
 * `depth` is audit-only metadata (consumed by MG4 depth coverage in
 * PR-δ); the renderer ignores it.
 *
 * No `epistemicRole` per design §D6 — ADR 0058's 8-role taxonomy
 * doesn't include a "remediation"/"intervention" role; the paired
 * misconception carries `epistemicRole: "misconception"` via the
 * Aside lookup table. Deliberate non-decision documented in the
 * design doc so future contributors don't retrofit a role here.
 *
 * Standalone-case render: when `addresses` is a non-`"this"` value
 * (single slug or array), the component renders a leading
 * "↗ Addresses: <slug>" header. v1 shows the raw slug (e.g.
 * `universe-with-a-center`); v2 may resolve to the misconception's
 * verbal label via a misconception store — TODO once that store
 * exists alongside an inline `<MisconceptionRef>`.
 */
export function Intervention({
  type,
  name,
  addresses,
  limits,
  children,
}: InterventionProps) {
  const titleId = useId();

  const isCustom = type === "custom";
  const libraryEntry = isCustom ? undefined : getInterventionByName(type);
  // Author-facing label: custom interventions surface the `name` prop;
  // canonical interventions surface the type slug verbatim. We never
  // synthesize prose here — the label is structural.
  const pillLabel = isCustom ? (name ?? type) : type;

  // Normalize `addresses` for the standalone-case render. `"this"` is
  // the in-Aside form; rendering it as a header would surface the raw
  // string to readers (no semantic value). When `addresses === "this"`,
  // the visual context (intervention nested in misconception Aside)
  // already conveys what's addressed, so we omit the header.
  const addressesArray = Array.isArray(addresses) ? addresses : [addresses];
  const showAddressesHeader =
    addressesArray.length > 0 && !addressesArray.includes("this");

  return (
    <aside
      role='note'
      aria-labelledby={titleId}
      className={styles.intervention}
      data-intervention-type={type}
    >
      {showAddressesHeader && (
        <div className={styles.addressesHeader}>
          <span className={styles.addressesArrow} aria-hidden='true'>
            ↗
          </span>
          <span>
            Addresses:{" "}
            <span className={styles.addressesTargets}>
              {addressesArray.join(", ")}
            </span>
          </span>
        </div>
      )}
      <header className={styles.titleBar}>
        <span id={titleId} className={styles.typePill}>
          {pillLabel}
        </span>
        {isCustom && (
          <span className={styles.customAnnotation} data-custom-annotation=''>
            custom
          </span>
        )}
        {libraryEntry && (
          <span className={styles.citation}>· {libraryEntry.citation}</span>
        )}
      </header>
      <div className={styles.body}>
        {children}
        {limits && (
          <p className={styles.limits}>
            <span className={styles.limitsLabel}>Limits:</span>
            {limits}
          </p>
        )}
      </div>
    </aside>
  );
}
