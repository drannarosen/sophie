import styles from "./Aside.module.css.js";
import type { AsideKind, AsideProps } from "./Aside.schema.ts";

/**
 * `<Aside>` — Tufte-style margin note.
 *
 * Renders as a `<details>` element in document flow at its MDX
 * position. Chrome CSS in `@sophie/astro/styles/textbook-layout.css`
 * orchestrates *where* it appears (docked in the right column in
 * desktop Default mode; inline collapsed elsewhere) via the
 * `[data-sophie-aside]` selector. This component owns *how* it
 * looks — kind variant colors, summary + body layout, typography.
 *
 * Authoring constraint: `<Aside>` MUST be used at MDX block-level
 * (root scope), not inline within a paragraph. The positioning
 * script identifies each aside's anchor via its previous element
 * sibling at document level; inline use breaks that contract.
 *
 * Per the PR 6 design doc (2026-05-13). No persistence; this is a
 * static content component (no `useInteractive`, no IndexedDB).
 */
export function Aside({ kind = "note", title, children }: AsideProps) {
  const kindLabel = KIND_LABELS[kind];
  const className = [
    "sophie-aside", // stable global hook for chrome CSS
    styles.aside,
    styles[kind] ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <details className={className} data-sophie-aside='' data-aside-kind={kind}>
      <summary className={styles.summary}>
        <span className={styles.marker}>{kindLabel}</span>
        {title !== undefined && <span className={styles.title}>{title}</span>}
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}

const KIND_LABELS: Record<AsideKind, string> = {
  note: "Note",
  definition: "Definition",
  digression: "Digression",
  "key-insight": "Key insight",
};
