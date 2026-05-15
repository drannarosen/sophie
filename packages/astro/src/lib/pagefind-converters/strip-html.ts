/**
 * Strip HTML tags from a pre-rendered chapter-content string.
 *
 * Used by Pagefind converters that read entity `body` fields, which
 * carry pre-rendered HTML per schema docstrings in
 * `@sophie/core/schema/pedagogy-index.ts`. Pagefind's `addCustomRecord`
 * tokenizes the `content` string as-is — unlike the default HTML crawl
 * (`index.addDirectory`), there's no implicit HTML-aware extraction
 * stage. Sending raw HTML pollutes the index with tag-name and class-
 * name tokens (KaTeX spans alone produce dozens per equation) and
 * degrades BM25 ranking precision.
 *
 * Simple-regex strip — replaces every <...> with a space to prevent
 * cross-tag word-merging, then collapses runs of whitespace. Doesn't
 * decode HTML entities; entities in chapter prose are rare and won't
 * meaningfully affect search recall.
 *
 * Mandated by design doc §1 + §6.1.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
