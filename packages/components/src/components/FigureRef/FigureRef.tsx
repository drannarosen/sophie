import * as HoverCard from "@radix-ui/react-hover-card";
import { ImageIcon } from "lucide-react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import styles from "./FigureRef.module.css.js";
import type { FigureRefProps } from "./FigureRef.schema.ts";
import { lookupFigureRegistry } from "./figure-registry-store.ts";
import { lookupCanonicalUsageByName } from "./figure-usages-store.ts";

/**
 * `<FigureRef name="..." />` or `<FigureRef name="...">custom text</FigureRef>` —
 * the figure analog of `<GlossaryTerm>` / `<EquationRef>`. PR-C3 first
 * instance of the inline figure cross-reference. Renders an inline
 * anchor; HoverCard exposes a thumbnail + caption.
 *
 * Trigger text: when `children` is omitted, renders "Fig. {number}"
 * derived from the canonical usage entry. When `children` is
 * provided, renders the children verbatim (e.g. for in-prose
 * mentions like "see this comparison"). Both forms render the same
 * popover. (PR-C3 design decision #13.)
 *
 * Trigger icon: presentational `ImageIcon` from `lucide-react`
 * (aria-hidden); the link text is the accessible name. (Decision
 * #13; ADR 0039 pedagogy-side Lucide adoption, third consumer.)
 *
 * Popover content (decision #5): lazy `<img>` thumbnail
 * (max ~12rem × 8rem) + caption text. Caption resolution:
 * `captionOverride` (per-usage) → `caption` (registry) → `name`
 * (fallback).
 *
 * On miss (registry OR canonical-usage missing): renders
 * `children` unchanged with no anchor / popover; dev-only
 * `console.warn` flags authoring drift. PR-C4's audit invariant
 * F-side elevates this to a build error.
 */
export function FigureRef({ name, children }: FigureRefProps) {
  const registry = lookupFigureRegistry(name);
  const canonical = lookupCanonicalUsageByName(name);
  // E2E hydration signal (followup #10): see useHydrated.ts and
  // GlossaryTerm.tsx for rationale.
  const hydrated = useHydrated();

  if (!registry || !canonical) {
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.warn(
        `[FigureRef] No registry/usages found for name "${name}". Rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  const href = `/chapters/${canonical.chapter}#${canonical.anchor}`;
  const linkText = children ?? `Fig. ${canonical.number}`;
  const caption =
    canonical.captionOverride ?? registry.caption ?? registry.name;

  return (
    <HoverCard.Root openDelay={150} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <a
          className={styles.trigger}
          data-react-hydrated={hydrated ? "true" : undefined}
          href={href}
        >
          {linkText}
          <ImageIcon
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
          data-sophie-figure-popover=''
          sideOffset={6}
        >
          <img
            alt={registry.alt}
            className={styles.thumb}
            loading='lazy'
            src={registry.src}
          />
          <figcaption className={styles.caption}>{caption}</figcaption>
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
