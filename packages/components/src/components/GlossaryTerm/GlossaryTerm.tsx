import * as HoverCard from "@radix-ui/react-hover-card";
import { slugify } from "@sophie/core/schema";
import { BookOpen } from "lucide-react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import { withBase } from "../../utils/with-base.ts";
import { lookupDefinition } from "./definitions-store.ts";
import styles from "./GlossaryTerm.module.css.js";
import type { GlossaryTermProps } from "./GlossaryTerm.schema.ts";

/**
 * Component-local props extension: the build-time
 * `markFirstUseGlossaryTerms` remark pass (PR 10) annotates the
 * first `<GlossaryTerm>` per slug per chapter with
 * `data-first-use="true"`. React 19 passes `data-*` attributes
 * through to the DOM without warnings; we read it here to drive
 * the inline footnote render consumed under @media print.
 */
type GlossaryTermRuntimeProps = GlossaryTermProps & {
  "data-first-use"?: string;
};

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
 *     anchor href = `/units/<chapter>/reading#<anchor>` (W2/D5
 *     route shape; the per-callsite `chapter` field stays — W3
 *     renames the field to `unit`); popover content shows the
 *     entry's `term` + body HTML.
 *   - On miss (no matching entry): renders children as plain
 *     prose, no anchor, no popover. PR-C1 emits a `console.warn`
 *     so authoring drift surfaces in dev; PR-C4's audit invariant
 *     #4 elevates this to a build error.
 *   - Trigger carries a presentational Lucide `BookOpen` icon
 *     (`aria-hidden`); the anchor text is the accessible name.
 */
