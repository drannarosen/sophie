import * as HoverCard from "@radix-ui/react-hover-card";
import katex from "katex";
import { Sigma } from "lucide-react";
import { useMemo } from "react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import { BiographySummary } from "./EquationRef.biography-summary.tsx";
import styles from "./EquationRef.module.css.js";
import type { EquationRefProps } from "./EquationRef.schema.ts";
import { lookupCanonicalCitationByRefId } from "./equation-citations-store.ts";
import { lookupEquation } from "./equations-store.ts";

/**
 * `<EquationRef refId="..." />` or
 * `<EquationRef refId="...">custom text</EquationRef>` — inline cross-
 * reference to a registry-declared equation per ADR 0060. Renders an
 * inline anchor; HoverCard exposes the title + KaTeX-rendered tex
 * preview + biography summary.
 *
 * Trigger text: when `children` is omitted, renders the equation's
 * registry `title`. When `children` is provided, renders the children
 * verbatim (e.g. for in-prose mentions like "see the inverse-square
 * law"). Both forms render the same popover.
 *
 * Trigger icon: presentational `Sigma` from `lucide-react`
 * (aria-hidden); the link text is the accessible name. (ADR 0039
 * pedagogy-side Lucide adoption.)
 *
 * On miss (no matching equation): renders `children ?? refId` with no
 * anchor / popover; dev-only `console.warn` flags authoring drift.
 * Audit invariant R1 (Batch 6) elevates this to a build error.
 */
export function EquationRef({ refId, children }: EquationRefProps) {
  const entry = lookupEquation(refId);
  const hydrated = useHydrated();

  const texHtml = useMemo(() => {
    if (!entry?.tex) return "";
    return katex.renderToString(entry.tex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
  }, [entry?.tex]);

  if (!entry) {
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.warn(
        `[EquationRef] No equation found for refId "${refId}". Rendering bare prose.`
      );
    }
    return <>{children ?? refId}</>;
  }

  // Post-ADR-0060: equations live at the registry route `/equations/<id>`,
  // not `/chapters/X#anchor`. The registry is global; chapter-specific
  // citations live in `equationCitations` but the in-prose ref still
  // points at the canonical declaration page.
  const href = `/equations/${entry.id}`;
  // Sprint E — prefer "Eq. C.N" when a citation exists, else fall
  // back to the equation title (pre-Sprint-E behavior). Citation
  // lookup returns the canonical citation (lowest chapter number).
  const citation = lookupCanonicalCitationByRefId(refId);
  let eqLabel: string;
  if (citation) {
    eqLabel =
      citation.chapterNumber !== undefined
        ? `Eq. ${citation.chapterNumber}.${citation.number}`
        : `Eq. ${citation.number}`;
  } else {
    eqLabel = entry.title;
  }
  const linkText = children ?? eqLabel;

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
          <strong className={styles.title}>{entry.title}</strong>
          <div
            className={styles.tex}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: tex is rendered by katex.renderToString from registry-validated TeX source (not user-supplied content). ADR 0038 + design decision #10.
            dangerouslySetInnerHTML={{ __html: texHtml }}
          />
          <BiographySummary biography={entry.biography} />
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
