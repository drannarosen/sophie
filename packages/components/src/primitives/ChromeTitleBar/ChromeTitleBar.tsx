import type { LucideIcon } from "lucide-react";
import { MathText } from "../../runtime/MathText.tsx";
import styles from "./ChromeTitleBar.module.css.js";

/**
 * Accent role for the title bar background + text color. Sourced from
 * the brand-role tokens in @sophie/theme — never raw hex/rgb (ADR 0005).
 *
 * - `teal`: brand-teal — primary pedagogy chrome (LearningObjectives).
 * - `rose`: brand-rose — elicitation family (Predict, Reflection).
 * - `violet`: brand-violet — derivation / mathematical chrome reserved.
 * - `status-info` / `status-warn` / `status-error`: Callout variants.
 */
export type ChromeTitleBarAccent =
  | "teal"
  | "rose"
  | "violet"
  | "status-info"
  | "status-warn"
  | "status-error";

export interface ChromeTitleBarProps {
  /** Brand-role token routing for the accent background + text color. */
  accent: ChromeTitleBarAccent;
  /** Lucide icon component (e.g. `Target`, `Telescope`, `PauseCircle`). */
  icon: LucideIcon;
  /** Icon pixel size. Defaults to 16 to match Sprint K label-voice. */
  iconSize?: number;
  /**
   * Title bar heading text. May contain `$inline$` / `$$display$$`
   * math segments — rendered via MathText (the same KaTeX path the
   * 4 callsites used before extraction).
   */
  heading: string;
  /**
   * HTML element type for the heading. Most callsites use `"h2"`
   * (section-level chrome inside chapter prose). `"label"` is used
   * by self-assessment widgets like Reflection where the title is
   * the form label for an inner control. `"h3"` / `"h4"` are
   * available for nested chrome.
   */
  headingAs?: "h2" | "h3" | "h4" | "label";
  /**
   * When `headingAs="label"`, the id of the form control this title
   * labels. Lets `<Reflection>`'s title double as the textarea's
   * `<label htmlFor=...>` for native a11y semantics.
   */
  headingFor?: string;
  /**
   * Optional id on the heading element. Required when an outer
   * disclosure or section uses `aria-labelledby` to point at this
   * title (e.g. Callout's `<summary>` per the 2026-05-19 P1 fix
   * locking down its aria-labelledby anchor).
   */
  headingId?: string;
}

/**
 * Shared label-voice title-strip primitive used by LearningObjectives,
 * Predict, Reflection, and Callout.
 *
 * Extracted in the Sprint K + hardening combo (2026-05-21) to resolve
 * the DRY violation surfaced by Agent 1 of the 2026-05-21 code review:
 * four near-identical `.titleBar` shapes shipped without a primitive,
 * making future variants a 4-file copy-paste.
 *
 * Design: flat props (chosen over compound `<ChromeTitleBar.Heading>` —
 * see ADR 0061 Rule 4, filename-as-discovery — and over a CSS-only
 * primitive — invariants like the Sprint G counter-zero rule live in
 * one place this way).
 *
 *   <ChromeTitleBar
 *     accent="teal"
 *     icon={Target}
 *     heading="After this reading, you should be able to:"
 *   />
 *
 *   <ChromeTitleBar
 *     accent="rose"
 *     icon={PauseCircle}
 *     heading={prompt}
 *     headingAs="label"
 *     headingFor={textareaId}
 *   />
 */
export function ChromeTitleBar({
  accent,
  icon: Icon,
  iconSize = 16,
  heading,
  headingAs = "h2",
  headingFor,
  headingId,
}: ChromeTitleBarProps) {
  return (
    <header className={styles.titleBar} data-accent={accent}>
      <Icon className={styles.icon} size={iconSize} aria-hidden />
      {/* `htmlFor` is only valid on <label>, not on h2/h3/h4. Switch
          the rendered MathText shape conditionally so the type system
          stays narrow — keeps consumers from passing headingFor with
          headingAs="h2" by accident. */}
      {headingAs === "label" ? (
        <MathText
          as='label'
          className={styles.heading}
          htmlFor={headingFor}
          id={headingId}
        >
          {heading}
        </MathText>
      ) : (
        <MathText as={headingAs} className={styles.heading} id={headingId}>
          {heading}
        </MathText>
      )}
    </header>
  );
}
