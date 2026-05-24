import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import styles from "./Card.module.css.js";
import type { CardProps } from "./Card.schema.ts";

function CardHeader({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <header className={styles.header} {...(id !== undefined ? { id } : {})}>
      {children}
    </header>
  );
}

function CardFooter({ children }: { children: ReactNode }) {
  return <footer className={styles.footer}>{children}</footer>;
}

function CardBase({ title, id, className, children }: CardProps) {
  const titleId = useId();

  // Slot extraction: walk children once; pull out the Card.Header and
  // Card.Footer slots by component-identity; everything else is body.
  // Per Q3 lock, when both `title` and `Card.Header` are provided, the
  // slot wins (auto-generated header is suppressed).
  const items = Children.toArray(children);
  const headerSlot = items.find(
    (c) => isValidElement(c) && c.type === CardHeader
  );
  const footerSlot = items.find(
    (c) => isValidElement(c) && c.type === CardFooter
  );
  const body = items.filter(
    (c) =>
      !isValidElement(c) || (c.type !== CardHeader && c.type !== CardFooter)
  );

  const hasHeader = Boolean(headerSlot || title);
  const rootClassName = [styles.card, className].filter(Boolean).join(" ");

  // R10 landmark choice: when this card has a header (slot OR title),
  // the root becomes `<section aria-labelledby>` so screen-reader
  // landmark navigation can announce the card's name. Without a header
  // a card is decorative grouping only — plain `<div>` keeps it out of
  // the landmark inventory and avoids a nameless landmark axe-violation.
  if (hasHeader) {
    const renderedHeader = isValidElement(headerSlot) ? (
      cloneElement(headerSlot as ReactElement<{ id?: string }>, {
        id: titleId,
      })
    ) : (
      <header id={titleId} className={styles.header}>
        {title}
      </header>
    );

    return (
      <section
        aria-labelledby={titleId}
        className={rootClassName}
        {...(id !== undefined ? { id } : {})}
      >
        {renderedHeader}
        <div className={styles.body}>{body}</div>
        {footerSlot}
      </section>
    );
  }

  return (
    <div className={rootClassName} {...(id !== undefined ? { id } : {})}>
      <div className={styles.body}>{body}</div>
      {footerSlot}
    </div>
  );
}

/**
 * Compound component export — `Card.Header` and `Card.Footer` slots are
 * matched by component-identity in `CardBase`'s child walker.
 */
export const Card = Object.assign(CardBase, {
  Header: CardHeader,
  Footer: CardFooter,
});
