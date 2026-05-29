import type { CourseSpec, SectionEntry, UnitEntry } from "@sophie/core/schema";
import { withBase } from "../../utils/with-base.ts";
import styles from "./SimpleList.module.css.js";

export interface SimpleListProps {
  spec: CourseSpec;
  sections: ReadonlyArray<SectionEntry>;
  units: ReadonlyArray<UnitEntry>;
}

/**
 * Default course-landing layout. Renders the course title + each
 * section's units as a flat list of links to /units/<id>/reading/.
 *
 * R10 landmark choice: `<main>` is the right element here because
 * SimpleList IS the page-level shell when used as the course
 * landing — not nested under another landmark. The dispatcher
 * (info-page.astro / course-landing.astro) renders this directly into
 * `<body>` without a wrapping layout that owns `<main>`.
 *
 * Pluggable per ADR 0080 v0.2 / Anna's H2 decision: this is the
 * `landing.layout: "simple-list"` value (the default). The other two
 * built-ins (`hero-with-modules`, `prose-with-toc`) ship as stubs in
 * Phase 2 Task 2.5; `"custom"` dispatches to the integration override.
 *
 * Draft-status units are filtered out — they're authored-but-not-
 * ready, so a public course landing should not link to them. Authors
 * see drafts via the audit dashboard, not the landing page.
 */
export function SimpleList({ spec, sections, units }: SimpleListProps) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{spec.identity.title}</h1>
      {spec.identity.subtitle && (
        <p className={styles.subtitle}>{spec.identity.subtitle}</p>
      )}

      {sortedSections.map((section) => {
        const sectionUnits = units
          .filter((u) => u.section_id === section.slug && u.status !== "draft")
          .sort((a, b) => a.order - b.order);

        return (
          <section key={section.slug} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <ul className={styles.unitList}>
              {sectionUnits.map((unit) => (
                <li key={unit.id}>
                  <a
                    className={styles.unitLink}
                    href={withBase(`/units/${unit.id}/reading/`)}
                  >
                    {unit.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
