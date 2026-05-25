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
  // Hydration-gate (Phase 1.5 class fix, 2026-05-25). Same shape as
  // GlossaryTerm + KeyEquation + EquationRef: packed-copy consumers
  // populate the figure stores AFTER island SSR, so reading at render-
  // time produces a different tree on SSR vs. client → React #418.
  // Gating on `useHydrated` forces SSR + first client render to emit
  // bare children; the full anchor + HoverCard appears post-mount.
  // The same hook drives the e2e hydration signal (followup #10).
  const hydrated = useHydrated();
  if (!hydrated) {
    return <>{children}</>;
  }

  if (!registry || !canonical) {
    // SSR-pass-tolerant warning — same Sprint K pattern as
    // GlossaryTerm / EquationRef. Astro dev SSR ordering means the
    // figure-registry / figure-usages stores aren't populated when
    // chapter MDX renders server-side. Suppress SSR warning so only
    // client-side real misses surface in dev console.
    if (
      typeof document !== "undefined" &&
      (typeof process === "undefined" || process.env?.NODE_ENV !== "production")
    ) {
      console.warn(
        `[FigureRef] No registry/usages found for name "${name}". Rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  // W2/D5 route shape: /units/<unit-id>/reading#<anchor>.
  // canonical.unit holds the parent Unit id (W3 rename; under W2/D4
  // 1:1 the unit id equals the reading-artifact slug).
  const href = `/units/${canonical.unit}/reading#${canonical.anchor}`;
  // Sprint F — prefer "Fig. C.N" when the chapter declares a display
  // chapter number; fall back to within-chapter "Fig. N" otherwise.
  const figLabel =
    canonical.chapterNumber !== undefined
      ? `Fig. ${canonical.chapterNumber}.${canonical.number}`
      : `Fig. ${canonical.number}`;
  const linkText = children ?? figLabel;
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
