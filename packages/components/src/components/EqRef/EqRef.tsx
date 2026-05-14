import * as HoverCard from "@radix-ui/react-hover-card";
import katex from "katex";
import { Sigma } from "lucide-react";
import { useMemo } from "react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import styles from "./EqRef.module.css.js";
import type { EqRefProps } from "./EqRef.schema.ts";
import { lookupEquation } from "./equations-store.ts";

/**
 * `<EqRef slug="..." />` or `<EqRef slug="...">custom text</EqRef>` —
 * the equation analog of `<GlossaryTerm>`. PR-C2 first instance of
 * the inline equation cross-reference. Renders an inline anchor;
 * HoverCard exposes the title + KaTeX-rendered tex preview.
 *
 * Trigger text: when `children` is omitted, renders "Eq. {number}"
 * derived from the index entry. When `children` is provided,
 * renders the children verbatim (e.g. for in-prose mentions like
 * "see the inverse-square law"). Both forms render the same
 * popover. (PR-C2 design decision #13.)
 *
 * Trigger icon: presentational `Sigma` from `lucide-react`
 * (aria-hidden); the link text is the accessible name. (Decision
 * #12; ADR 0039 pedagogy-side Lucide adoption, second consumer.)
 *
 * On miss (no matching equation): renders `children` unchanged
 * with no anchor / popover; dev-only `console.warn` flags
 * authoring drift. PR-C4's audit invariant E4 elevates this to a
 * build error.
 */
export function EqRef({ slug, children }: EqRefProps) {
  const entry = lookupEquation(slug);
  // E2E hydration signal (followup #10): see useHydrated.ts and
  // GlossaryTerm.tsx for rationale.
  const hydrated = useHydrated();

  // KaTeX render must happen unconditionally per React rules-of-
  // hooks; the `entry?.tex ?? ""` guard keeps it safe when the
  // entry is missing. (Decision #4: popover renders title +
  // KaTeX `tex` via `katex.renderToString(...)`.)
  const texHtml = useMemo(() => {
    if (!entry?.tex) return "";
    return katex.renderToString(entry.tex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
  }, [entry?.tex]);

  if (!entry) {
    // Dev-only signal so authoring drift is visible. Production
    // pages stay silent — the bare-prose fallback degrades
    // gracefully. PR-C4's audit invariant E4 elevates this to a
    // build error.
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.warn(
        `[EqRef] No equation found for slug "${slug}". Rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  const href = `/chapters/${entry.chapter}#${entry.anchor}`;
  const linkText = children ?? `Eq. ${entry.number}`;

  return (
    <HoverCard.Root openDelay={150} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <a
          className={styles.trigger}
          data-react-hydrated={hydrated ? "true" : undefined}
          href={href}
        >
          {linkText}
          <Sigma
            aria-hidden
            className={styles.icon}
            focusable={false}
            size={12}
          />
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          className={styles.popover}
          collisionPadding={8}
          data-sophie-equation-popover=''
          sideOffset={6}
        >
          <strong className={styles.title}>
            <span className={styles.number}>Eq. {entry.number}</span>
            {entry.title}
          </strong>
          <div
            className={styles.tex}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: tex is rendered by katex.renderToString from extractor-captured TeX source (not user-supplied content). ADR 0038 + design decision #10.
            dangerouslySetInnerHTML={{ __html: texHtml }}
          />
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
