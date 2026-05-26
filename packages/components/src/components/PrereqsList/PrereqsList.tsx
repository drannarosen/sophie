import type { Prereq } from "@sophie/core/schema";
import { useId } from "react";
import styles from "./PrereqsList.module.css.js";

export interface PrereqsListProps {
  prereqs: ReadonlyArray<Prereq>;
  title?: string;
}

const KIND_ORDER = ["course", "skill", "topic"] as const;
type Kind = (typeof KIND_ORDER)[number];

const KIND_HEADINGS: Record<Kind, string> = {
  course: "Required courses",
  skill: "Assumed skills",
  topic: "Background topics",
};

/**
 * Course-level prerequisite list. Groups by kind (`course` / `skill`
 * / `topic`) per the design doc's structured-prereqs intent.
 * Required vs recommended is shown via a badge per entry.
 *
 * Per Phase 1-4 review C2: ships at v0.2 alongside the other 5
 * SyllabusPage sub-components so authors that include `prereqs` in
 * their info_pages.syllabus.compose: list get a rendered section
 * (not a silent skip in the dispatcher).
 *
 * R10 landmark: `<section aria-labelledby>` nested under the page-
 * level `<main>` owned by SyllabusPage.astro. Chrome (not pedagogy)
 * per ADR 0058 — no epistemic role declared.
 */
export function PrereqsList({
  prereqs,
  title = "Prerequisites",
}: PrereqsListProps) {
  const headingId = useId();

  // Group by kind in declared order. Empty groups don't render.
  const byKind = new Map<Kind, Prereq[]>();
  for (const p of prereqs) {
    const bucket = byKind.get(p.kind) ?? [];
    bucket.push(p);
    byKind.set(p.kind, bucket);
  }

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      {KIND_ORDER.map((kind) => {
        const items = byKind.get(kind);
        if (!items || items.length === 0) return null;
        return (
          <div key={kind} className={styles.group}>
            <h3 className={styles.groupTitle}>{KIND_HEADINGS[kind]}</h3>
            <ul className={styles.list}>
              {items.map((p) => (
                <li
                  key={`${p.kind}-${p.ref}`}
                  className={styles.item}
                  data-prereq-required={p.required ? "true" : "false"}
                >
                  <span className={styles.ref}>{p.ref}</span>
                  <span
                    className={`${styles.badge} ${
                      p.required ? styles.required : styles.recommended
                    }`}
                  >
                    {p.required ? "Required" : "Recommended"}
                  </span>
                  {p.note && <span className={styles.note}>{p.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
