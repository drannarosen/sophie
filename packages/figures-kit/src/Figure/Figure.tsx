import type { EpistemicRole } from "@sophie/core/schema";
import type { ReactNode } from "react";
import styles from "./Figure.module.css.js";

/**
 * Props for `<Figure>`. Public surface kept narrow: id (required),
 * optional epistemic role, optional aria-labelledby pointer, and
 * children. The epistemic role is intentionally named
 * `epistemicRole` (not `role`) to avoid a JSX-prop collision with
 * the standard ARIA `role` attribute, and is written to the DOM as
 * `data-epistemic-role` — never spread.
 */
export interface FigureProps {
  id: string;
  epistemicRole?: EpistemicRole;
  "aria-labelledby"?: string;
  children?: ReactNode;
}

/**
 * `<Figure>` — root chrome primitive of `@sophie/figures-kit`.
 *
 * Renders a styled `<figure>` element that hosts slot children in
 * strict source order:
 *
 *   FigureTitle → FigureControls → FigureBody → FigureFooter → FigureCaption
 *
 * The slot composition rule is enforced by source order alone — the
 * primitive itself does not inspect or reorder children. Schemas and
 * pedagogy-audit (ADR 0038) flag misorderings.
 *
 * Accessibility: every `<Figure>` must be labelled. In Phase B.1
 * (this commit) the consumer wires `aria-labelledby` explicitly. In
 * Phase B.2, `<FigureTitle>` will register its heading id via React
 * Context so the labelling becomes automatic. The eight-role
 * epistemic taxonomy (ADR 0058) surfaces via `data-epistemic-role`
 * when the optional `role` prop is provided.
 */
export function Figure({
  id,
  epistemicRole,
  "aria-labelledby": ariaLabelledBy,
  children,
}: FigureProps) {
  return (
    <figure
      id={id}
      className={styles.root}
      aria-labelledby={ariaLabelledBy}
      data-epistemic-role={epistemicRole}
    >
      {children}
    </figure>
  );
}
