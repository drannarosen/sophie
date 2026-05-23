import katex from "katex";

const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
}

/**
 * Render `$inline$` and `$$display$$` math segments inside a plain
 * string to KaTeX HTML. Non-math segments are HTML-escaped, then run
 * through `renderInlineMarkdown` to honor `**bold**` and `*italic*`
 * in author-controlled prop strings (figure captions, aside titles,
 * callout headings, etc.).
 *
 * Why this helper exists: MDX's remark-math chain runs on body content
 * (the unit's MDAST tree). JSX attribute values — `title=`,
 * `heading=`, `description=`, `label=`, `prompt=`, figure `caption=`
 * — are plain strings that bypass the markdown + math pipeline
 * entirely. Without this helper, math + bold in any of those props
 * round-trip to the browser as raw LaTeX/asterisks:
 *
 *   <Callout title="Worked Example — H$\alpha$" />
 *   <Figure caption="**What to notice:** the line at $656\,\text{nm}$" />
 *
 * render literal `$` and `**`. This helper processes both math and
 * inline markdown so authors can use familiar syntax in prop strings.
 *
 * The companion `<MathText>` component wraps this pattern when a JSX
 * span/div is the desired output shape.
 *
 * Returns the rich-text rendered HTML — math-free + bold-free strings
 * still pass through `renderInlineMarkdown` (cheap pass-through for
 * strings without `*`).
 */
export function renderTextWithMath(text: string): string {
  // Defensive guard: TS types say `text: string` but JSX consumers can
  // pass `undefined` / `null` from optional props (e.g. an empty
  // caption, a heading without text). Surface as empty string rather
  // than throwing — broken DOM should not crash the SSR pipeline.
  if (typeof text !== "string") return "";
  if (!text.includes("$")) {
    return renderInlineMarkdown(escapeHtml(text));
  }
  let result = "";
  let lastIndex = 0;
  for (const match of text.matchAll(MATH_RE)) {
    const start = match.index ?? 0;
    result += renderInlineMarkdown(escapeHtml(text.slice(lastIndex, start)));
    if (match[1] !== undefined) {
      result += katex.renderToString(match[1], {
        displayMode: true,
        throwOnError: false,
      });
    } else if (match[2] !== undefined) {
      result += katex.renderToString(match[2], {
        displayMode: false,
        throwOnError: false,
      });
    }
    lastIndex = start + match[0].length;
  }
  result += renderInlineMarkdown(escapeHtml(text.slice(lastIndex)));
  return result;
}

/**
 * Process inline markdown on already-HTML-escaped text. Handles
 * `**bold**` → `<strong>` and `*italic*` → `<em>` (markdown-style
 * — single asterisk is italic, double is bold, no underscore forms
 * because authors regularly want literal underscores in subscripts /
 * file paths). Operates on pre-escaped input so the regex `*` markers
 * are safely literal in the surrounding text.
 *
 * Bold processed before italic so `**bold**` doesn't get mis-parsed
 * as `*` + `bold` + `*` (italic) + leftover.
 */
function renderInlineMarkdown(escaped: string): string {
  if (!escaped.includes("*")) return escaped;
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
