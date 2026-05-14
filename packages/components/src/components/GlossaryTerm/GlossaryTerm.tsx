import * as Popover from "@radix-ui/react-popover";
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
    if (typeof console !== "undefined") {
      console.warn(
        `[GlossaryTerm] No definition found for "${name}" (slug "${slug}"). Term is undefined; rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  const href = `/chapters/${entry.chapter}#${entry.anchor}`;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <a className={styles.trigger} href={href}>
          {children}
          <BookOpen
            aria-hidden
            className={styles.icon}
            focusable={false}
            size={12}
          />
        </a>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
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
          <Popover.Arrow className={styles.arrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
