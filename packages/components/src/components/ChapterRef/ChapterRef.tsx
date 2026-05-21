import * as HoverCard from "@radix-ui/react-hover-card";
import { BookMarked } from "lucide-react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import styles from "./ChapterRef.module.css.js";
import type { ChapterRefProps } from "./ChapterRef.schema.ts";
import { chapterStore } from "./chapters-store.ts";
import { moduleStore } from "./modules-store.ts";

/**
 * `<ChapterRef slug="..." />` or `<ChapterRef slug="...">custom text</ChapterRef>`
 * — the chapter analog of `<GlossaryTerm>` / `<EquationRef>` /
 * `<FigureRef>`. PR-C4 first instance of the inline chapter
 * cross-reference. Renders an inline anchor; HoverCard exposes a
 * three-line preview card (module breadcrumb + chapter title +
 * optional description, per PR-C4 brainstorm Q2).
 *
 * Trigger text: when `children` is omitted, renders the chapter
 * title (per PR-C4 brainstorm Q6 — diverges from EquationRef / FigureRef
 * ordinal-by-default because chapters reference *concepts* named by
 * title, not *positions* numbered for in-prose lookup). When
 * `children` is provided, renders the children verbatim (e.g. for
 * in-prose mentions like "the pressure-gravity balance"). Both forms
 * render the same popover (PR-C4 brainstorm Q8 — dual-mode parity
 * with EquationRef / FigureRef).
 *
 * Trigger icon: presentational `BookMarked` from `lucide-react`
 * (aria-hidden); the link text is the accessible name. `BookMarked`
 * (rather than `BookOpen` — used by `<GlossaryTerm>`) so the two
 * book-themed inline refs are visually distinguishable side-by-side.
 * ADR 0039 pedagogy-side Lucide adoption, fourth consumer.
 *
 * On miss (no matching chapter): renders `children ?? slug` as bare
 * text with no anchor / popover; dev-only `console.warn` flags
 * authoring drift. PR-C4's audit invariant C1 elevates this to a
 * build error.
 */
export function ChapterRef({ slug, children }: ChapterRefProps) {
  const chapter = chapterStore.lookup(slug);
  const module = chapter ? moduleStore.lookup(chapter.module) : undefined;
  // E2E hydration signal (followup #10): see useHydrated.ts and
  // GlossaryTerm.tsx for rationale.
  const hydrated = useHydrated();

  if (!chapter) {
    // Dev-only signal so authoring drift is visible. Production
    // pages stay silent — the bare-prose fallback degrades
    // gracefully. PR-C4's audit invariant C1 elevates this to a
    // build error.
    // SSR-pass-tolerant warning — same Sprint K pattern as
    // GlossaryTerm / EquationRef / FigureRef. Astro dev SSR ordering
    // means the chapters/modules stores aren't populated when chapter
    // MDX renders server-side. Suppress SSR warning so only
    // client-side real misses surface in dev console.
    if (
      typeof document !== "undefined" &&
      (typeof process === "undefined" || process.env?.NODE_ENV !== "production")
    ) {
      console.warn(
        `[ChapterRef] No chapter found for slug "${slug}". Rendering bare prose.`
      );
    }
    return <>{children ?? slug}</>;
  }

  const href = `/chapters/${slug}`;
  const linkText = children ?? chapter.title;

  return (
    <HoverCard.Root openDelay={150} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <a
          className={styles.trigger}
          data-react-hydrated={hydrated ? "true" : undefined}
          href={href}
        >
          {linkText}
          <BookMarked
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
          data-sophie-chapter-popover=''
          sideOffset={6}
        >
          {module ? <p className={styles.breadcrumb}>{module.title}</p> : null}
          <strong className={styles.title}>{chapter.title}</strong>
          {chapter.description ? (
            <p className={styles.description}>{chapter.description}</p>
          ) : null}
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
