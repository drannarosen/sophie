import type { ReactNode } from "react";
import { BuildTimeHtml } from "../../runtime/BuildTimeHtml.tsx";
import styles from "./ResultCard.module.css.js";
import type { SearchResult } from "./types.ts";

const TYPE_LABEL: Record<string, string> = {
  page: "Chapter",
  term: "Term",
  equation: "Equation",
  keyInsight: "Key insight",
  figure: "Figure",
  misconception: "Misconception",
  objective: "Objective",
};

const TYPE_ICON: Record<string, string> = {
  page: "📄",
  term: "🔤",
  equation: "∫",
  keyInsight: "💡",
  figure: "🖼",
  misconception: "⚠",
  objective: "✓",
};

export type ResultCardProps = {
  result: SearchResult;
  highlighted?: boolean;
  id?: string;
};

export function ResultCard({
  result,
  highlighted,
  id,
}: ResultCardProps): ReactNode {
  // Pagefind's default HTML crawl emits page records without
  // `filters.type` (only converter-emitted custom records carry the
  // facet). Fall back to "page" so the listbox renders both shapes
  // through one component instead of crashing on the page-record
  // branch. The crawl-side fix (data-pagefind-filter markup on chapter
  // templates) is a Task-7/Task-8-adjacent follow-up; see Task 10
  // implementation report for the deviation.
  const type = result.filters?.type?.[0] ?? "page";
  const typeLabel = TYPE_LABEL[type] ?? type;
  const typeIcon = TYPE_ICON[type] ?? "";

  const isEquation = type === "equation" && result.meta.tex;
  const isMisconception = type === "misconception" && result.meta.length;

  // Listbox option per WAI-ARIA APG. We use <div> rather than <li>
  // because the WAI-ARIA listbox pattern is a composite widget with
  // its own focus-management semantics; the list-item role would
  // conflict, and Biome's noNoninteractiveElementToInteractiveRole
  // explicitly flags <li role="option">. tabIndex={-1} keeps each
  // option reachable through aria-activedescendant without taking
  // sequential keyboard focus from the modal's input.
  return (
    <div
      role='option'
      id={id}
      tabIndex={-1}
      aria-selected={!!highlighted}
      aria-label={`${typeLabel}: ${result.meta.title}, ${result.meta.locator}`}
      className={`${styles.card} ${highlighted ? styles.highlighted : ""}`}
    >
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden='true'>
          {typeIcon}
        </span>
        <span className={styles.typeLabel}>{typeLabel}</span>
        <span className={styles.title}>{result.meta.title}</span>
        {isMisconception ? (
          <output
            className={`${styles.lengthBadge} ${
              result.meta.length === "short"
                ? styles.lengthShort
                : styles.lengthLong
            }`}
            aria-label={`length: ${
              result.meta.length === "short" ? "short note" : "full callout"
            }`}
          >
            {result.meta.length === "short" ? "short note" : "full callout"}
          </output>
        ) : null}
      </div>
      {isEquation ? (
        // ADR 0089: the prerendered html uses KaTeX `output: "html"` (no
        // `<math>`; glyphs aria-hidden by KaTeX). role="math" + the
        // build-computed SRE speech (carried in meta.speech from the
        // Pagefind record) name the equation for a screen reader.
        // Build-time KaTeX from the search index (ADR 0090) — not user input.
        <BuildTimeHtml
          as='span'
          className={styles.richTail}
          {...(result.meta.speech
            ? { role: "math", "aria-label": result.meta.speech }
            : {})}
          html={result.meta.html ?? ""}
          trust='katex'
        />
      ) : (
        // Pagefind wraps matched terms in `<mark>`; rendering the excerpt
        // as escaped text showed literal tags (astr201 review B7). The
        // excerpt is escape-safe Pagefind output over build-indexed
        // content (ADR 0093 `pagefind-excerpt` trust), so route it through
        // the sanctioned BuildTimeHtml chokepoint (R14).
        <BuildTimeHtml
          as='p'
          className={styles.excerpt}
          html={result.excerpt}
          trust='pagefind-excerpt'
        />
      )}
      <div className={styles.locator}>{result.meta.locator}</div>
    </div>
  );
}
