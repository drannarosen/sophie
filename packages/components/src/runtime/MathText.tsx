import type { ElementType } from "react";
import { BuildTimeHtml, type BuildTimeHtmlProps } from "./BuildTimeHtml.tsx";
import { renderTextWithMath } from "./render-text-with-math.ts";

/**
 * MathText is BuildTimeHtml whose `html` is computed from author text —
 * so its props are BuildTimeHtml's minus the ones MathText supplies
 * (`html` is derived; `trust` is fixed to `katex`), plus a string
 * `children`. Defining it in terms of `BuildTimeHtmlProps<E>` keeps the
 * `as`-polymorphic forwarding provably type-safe (one E, one prop type).
 */
type MathTextProps<E extends ElementType = "span"> = {
  /** Text content. May contain `$inline$` and `$$display$$` math segments. */
  children: string;
} & Omit<BuildTimeHtmlProps<E>, "html" | "trust">;

/**
 * Renders a string with KaTeX-rendered math segments inline, routed
 * through the one sanctioned injection chokepoint ({@link BuildTimeHtml},
 * ADR 0093) as `katex`.
 *
 * Use for component title/heading/description/label props that accept
 * author math. `renderTextWithMath` HTML-escapes non-math text and emits
 * KaTeX HTML for math segments only (ADR 0030), so this is safe for
 * untrusted-but-author-controlled strings.
 *
 * Examples:
 *   <MathText>Worked Example 1 — Calculating H$\alpha$'s wavelength</MathText>
 *   <MathText as="h3" className={styles.heading}>The $h c$ shortcut</MathText>
 */
export function MathText<E extends ElementType = "span">({
  children,
  ...rest
}: MathTextProps<E>) {
  // `rest` IS `Omit<BuildTimeHtmlProps<E>, "html" | "trust">` by
  // construction, so this object IS `BuildTimeHtmlProps<E>`. TS cannot
  // reduce the generic `Omit` over an unresolved `E` to prove it — the
  // well-known limitation of forwarding through nested `as`-polymorphic
  // components — so the boundary needs one assertion (not `as any`; the
  // shape is provably correct).
  const props = {
    html: renderTextWithMath(children),
    trust: "katex" as const,
    ...rest,
  } as unknown as BuildTimeHtmlProps<E>;
  return <BuildTimeHtml {...props} />;
}
