import * as Collapsible from "@radix-ui/react-collapsible";
import { useCallback } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./CollapsibleCard.module.css.js";
import type { CollapsibleCardProps } from "./CollapsibleCard.schema.ts";

/**
 * Persistence-bearing disclosure widget for the "Deep Dive" pattern.
 * Closed on first read; per-instance open/closed state persists via
 * `useInteractive`. Spreads `controlProps` per coding-standards
 * "Persistence-bearing controls" so clicks landing before IDB
 * hydration cannot toggle into a state about to be overwritten.
 *
 * Built on Radix Collapsible (ADR 0019). Required course/chapter/id
 * props per ADR 0027; use with `client:load` in MDX.
 */
export function CollapsibleCard({
  course,
  chapter,
  id,
  title,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) {
  const {
    value: open,
    setValue: setOpen,
    hydrated,
    controlProps,
  } = useInteractive<boolean>(
    course,
    chapter,
    `collapsible-card:${id}:open`,
    defaultOpen
  );

  // Escape closes an open card (ARIA APG disclosure-widget convention).
  // Radix Collapsible doesn't bind Escape itself, so we add it on the
  // Root. Closed → noop; open → setOpen(false).
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    },
    [open, setOpen]
  );

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={styles.card}
      onKeyDown={handleKeyDown}
    >
      <Collapsible.Trigger {...controlProps} className={styles.trigger}>
        <span className={styles.chevron} aria-hidden='true' />
        <span className={styles.title}>{title}</span>
      </Collapsible.Trigger>
      <Collapsible.Content className={styles.content}>
        {children}
      </Collapsible.Content>
      <HydrationAnnouncer hydrated={hydrated} label={`${title} ready`} />
    </Collapsible.Root>
  );
}
