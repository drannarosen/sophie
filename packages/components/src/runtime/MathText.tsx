import type { ComponentPropsWithoutRef, ElementType } from "react";
import { renderTextWithMath } from "./render-text-with-math.ts";

type MathTextProps<E extends ElementType = "span"> = {
  /** Text content. May contain `$inline$` and `$$display$$` math segments. */
  children: string;
  /** HTML element to render. Defaults to `span`. */
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, "children" | "dangerouslySetInnerHTML">;

/**
 * Renders a string with KaTeX-rendered math segments inline. Wraps
 * `renderTextWithMath` in a `<span>` (or author-chosen element) via
 * `dangerouslySetInnerHTML`.
 *
 * Use for component title/heading/description/label props that accept
 * author math. The math-aware text rendering is the same KaTeX
 * pipeline as body content; non-math text is HTML-escaped, so this is
 * safe for untrusted-but-author-controlled strings.
 *
 * Examples:
 *   <MathText>Worked Example 1 — Calculating H$\alpha$'s wavelength</MathText>
 *   <MathText as="h3" className={styles.heading}>The $h c$ shortcut</MathText>
 */
export function MathText<E extends ElementType = "span">({
  children,
  as,
  ...rest
}: MathTextProps<E>) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag
      {...rest}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: `renderTextWithMath` HTML-escapes non-math text and emits KaTeX HTML for math segments only — author-controlled component-prop strings are the trust boundary (ADR 0030).
      dangerouslySetInnerHTML={{ __html: renderTextWithMath(children) }}
    />
  );
}
