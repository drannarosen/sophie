import type { Plugin as VitePlugin } from "vite";

/**
 * Vite plugin — pre-parse `.mdx` author-trap lint.
 *
 * MDX has two opaque parse-error classes that produce confusing
 * acorn messages far from the author's intent. This plugin scans
 * raw `.mdx` text BEFORE MDX/acorn gets a chance to fail and emits
 * curated, file:line:col-anchored errors instead.
 *
 * Why a Vite `transform` hook rather than a remark plugin: both
 * traps cause MDX/acorn to fail at PARSE time. Remark plugins run
 * on the parsed mdast — if the parse fails, the remark plugin
 * never sees the source. The Vite `transform` hook with
 * `enforce: "pre"` sees raw text before MDX's transform fires,
 * which is the only point in the pipeline where we can intercept
 * cleanly.
 *
 * The two traps:
 *
 * 1. **Multi-line inline `$...$` math** (issue #190). When inline
 *    math wraps across a newline, `remark-math` does not recognize
 *    the span as math, so MDX parses the `{…}` inside (e.g.,
 *    `{(\mathrm{erg\,K^{-1}})}`) as a JSX expression — and acorn
 *    fails with "Could not parse expression with acorn / Expecting
 *    Unicode escape sequence" on the `\,`. Authoring rule: inline
 *    `$...$` must stay on a single line; use `$$...$$` for display
 *    math that wraps.
 *
 * 2. **Raw `<` before a non-letter** (issue #193). A literal `<`
 *    followed by anything that is not a letter, `/`, `!`, `?`, or
 *    whitespace makes MDX read the span as the start of a JSX
 *    tag — and acorn fails with "Unexpected character `3`
 *    (U+0033) before name" on a span like `<3,700`. Authoring
 *    rule: escape as `&lt;` (or wrap in math, e.g. `$<3{,}700$`).
 *
 * Both rules surfaced from the ADR 0064 chapter-migration pilots
 * (m3-l2 Surprise #1, m2-l2 Surprise #3). Documented in
 * `docs/website/reference/chapter-components.md` ("Authoring
 * traps" section).
 *
 * Plugin is `enforce: "pre"` so it sees the source ahead of
 * `@astrojs/mdx`'s transform.
 */
export function mdxAuthorTrapsVitePlugin(): VitePlugin {
  return {
    name: "sophie:mdx-author-traps",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".mdx")) return null;
      // Skip node_modules so dep-shipped .mdx (rare but possible)
      // isn't lint-gated by Sophie's authoring conventions.
      if (id.includes("/node_modules/")) return null;
      const findings = [
        ...findMultiLineInlineMath(code).map((f) => formatMultiLineMath(id, f)),
        ...findRawLessThanNonLetter(code).map((f) => formatRawLt(id, f)),
      ];
      if (findings.length === 0) return null;
      throw new Error(
        `[sophie:mdx-author-traps] found ${findings.length} authoring trap${
          findings.length === 1 ? "" : "s"
        }:\n\n${findings.join("\n\n")}`
      );
    },
  };
}

/* ────────────────────────────────────────────────────────────── */
/* Scanners (pure; exported for unit tests).                      */
/* ────────────────────────────────────────────────────────────── */

export interface SourceFinding {
  line: number;
  column: number;
  snippet: string;
}

/**
 * Find inline `$...$` math spans that cross a newline AND
 * contain a JSX-confusing `{...}` block — specifically one whose
 * content has a `\` immediately followed by a NON-letter
 * (`\,` thin-space, `\;` medium-space, `\!` negative-space,
 * `\\` etc.). This is the precise MDX/acorn failure mode: when
 * remark-math fails to recognize the span as math, MDX hands the
 * `{...}` to acorn as a JSX expression, and acorn fails with
 * "Expecting Unicode escape sequence" on the `\<non-letter>`.
 *
 * Multi-line `$...$` containing only `\<letter>` sequences inside
 * `{...}` (e.g., `\lambda_{\text{obs}}`, `\sqrt{(1+\beta)/(1-\beta)}`)
 * does NOT trip acorn — `\beta`, `\text`, etc. are valid JS
 * identifier characters after the backslash. So this scanner
 * deliberately under-reports rather than over-report on the
 * single-line-discipline convention.
 *
 * Skips `$$...$$` display math, escaped `\$`, and content inside
 * fenced code blocks (` ``` `) and inline code spans (`` ` ``).
 */
