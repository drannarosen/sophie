import * as HoverCard from "@radix-ui/react-hover-card";
import { BookMarked } from "lucide-react";
import { artifactStore } from "../../runtime/artifacts-store.ts";
import { sectionStore } from "../../runtime/sections-store.ts";
import { unitStore } from "../../runtime/units-store.ts";
import { useHydrated } from "../../runtime/useHydrated.ts";
import styles from "./ChapterRef.module.css.js";
import type { ChapterRefProps } from "./ChapterRef.schema.ts";

/**
 * `<ChapterRef chapter="..." />` or `<ChapterRef chapter="...">custom text</ChapterRef>`
 * — the chapter analog of `<GlossaryTerm>` / `<EquationRef>` /
 * `<FigureRef>`. Inline cross-reference to a reading-shape artifact;
 * renders an inline anchor whose HoverCard exposes a three-line preview
 * (section breadcrumb + unit title + optional description).
 *
 * W2/D3 graduation: the lookup chain reads from the W2 stores
 * `artifactStore → unitStore → sectionStore` (was `chapterStore` +
 * `moduleStore` pre-W2). Per W2/D4 1:1 convention, the `chapter` prop
 * value equals both the ArtifactEntry id and the parent UnitEntry id.
 *
 * Trigger text: when `children` is omitted, renders the unit title
 * (chapters reference *concepts* named by title, not *positions*
 * numbered for in-prose lookup). When `children` is provided, renders
 * the children verbatim. Both forms render the same popover.
 *
 * Trigger icon: presentational `BookMarked` from `lucide-react`
 * (aria-hidden); the link text is the accessible name. `BookMarked`
 * (rather than `BookOpen` — used by `<GlossaryTerm>`) so the two
 * book-themed inline refs are visually distinguishable side-by-side.
 *
 * On miss (no matching artifact): renders `children ?? chapter` as bare
 * text with no anchor / popover; dev-only `console.warn` flags
 * authoring drift. The audit invariant C1 elevates this to a build
 * error.
 */
export function ChapterRef({ chapter, children }: ChapterRefProps) {
  const artifact = artifactStore.lookup(chapter);
  const unit =
    artifact && artifact.scope === "unit" && artifact.unit_id
      ? unitStore.lookup(artifact.unit_id)
      : undefined;
  const section = unit ? sectionStore.lookup(unit.section_id) : undefined;
  // Hydration-gate (Phase 1.5 class fix, 2026-05-25). Same shape as
  // GlossaryTerm + KeyEquation + EquationRef + FigureRef: packed-copy
  // consumers populate the artifact/unit/section stores AFTER island
  // SSR, so reading at render-time produces a different tree on SSR
  // vs. client → React #418. Gating on `useHydrated` forces SSR +
  // first client render to emit `<>{children ?? chapter}</>`
  // regardless of store state; the full anchor + HoverCard appears
  // post-mount. The same hook drives the e2e hydration signal.
  const hydrated = useHydrated();
  if (!hydrated) {
    return <>{children ?? chapter}</>;
  }

  if (!artifact || !unit) {
    // Dev-only authoring-drift warning. Post-gate → always client (ADR 0038 § A2.2).
    if (process.env?.NODE_ENV !== "production") {
      console.warn(
        `[ChapterRef] No reading artifact found for chapter "${chapter}". Rendering bare prose.`
      );
    }
    return <>{children ?? chapter}</>;
  }

  const href = `/units/${chapter}/reading`;
  const linkText = children ?? unit.title;

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
          {section ? (
            <p className={styles.breadcrumb}>{section.title}</p>
          ) : null}
          <strong className={styles.title}>{unit.title}</strong>
          {unit.description ? (
            <p className={styles.description}>{unit.description}</p>
          ) : null}
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
