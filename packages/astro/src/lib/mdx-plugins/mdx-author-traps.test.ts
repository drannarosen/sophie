import { describe, expect, test } from "vitest";
import {
  findMultiLineInlineMath,
  findRawLessThanNonLetter,
  mdxAuthorTrapsVitePlugin,
} from "./mdx-author-traps.ts";

/**
 * Synthetic MDX strings exercise the pure scanner functions; the
 * Vite plugin wrapper is tested with a minimal context shim so the
 * "throws on `.mdx`, passes on other ids" contract is checked.
 *
 * Snippet contents in error messages aren't asserted character-for-
 * character — `formatMultiLineMath` and `formatRawLt` wording is
 * left out of the regex matchers so future copy edits don't churn
 * the tests.
 */

describe("findMultiLineInlineMath", () => {
  test("single-line inline math passes (no finding)", () => {
    expect(findMultiLineInlineMath("$x + 1$ is the answer.")).toEqual([]);
  });

  test("multi-line inline math with acorn-tripping `\\,` in braces is flagged", () => {
    // The pilot's actual failure mode: `\,` (backslash + non-letter)
    // inside `{...}` is what acorn rejects ("Expecting Unicode escape sequence").
    const code = `Some prose with $\\mathrm{erg\\,K^{-1}}\n{(\\,)}$ wrapped.`;
    const findings = findMultiLineInlineMath(code);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 1, column: 17 });
  });

  test("multi-line inline math with only letter-bound `\\<word>{...}` is NOT flagged", () => {
    // Empirically tolerated by MDX/remark-math: `\text{obs}`, `\lambda_{0}`,
    // `\sqrt{(1+\\beta)}` etc. across line breaks build clean against the
    // smoke fixture's equation registry. Scanner deliberately under-reports
    // on the convention so it doesn't false-positive on working content.
    const code = `Wave: $\\lambda_{\\text{obs}} = \\lambda_0\n + v_r \\tau_0$ rearranged.`;
    expect(findMultiLineInlineMath(code)).toEqual([]);
  });

  test("display math `$$...$$` spanning multiple lines is allowed", () => {
    const code = `Display math:\n\n$$\n\\dfrac{a}{b}\n$$\n\nDone.`;
    expect(findMultiLineInlineMath(code)).toEqual([]);
  });

  test("escaped `\\$` is not treated as a math marker", () => {
    expect(findMultiLineInlineMath("Price is \\$5 today.")).toEqual([]);
  });

  test("`$...$`-looking spans inside inline code are masked (no false-positive)", () => {
    // MDX inline code is single-line by design; `$foo` inside backticks
    // is masked by the scanner so it never looks like multi-line math.
    expect(
      findMultiLineInlineMath("Run `echo $foo` and `echo $bar` in shell.")
    ).toEqual([]);
  });

  test("inline math inside a fenced code block is ignored", () => {
    const code = "```bash\necho $foo\n$bar\n```\n\nDone.";
    expect(findMultiLineInlineMath(code)).toEqual([]);
  });

  test("frontmatter `$` characters are masked (no false-positive)", () => {
    const code = `---\ndescription: "Quote with \\$5\\nand more."\n---\n\nReal $x$ math.\n`;
    expect(findMultiLineInlineMath(code)).toEqual([]);
  });

  test("reports column position relative to the opening `$` of the offending span", () => {
    const code = `Line one is fine.\n\nLine 3 has $\\frac{a}\n{\\, b}$ broken.`;
    const findings = findMultiLineInlineMath(code);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 3, column: 12 });
  });
});

describe("findRawLessThanNonLetter", () => {
  test("plain prose with no `<` passes", () => {
    expect(findRawLessThanNonLetter("Hello world, no angle brackets.")).toEqual(
      []
    );
  });

  test("`<3,700` in prose is flagged", () => {
    const code = "OBAFGKM table cell says <3,700 K here.";
    const findings = findRawLessThanNonLetter(code);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 1, column: 25 });
  });

  test("JSX-like `<Foo>` is allowed", () => {
    expect(findRawLessThanNonLetter("<Foo />\nand <Bar prop=baz>")).toEqual([]);
  });

  test("`</close>` JSX close-tag is allowed", () => {
    expect(findRawLessThanNonLetter("</Foo>")).toEqual([]);
  });

  test("HTML comment `<!-- ... -->` is allowed", () => {
    expect(findRawLessThanNonLetter("<!-- aside note -->")).toEqual([]);
  });

  test("`< 3` with space after `<` is allowed (MDX treats as text)", () => {
    expect(findRawLessThanNonLetter("Quantity is < 3 in this case.")).toEqual(
      []
    );
  });

  test("`<3` inside an inline code span is allowed", () => {
    expect(findRawLessThanNonLetter("Run `echo <3,700 hi` to test.")).toEqual(
      []
    );
  });

  test("`<3` inside a fenced code block is allowed", () => {
    const code = "```text\n<3,700 K (table)\n```\n";
    expect(findRawLessThanNonLetter(code)).toEqual([]);
  });

  test("multiple offences across different lines all reported", () => {
    const code = "Cell A says <3,700 K.\n\nCell B says <2,500 K too.";
    const findings = findRawLessThanNonLetter(code);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({ line: 1, column: 13 });
    expect(findings[1]).toMatchObject({ line: 3, column: 13 });
  });
});

describe("mdxAuthorTrapsVitePlugin", () => {
  type TransformResult =
    | string
    | null
    | { code: string; map?: unknown }
    | undefined;
  type TransformFn = (code: string, id: string) => TransformResult;

  function callTransform(code: string, id: string): TransformResult {
    const plugin = mdxAuthorTrapsVitePlugin();
    const handler = plugin.transform as
      | TransformFn
      | { handler: TransformFn }
      | undefined;
    if (typeof handler === "function") return handler(code, id);
    if (handler && typeof handler.handler === "function")
      return handler.handler(code, id);
    throw new Error("Plugin missing transform handler");
  }

  test("non-.mdx ids are skipped (returns null)", () => {
    expect(callTransform("anything goes", "/foo/bar.ts")).toBeNull();
  });

  test("`.mdx` files inside node_modules are skipped", () => {
    expect(
      callTransform("Bad <3 stuff.", "/repo/node_modules/dep/chapter.mdx")
    ).toBeNull();
  });

  test("clean `.mdx` returns null (passthrough)", () => {
    const code = "# Title\n\nProse with $E = mc^2$ inline math.\n";
    expect(callTransform(code, "/repo/src/content/foo.mdx")).toBeNull();
  });

  test("offending `.mdx` throws with curated error containing file path + line:col", () => {
    const code = "Cell says <3,700 K here.";
    expect(() => callTransform(code, "/repo/src/content/foo.mdx")).toThrowError(
      /foo\.mdx:1:11/
    );
  });

  test("error message mentions both traps when both are present", () => {
    const code = "Multi-line $\\mathrm{a}\n{\\, b}$ + bad <3 cell.";
    let err: unknown;
    try {
      callTransform(code, "/repo/src/content/foo.mdx");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    const msg = (err as Error).message;
    expect(msg).toMatch(/2 authoring traps/);
    expect(msg).toMatch(/Multi-line inline math/);
    expect(msg).toMatch(/Raw `<` before a non-letter/);
  });
});
