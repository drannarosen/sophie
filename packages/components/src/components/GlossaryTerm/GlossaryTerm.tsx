import * as HoverCard from "@radix-ui/react-hover-card";
import { slugify } from "@sophie/core/schema";
import { BookOpen } from "lucide-react";
import { useHydrated } from "../../runtime/useHydrated.ts";
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
  // E2E hydration signal (followup #10): flips to "true" after
  // useEffect runs, so Playwright can wait on the trigger being
  // fully interactive before hovering. `networkidle` is unreliable
  // when Astro islands hydrate after the network goes quiet.
  const hydrated = useHydrated();

  if (!entry) {
    // Dev-only signal so authoring drift is visible. Production
    // pages stay silent — the bare-prose fallback degrades
    // gracefully. PR-C4's audit invariant #4 elevates this to
    // a build error.
    //
    // The `typeof document !== "undefined"` guard suppresses warnings
    // during Astro SSR (Node runtime, no `document`). In Astro dev
    // mode the chapter MDX's React-island SSR runs BEFORE
    // `TextbookLayout`'s `__setGlossaryDefinitions` setter fires, so
    // every valid slug would miss-and-warn on the server pass. The
    // client-side hydration path (script tag → store.set) runs before
    // the React island's first lookup on the browser, so warnings on
    // the client correspond to real authoring drift. Sprint K root-
    // cause diagnostic (2026-05-21).
    if (
      typeof document !== "undefined" &&
      (typeof process === "undefined" || process.env?.NODE_ENV !== "production")
    ) {
      console.warn(
        `[GlossaryTerm] No definition found for "${name}" (slug "${slug}"). Term is undefined; rendering bare prose.`
      );
    }
    return <>{children}</>;
  }

  // W2/D5 route shape: /units/<unit-id>/reading#<anchor>.
  // entry.unit holds the parent Unit id (W3 rename; under W2/D4
  // 1:1 the unit id equals the reading-artifact slug).
  const href = `/units/${entry.unit}/reading#${entry.anchor}`;

  return (
    <>
      <HoverCard.Root openDelay={150} closeDelay={120}>
        <HoverCard.Trigger asChild>
          <a
            className={styles.trigger}
            data-react-hydrated={hydrated ? "true" : undefined}
            href={href}
          >
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
 * Two passes:
 *   1. Strip a single outer `<p>…</p>` wrapper that markdown applies
 *      to a one-paragraph body. Multi-paragraph bodies (additional
 *      `<p>` open tags inside the wrapper) pass through unchanged so
 *      the popover-rendering path (`<div>` container) stays correct.
 *   2. Unwrap remaining block-level tags inside the body — most
 *      importantly the `<div>` that JSX-flow elements (like a nested
 *      `<GlossaryTerm>` callsite) render as during mdast→html
 *      serialization. Replaces `<div>…</div>` and `<p>…</p>` with
 *      their contents; the result is inline-safe HTML carrying only
 *      text, `<em>`, `<strong>`, `<a>`, KaTeX `<span>` trees, etc.
 *
 * Returns the input unchanged when both passes detect a multi-block
 * structure (rare but worth defending — if the body's structure is
 * load-bearing we keep it intact and accept the paragraph-split risk
 * rather than mangling content silently).
 */
function stripWrappingParagraph(html: string): string {
  const trimmed = html.trim();
  const match = trimmed.match(/^<p>([\s\S]*)<\/p>$/);
  if (!match?.[1]) return html;
  const innerHTML = match[1];
  // Defensive: bail when the body is multi-paragraph (additional `<p>`
  // open tags). Authoring would have to do something unusual to hit
  // this; leaving it alone is safer than reshaping unknown structure.
  if (/<p[\s>]/i.test(innerHTML)) return html;
  // Unwrap any remaining block-level tags. Covers the elements
  // mdast→html commonly emits inside a one-paragraph body:
  //   - `<div>` from JSX-flow elements (nested `<GlossaryTerm>` is
  //     the common case that triggered the post-fix verify pass).
  //   - `<section>` / `<article>` / `<figure>` from arbitrary nested
  //     blocks.
  //   - `<h1>`-`<h6>`, `<ul>` / `<ol>` / `<li>`, `<blockquote>`,
  //     `<pre>`, `<table>`, `<hr>` for defensive coverage — a
  //     definition body that contains any of these would otherwise
  //     reintroduce Bug 1's "inline ancestor `<p>` auto-closes"
  //     failure mode on the chapter prose path. Realistic? Low —
  //     definitions are short — but the extra cost is one regex
  //     character class.
  // Repeated until stable so nested blocks unwrap fully.
  let unwrapped = innerHTML;
  let prev: string;
  do {
    prev = unwrapped;
    unwrapped = unwrapped.replace(
      /<(div|section|article|figure|h[1-6]|ul|ol|li|blockquote|pre|table)\b[^>]*>([\s\S]*?)<\/\1>/gi,
      "$2"
    );
  } while (unwrapped !== prev);
  // `<hr>` is void (no closing tag); strip it separately.
  unwrapped = unwrapped.replace(/<hr\b[^>]*\/?>/gi, "");
  return unwrapped;
}
