import * as HoverCard from "@radix-ui/react-hover-card";
import { slugify } from "@sophie/core/schema";
import { BookOpen } from "lucide-react";
import { lookupDefinition } from "./definitions-store.ts";
import styles from "./GlossaryTerm.module.css.js";
import type { GlossaryTermProps } from "./GlossaryTerm.schema.ts";

/**
 * `<GlossaryTerm name="...">term</GlossaryTerm>` — first PR-C1
 * pedagogy-side consumer of the build-time pedagogy index (ADR
 * 0038) and of the `lucide-react` adapter (ADR 0039). Renders as
 * an inline anchor wrapping the prose children, with a hover-/
 * focus-/click-triggered Popover (Radix) exposing the canonical
 * definition body.
 *
 * Behaviour:
 *   - Looks up `slugify(name)` in `definitions-store`. On hit:
 *     anchor href = `/chapters/<chapter>#<anchor>`; popover
 *     content shows the entry's `term` + body HTML.
 *   - On miss (no matching entry): renders children as plain
 *     prose, no anchor, no popover. PR-C1 emits a `console.warn`
 *     so authoring drift surfaces in dev; PR-C4's audit invariant
 *     #4 elevates this to a build error.
 *   - Trigger carries a presentational Lucide `BookOpen` icon
 *     (`aria-hidden`); the anchor text is the accessible name.
 */
export function GlossaryTerm({ name, children }: GlossaryTermProps) {
  const slug = slugify(name);
  const entry = lookupDefinition(slug);

  if (!entry) {
    // Dev-only signal so authoring drift is visible. Production
    // pages stay silent — the bare-prose fallback degrades
    // gracefully. PR-C4's audit invariant #4 elevates this to
    // a build error.
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.warn(
        `[GlossaryTerm] No definition found for "${name}" (slug "${slug}"). Term is undefined; rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  const href = `/chapters/${entry.chapter}#${entry.anchor}`;

  return (
    <HoverCard.Root openDelay={150} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <a className={styles.trigger} href={href}>
          {children}
          <BookOpen
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
          data-sophie-glossary-popover=''
          sideOffset={6}
        >
          <strong className={styles.term}>{entry.term}</strong>
          <div
            className={styles.body}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML produced by our remark plugin (mdast → hast → html), not user-supplied content. ADR 0038 decision #11.
            dangerouslySetInnerHTML={{ __html: entry.body }}
          />
          <HoverCard.Arrow className={styles.arrow} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