export function GlossaryTerm({
  name,
  children,
  "data-first-use": dataFirstUse,
}: GlossaryTermRuntimeProps) {
  const slug = slugify(name);
  const entry = lookupDefinition(slug);
  // Hydration-gate (Phase 1.5 evidence, 2026-05-25). Packed-copy
  // consumers (e.g. astr201) populate the pedagogy store AFTER island
  // SSR — the server pass sees an empty store and emits the bare
  // fallback, while the client's first render sees the script-tag-
  // auto-hydrated store and emits the full <a>+popover tree. Same
  // component, two tree shapes → React #418. Gating render on
  // `useHydrated` forces SSR + first client render to emit only bare
  // children regardless of store state; the full tree appears once
  // the mount-effect flips the gate. The same hook drives the e2e
  // hydration signal (followup #10) on the post-hydration anchor.
  const hydrated = useHydrated();
  if (!hydrated) {
    return <>{children}</>;
  }

  if (!entry) {
    // Dev-only authoring-drift warning. Post-gate → always client (ADR 0038 § A2.2).
    if (process.env?.NODE_ENV !== "production") {
      console.warn(
        `[GlossaryTerm] No definition found for "${name}" (slug "${slug}"). Term is undefined; rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  // W2/D5 route shape: /units/<unit-id>/reading#<anchor>.
  // entry.unit holds the parent Unit id (W3 rename; under W2/D4
  // 1:1 the unit id equals the reading-artifact slug).
  const href = withBase(`/units/${entry.unit}/reading#${entry.anchor}`);

  return (
    <>
      <HoverCard.Root openDelay={150} closeDelay={120}>
        <HoverCard.Trigger asChild>
          <a className={styles.trigger} data-react-hydrated='true' href={href}>
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
      {dataFirstUse === "true" ? (
        // Strip the outer `<p>…</p>` from the body before injecting
        // (see `stripWrappingParagraph` below). The footnote `<span>`
        // is INLINE — it sits inside the chapter's MDX paragraph.
        // A block-level `<p>` inside an inline element triggers
        // HTML5's "implied end tag" rule (the browser auto-closes
        // the outer `<p>` and hoists the inner `<p>` out of the
        // parent, splitting the surrounding sentence across multiple
        // top-level paragraphs). Stripping the wrapper keeps the body
        // as inline-safe HTML so the span stays in flow. The popover
        // above keeps the wrapping `<p>` because its container is a
        // `<div>` (block).
        <span
          className={`${styles.glossaryFootnote} sophie-glossary-footnote`}
          data-testid='glossary-footnote'
          // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML produced by our remark plugin (mdast → hast → html), not user-supplied content. ADR 0038 decision #11.
          dangerouslySetInnerHTML={{
            __html: stripWrappingParagraph(entry.body),
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Make a markdown-rendered HTML body safe to inject into an INLINE
 * context — the footnote `<span>` sits inside the chapter's MDX
 * `<p>`, so any block-level child triggers HTML5's "implied end tag"
 * rule and the browser hoists the block out of the parent paragraph,
 * splitting the surrounding sentence across multiple top-level
 * paragraphs.
 *
 * Strengthened in ADR 0038 Amendment 2 follow-up (2026-05-25): under
 * the `useHydrated` gate, footnote HTML is injected via
 * `innerHTML = ...` on the client (not via the SSR document parser).
 * The HTML5 *fragment* parsing algorithm used by `innerHTML` does NOT
 * hoist block children out of an inline `<span>` the way the
 * *document* parser does at SSR-page-load time — so multi-block
 * bodies that used to be incidentally hidden by document-time
 * hoisting now stay inside the span and break prose integrity. The
 * function now flattens multi-block bodies (multi-paragraph + sibling
 * block structures) to inline-safe HTML instead of bailing.
 *
 * Algorithm (two phases):
 *   1. *Selecting the content to flatten*:
 *      - Single outer `<p>…</p>` wrap with no nested `<p>`: use the
 *        inner content (preserves the original behavior for the
 *        common one-paragraph case).
 *      - Anything else (multi-`<p>`, `<p>` + sibling `<ol>`/`<ul>`,
 *        already-inline, etc.): use the entire trimmed input.
 *        `<p>` and `</p>` are replaced with single spaces so sentence
 *        boundaries become flowing whitespace.
 *   2. *Stripping block tags*: replace `<div>`, `<section>`,
 *      `<article>`, `<figure>`, `<h1>`-`<h6>`, `<ul>`/`<ol>`/`<li>`,
 *      `<blockquote>`, `<pre>`, `<table>`, `<hr>` with their inner
 *      content surrounded by single spaces, repeatedly until stable
 *      (handles nested blocks). Trailing whitespace is collapsed.
 *
 * Output is inline-safe HTML carrying only text, `<em>`, `<strong>`,
 * `<a>`, KaTeX `<span>` trees, etc. List semantics (numbering,
 * bullets) are lost; multi-paragraph boundaries collapse to spaces.
 * Authors who need to preserve list/paragraph structure should use
 * the popover (full markup, `<div>` container) and keep the inline
 * footnote text short.
 */
function stripWrappingParagraph(html: string): string {
  const trimmed = html.trim();
  // Phase 1 — pick the content stream.
  let content: string;
  const wrapMatch = trimmed.match(/^<p>([\s\S]*)<\/p>$/);
  if (wrapMatch?.[1] && !/<p[\s>]/i.test(wrapMatch[1])) {
    // Common case: single outer <p>…</p>, no nested <p>. Use inner content.
    content = wrapMatch[1];
  } else {
    // Multi-block case: strip all <p>/</p> from anywhere; the surrounding
    // whitespace (often a "\n" between siblings in markdown-emitted HTML)
    // becomes the inter-paragraph separator that Phase 2 collapses.
    content = trimmed.replace(/<\/?p[^>]*>/gi, " ");
  }
  // Phase 2 — strip block tags, repeatedly until stable.
  let unwrapped = content;
  let prev: string;
  do {
    prev = unwrapped;
    unwrapped = unwrapped.replace(
      /<(div|section|article|figure|h[1-6]|ul|ol|li|blockquote|pre|table)\b[^>]*>([\s\S]*?)<\/\1>/gi,
      " $2 "
    );
  } while (unwrapped !== prev);
  // `<hr>` is void (no closing tag); strip it separately.
  unwrapped = unwrapped.replace(/<hr\b[^>]*\/?>/gi, " ");
  // Collapse runs of whitespace introduced by the separators.
  return unwrapped.replace(/\s+/g, " ").trim();
}
