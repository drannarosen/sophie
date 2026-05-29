import * as HoverCard from "@radix-ui/react-hover-card";
import { Sigma } from "lucide-react";
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
  // Hydration-gate (Phase 1.5 class fix, 2026-05-25). Same shape as
  // GlossaryTerm + KeyEquation: packed-copy consumers populate the
  // equation store AFTER island SSR, so reading at render-time
  // produces a different tree on SSR vs. client → React #418. Gating
  // on `useHydrated` forces SSR + first client render to emit the
  // fallback (`<>{children ?? refId}</>`) regardless of store state;
  // the full anchor + HoverCard appears post-mount.
  const hydrated = useHydrated();

  if (!hydrated) {
    return <>{children ?? refId}</>;
  }

  if (!entry) {
    // Dev-only authoring-drift warning. Post-gate → always client (ADR 0038 § A2.2).
    if (process.env?.NODE_ENV !== "production") {
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
        <a className={styles.trigger} data-react-hydrated='true' href={href}>
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
            // ADR 0089: the prerendered html uses KaTeX `output: "html"` (no
            // `<math>` element; the `.katex-html` glyphs are aria-hidden by
            // KaTeX). role="math" + the build-computed SRE speech give a
            // screen reader the expression to read. Speech is a plain string
            // prop — @sophie/components never imports SRE (ADR 0001).
            {...(entry.speech
              ? { role: "math", "aria-label": entry.speech }
              : {})}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time prerendered KaTeX html from the registry (ADR 0090) — not user input.
            dangerouslySetInnerHTML={{ __html: entry.html ?? "" }}
          />
          <BiographySummary biography={entry.biography} />
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