export function findMultiLineInlineMath(code: string): SourceFinding[] {
  const findings: SourceFinding[] = [];
  const masked = maskCodeRegions(code);
  let i = 0;
  let line = 1;
  let col = 1;
  while (i < masked.length) {
    const ch = masked[i];
    const next = masked[i + 1];
    // Skip $$...$$ display math entirely (the trap is inline-only).
    if (ch === "$" && next === "$") {
      const end = masked.indexOf("$$", i + 2);
      if (end < 0) break; // unbalanced display math — leave to MDX
      const span = masked.slice(i, end + 2);
      const newlines = span.split("\n").length - 1;
      if (newlines > 0) {
        line += newlines;
        const lastNl = span.lastIndexOf("\n");
        col = span.length - lastNl;
      } else {
        col += span.length;
      }
      i = end + 2;
      continue;
    }
    // Skip escaped \$
    if (ch === "\\" && next === "$") {
      i += 2;
      col += 2;
      continue;
    }
    // Single $: candidate inline-math open.
    if (ch === "$") {
      const openLine = line;
      const openCol = col;
      let j = i + 1;
      let crossedLine = false;
      let scanLine = line;
      let scanCol = col + 1;
      while (j < masked.length) {
        const cj = masked[j];
        const cn = masked[j + 1];
        if (cj === "\\" && cn === "$") {
          j += 2;
          scanCol += 2;
          continue;
        }
        if (cj === "$" && cn === "$") {
          // Hit a display-math marker without closing this span —
          // give up; not a clean inline open.
          break;
        }
        if (cj === "$") {
          if (crossedLine) {
            const spanContent = masked.slice(i + 1, j);
            if (hasAcornTrippingBraces(spanContent)) {
              findings.push({
                line: openLine,
                column: openCol,
                snippet: extractLineSnippet(code, openLine),
              });
            }
          }
          j += 1;
          // Advance state past close
          line = scanLine;
          col = scanCol + 1;
          break;
        }
        if (cj === "\n") {
          crossedLine = true;
          scanLine += 1;
          scanCol = 1;
        } else {
          scanCol += 1;
        }
        j += 1;
      }
      i = j;
      continue;
    }
    if (ch === "\n") {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
    i += 1;
  }
  return findings;
}

/**
 * Find raw `<` followed by anything that is not a letter (JSX tag
 * name start), `/` (JSX close tag), `!` (HTML comment), `?` (XML
 * declaration), whitespace, or `>` (empty match). Operates only
 * on text outside fenced code blocks and inline code spans (where
 * `<` is literal). One finding per offending occurrence.
 *
 * The intent matches MDX/acorn's actual failure mode: only `<`
 * followed by a non-letter/non-special character makes MDX try to
 * parse the span as JSX. `<` followed by whitespace is treated as
 * text by MDX, so we leave those alone.
 */
export function findRawLessThanNonLetter(code: string): SourceFinding[] {
  const findings: SourceFinding[] = [];
  const lines = code.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // Mask inline code spans (`...`) so `<3` inside backticks doesn't trip.
    const masked = line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
    const re = /<(?=[^a-zA-Z\s/!?>])/g;
    let m: RegExpExecArray | null = re.exec(masked);
    while (m !== null) {
      findings.push({
        line: i + 1,
        column: m.index + 1,
        snippet: line,
      });
      m = re.exec(masked);
    }
  }
  return findings;
}

/* ────────────────────────────────────────────────────────────── */
/* Helpers.                                                       */
/* ────────────────────────────────────────────────────────────── */

/**
 * Detect whether a `$...$` span body contains a `{...}` block that
 * would trip acorn if MDX hands it over as a JSX expression. The
 * specific failure: a backslash inside the braces followed by a
 * NON-letter (TeX spacing macros `\,` `\;` `\!` `\\`, `\#` `\$`
 * `\%` `\&` `\_` `\{` `\}`, etc.). When the `\` is followed by a
 * letter (`\beta`, `\mathrm`, `\text`), acorn reads it as an
 * identifier character and the parse succeeds.
 *
 * Conservative on purpose: even a brace block whose backslashes
 * are all letter-bound is left alone, because MDX/remark-math
 * empirically tolerates those across line breaks in the smoke
 * fixture's equation registry. This scanner targets only the
 * known-failure shape the M3-L2 pilot surfaced (issue #190).
 */
function hasAcornTrippingBraces(spanContent: string): boolean {
  const braceMatches = spanContent.matchAll(/\{[^}]*\}/g);
  for (const m of braceMatches) {
    if (/\\[^a-zA-Z]/.test(m[0])) return true;
  }
  return false;
}

/**
 * Mask out fenced-code blocks (` ``` ... ``` `) and inline code
 * spans (`` `...` ``) so the inline-math scanner doesn't false-
 * positive on `$` inside code. Replaces each region with spaces of
 * the same byte length so line/column counting stays correct.
 *
 * Frontmatter is also masked: the leading `---\n...\n---` block can
 * carry `$` characters (description strings) that aren't math, and
 * scanning them would false-positive.
 */
function maskCodeRegions(code: string): string {
  let out = code;
  // Frontmatter (leading `---\n...\n---`)
  out = out.replace(/^---\n[\s\S]*?\n---/, (m) => m.replace(/[^\n]/g, " "));
  // Fenced code blocks
  out = out.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, " "));
  // Inline code spans
  out = out.replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length));
  return out;
}

function extractLineSnippet(code: string, line: number): string {
  const lines = code.split("\n");
  return (lines[line - 1] ?? "").slice(0, 120);
}

function formatMultiLineMath(id: string, f: SourceFinding): string {
  return (
    `${id}:${f.line}:${f.column}\n` +
    `  Multi-line inline math \`$...$\` is not recognized by remark-math, ` +
    `and the unparsed \`{...}\` inside will fail acorn with an opaque ` +
    `"Expecting Unicode escape sequence" error.\n` +
    `  Fix: keep inline math on a single line, or use \`$$...$$\` for ` +
    `display math that wraps across lines.\n` +
    `  Snippet: ${f.snippet}`
  );
}

function formatRawLt(id: string, f: SourceFinding): string {
  return (
    `${id}:${f.line}:${f.column}\n` +
    `  Raw \`<\` before a non-letter character is parsed by MDX as the ` +
    `start of a JSX tag, and acorn fails with "Unexpected character before name".\n` +
    `  Fix: escape as \`&lt;\`, or wrap in math (e.g. \`$<3{,}700$\`).\n` +
    `  Snippet: ${f.snippet}`
  );
}
