import { type ReactNode, useEffect, useRef } from "react";

import { ResultCard } from "./ResultCard.tsx";
import styles from "./ResultList.module.css.js";
import type { SearchResult } from "./types.ts";

export type ResultListProps = {
  results: SearchResult[];
  highlightedIndex: number;
  onSelect: (result: SearchResult) => void;
};

const LIST_ID = "sophie-search-results";
const optionId = (i: number) => `sophie-search-option-${i}`;

export function ResultList({
  results,
  highlightedIndex,
  onSelect,
}: ResultListProps): ReactNode {
  const listRef = useRef<HTMLDivElement>(null);

  // Document-level Enter listener so the listbox can fire onSelect from
  // the highlighted row while DOM focus stays on the modal input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || results.length === 0) return;
      const highlighted = results[highlightedIndex];
      if (highlighted) onSelect(highlighted);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [highlightedIndex, results, onSelect]);

  // Listbox container per WAI-ARIA APG. <div> + role="listbox" with
  // tabIndex={0} so the composite widget is reachable; per-option
  // focus is managed via aria-activedescendant rather than DOM focus
  // (which stays on the modal's <input>).
  if (results.length === 0) {
    return (
      <>
        <div
          ref={listRef}
          id={LIST_ID}
          role='listbox'
          aria-label='search results'
          tabIndex={0}
          className={styles.list}
        />
        <p className={styles.empty}>
          Try typing a term, equation, key insight, or chapter name.
        </p>
        <p role='status' aria-live='polite' className={styles.srOnly}>
          No results
        </p>
      </>
    );
  }

  return (
    <>
      <div
        ref={listRef}
        id={LIST_ID}
        role='listbox'
        aria-label='search results'
        aria-activedescendant={optionId(highlightedIndex)}
        tabIndex={0}
        className={styles.list}
      >
        {results.map((r, i) => (
          <ResultCard
            key={r.url}
            id={optionId(i)}
            result={r}
            highlighted={i === highlightedIndex}
          />
        ))}
      </div>
      <p role='status' aria-live='polite' className={styles.srOnly}>
        {results.length} {results.length === 1 ? "result" : "results"}
      </p>
    </>
  );
}
