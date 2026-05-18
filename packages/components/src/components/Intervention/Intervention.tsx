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
 * `universe-with-a-center`); the v2 plan (resolve slug → verbal
 * label via a misconception-store lookup, rendered through an inline
 * `<MisconceptionRef>` component) is documented in ADR 0044 §R8 —
 * deferred until both prerequisites (the component + the store) ship.
 */
export function Intervention({
  id,
  type,
  name,
  addresses,
  limits,
  children,
}: InterventionProps) {
  const titleId = useId();

  const isCustom = type === "custom";
  const libraryEntry = isCustom ? undefined : getInterventionByName(type);
  // Schema's .superRefine guarantees `name` is non-undefined when
  // isCustom; we still narrow with ?? for the TS-output type.
  const pillLabel = isCustom ? (name ?? type) : type;

  // Build the displayed addresses list. `"this"` (the in-Aside form
  // where the parent misconception name is implicit) gets FILTERED
  // OUT of the rendered list rather than suppressing the entire
  // header — that way mixed-array cases like ["this", "some-misc"]
  // (an extractor intermediate state) still surface the explicit
  // slug to the reader instead of hiding everything. When the
  // filtered list is empty, omit the header entirely (the
  // visual context already conveys what's addressed).
  const addressesArray = Array.isArray(addresses) ? addresses : [addresses];
  const visibleAddresses = addressesArray.filter((slug) => slug !== "this");
  const showAddressesHeader = visibleAddresses.length > 0;

  return (
    <aside
      id={id}
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
              {visibleAddresses.join(", ")}
            </span>
          </span>
        </div>
      )}
      <header className={styles.titleBar}>
        <span id={titleId} className={styles.typePill}>
          {pillLabel}
        </span>
        {isCustom && <span className={styles.customAnnotation}>custom</span>}
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
