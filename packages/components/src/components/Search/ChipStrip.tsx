import type { EntityType } from "@sophie/core/schema";
import type { ReactNode } from "react";
import styles from "./ChipStrip.module.css.js";

export type ChipFilter = "all" | EntityType;

const CHIPS: Array<{ key: ChipFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "page", label: "Pages" },
  { key: "term", label: "Terms" },
  { key: "equation", label: "Equations" },
  { key: "keyInsight", label: "Insights" },
  { key: "figure", label: "Figures" },
  { key: "misconception", label: "Misconceptions" },
  { key: "objective", label: "Objectives" },
];

export type ChipStripProps = {
  active: ChipFilter;
  onChange: (next: ChipFilter) => void;
};

export function ChipStrip({ active, onChange }: ChipStripProps): ReactNode {
  return (
    <div
      role='tablist'
      aria-label='result type filter'
      className={styles.strip}
    >
      {CHIPS.map((c) => (
        <button
          key={c.key}
          type='button'
          role='tab'
          aria-selected={active === c.key}
          className={`${styles.chip} ${active === c.key ? styles.active : ""}`}
          onClick={() => onChange(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
