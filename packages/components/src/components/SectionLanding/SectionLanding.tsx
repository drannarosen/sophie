import type { CourseSpec, SectionEntry, UnitEntry } from "@sophie/core/schema";
import { withBase } from "../../utils/with-base.ts";
import styles from "./SectionLanding.module.css.js";

export interface SectionLandingProps {
  spec: CourseSpec;
  section: SectionEntry;
  units: ReadonlyArray<UnitEntry>;
}

/**
 * Renders a per-section landing at `/sections/<section-slug>/`. Lists
 * the section's non-draft units as cards with title, status badge
 * (for review-status units), and reading-time estimate when declared
 * on the unit (`estimated_duration_weeks`).
 *
 * R10 landmark choice: `<main>` is correct — section-landing IS the
 * page-level shell when used as the route entrypoint. Same shape as
 * SimpleList per ADR 0082 (one main per page).
 *
 * Sorts by `unit.order` to match the spec's authored sequence, then
 * filters out drafts so the public landing never links to authored-
 * but-not-ready content.
 */
export function SectionLanding({ spec, section, units }: SectionLandingProps) {
  const sectionUnits = units
    .filter((u) => u.section_id === section.slug && u.status !== "draft")
    .sort((a, b) => a.order - b.order);

  return (
    <main className={styles.main} aria-labelledby='section-landing-title'>
      <nav aria-label='Course breadcrumbs' className={styles.crumbs}>
        <a href={withBase("/")}>{spec.identity.title}</a>
        {" / "}
        <span aria-current='page'>{section.title}</span>
      </nav>

      <h1 id='section-landing-title' className={styles.title}>
        {section.title}
      </h1>

      {"description" in section && section.description && (
        <p className={styles.description}>{section.description}</p>
      )}

      <ul className={styles.unitList}>
        {sectionUnits.map((unit) => (
          <li key={unit.id} className={styles.unitCard}>
            <a
              className={styles.unitLink}
              href={withBase(`/units/${unit.id}/reading/`)}
            >
              <h2 className={styles.unitTitle}>
                {unit.status === "review" && (
                  <span className={styles.statusBadge}>Review</span>
                )}
                {unit.title}
              </h2>
              {unit.estimated_duration_weeks !== undefined && (
                <p className={styles.unitMeta}>
                  ~{unit.estimated_duration_weeks} week
                  {unit.estimated_duration_weeks === 1 ? "" : "s"}
                </p>
              )}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
