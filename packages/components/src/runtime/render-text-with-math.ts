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
 * string to KaTeX HTML. Non-math segments are HTML-escaped.
 *
 * Why this helper exists: MDX's remark-math chain runs on body content
 * (the chapter's MDAST tree). JSX attribute values — `title=`,
 * `heading=`, `description=`, `label=`, `prompt=` — are plain strings
 * that bypass the math pipeline entirely. Without this helper, math in
 * any of those props round-trips to the browser as raw LaTeX:
 *
 *   <Callout title="Worked Example — H$\alpha$" />
 *
 * renders the title as literal `H$\alpha$` text. Components that accept
 * author math in string props should call this helper and dangerously
 * set inner HTML on the rendered output.
 *
 * The companion `<MathText>` component wraps this pattern when a JSX
 * span/div is the desired output shape.
 *
 * Returns HTML-escaped text unchanged when no `$` is detected — no
 * KaTeX markup added in the math-free common case.
 */
export function renderTextWithMath(text: string): string {
  if (!text.includes("$")) {
    return escapeHtml(text);
  }
  let result = "";
  let lastIndex = 0;
  for (const match of text.matchAll(MATH_RE)) {
    const start = match.index ?? 0;
    result += escapeHtml(text.slice(lastIndex, start));
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
  result += escapeHtml(text.slice(lastIndex));
  return result;
}
