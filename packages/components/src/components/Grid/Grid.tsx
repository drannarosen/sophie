import { Children, type CSSProperties, type ReactNode } from "react";
import styles from "./Grid.module.css.js";
import type { GridProps } from "./Grid.schema.ts";

const GAP_TOKEN: Record<NonNullable<GridProps["gap"]>, string> = {
  sm: "var(--sophie-space-2)",
  md: "var(--sophie-space-3)",
  lg: "var(--sophie-space-4)",
};

export function Grid({
  cols,
  responsive = true,
  gap = "md",
  id,
  className,
  children,
}: GridProps) {
  // Children.toArray already strips null/undefined/booleans per the
  // React docs. Drop anything that came back falsy belt-and-suspenders
  // (defensive against future React behavior changes) but the typical
  // path is "toArray returns only renderable values". An empty grid
  // renders as a plain <div> with no <ul> — a list with zero items is
  // an axe violation under best-practice rules.
  const items = Children.toArray(children);

  if (items.length === 0) {
    return (
      <div
        className={[styles.empty, className].filter(Boolean).join(" ")}
        {...(id !== undefined ? { id } : {})}
      />
    );
  }

  const style: CSSProperties = {
    ["--grid-cols" as string]: String(cols),
    ["--grid-gap" as string]: GAP_TOKEN[gap],
  };

  const rootClassName = [
    styles.list,
    responsive ? styles.responsive : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ul
      className={rootClassName}
      style={style}
      {...(id !== undefined ? { id } : {})}
    >
      {items.map((child, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Grid children are positional layout cells whose identity is their slot (not their content) — index keys are correct here.
        <li key={idx} className={styles.item}>
          {child as ReactNode}
        </li>
      ))}
    </ul>
  );
}
