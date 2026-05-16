import { slugify } from "@sophie/core/schema";
import styles from "./Aside.module.css.js";
import type { AsideKind, AsideProps } from "./Aside.schema.ts";

/**
 * `<Aside>` — Tier-3 typographic dissolution.
 *
 * Renders as a `<details>` element in document flow at its MDX
 * position. Chrome CSS in `@sophie/astro/styles/textbook-layout.css`
 * orchestrates *where* it appears (docked in the right column in
 * desktop Default mode; inline collapsed elsewhere) via the
 * `[data-sophie-aside]` selector. This component owns *how* it
 * looks — dissolved chrome (3px gray left rule, italic body), kind
 * label + optional title in summary, body in `<div>`.
 *
 * Per visual-polish-target.md §"Aside dissolution" (Workstream 3
 * PR-6): no card chrome, no per-variant accent color. Variant signal
 * lives in the small-caps kind label (or the bolded definition
 * term, which replaces the kind label for `kind="definition"`).
 *
 * Authoring constraint: `<Aside>` MUST be used at MDX block-level
 * (root scope), not inline within a paragraph. The positioning
 * script identifies each aside's anchor via its previous element
 * sibling at document level; inline use breaks that contract.
 *
 * No persistence; this is a static content component (no
 * `useInteractive`, no IndexedDB).
 */
export function Aside({ kind = "note", title, id, children }: AsideProps) {
  // Definition variant: defined term IS the label. Bolded title
  // carries the variant signal; no separate "DEFINITION" marker.
  // Other variants: small-caps kind label, optionally followed by a
  // bolded title for note-with-title / digression-with-title flows.
  const showKindMarker = kind !== "definition";
  const kindLabel = KIND_LABELS[kind];

  const className = ["sophie-aside", styles.aside].join(" ");

  // Auto-anchor for definition kind: id={slugify(title)} unless an
  // explicit `id` prop overrides. The pedagogy-index extractor reads
  // the same field (ADR 0038); back-links from <CourseGlossary> and
  // <GlossaryTerm> target this DOM id.
  const resolvedId =
    id ?? (kind === "definition" && title ? slugify(title) : undefined);

  return (
    <details
      className={className}
      data-sophie-aside=''
      data-aside-kind={kind}
      {...(resolvedId ? { id: resolvedId } : {})}
    >
      <summary className={styles.summary}>
        {showKindMarker && <span className={styles.marker}>{kindLabel}</span>}
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
  misconception: "Misconception",
};
