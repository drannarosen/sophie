import { compile } from "@mdx-js/mdx";
import { describe, expect, test } from "vitest";
import {
  pedagogyIndexRemarkPlugin,
  resetIndexAccumulator,
} from "./pedagogy-index-extractor.ts";

/**
 * Layer 1.6 — MDX-compile round-trip. See design doc §4 + §2's pitfall
 * callout.
 *
 * Why this layer exists: Layer 1 unit tests assert the mdast mutation
 * shape (children emptied, `objectives` attribute appended with a JSON
 * string). Layer 1.5 snapshots the mutated mdast tree. Neither catches
 * the failure mode in which the transform produces a structurally-
 * correct mdast `mdxJsxAttributeValueExpression` whose `data.estree`
 * Program is missing — `hast-util-to-estree` (the lowering pass MDX
 * runs after remark plugins) consumes `data.estree`, not the string
 * `value`. With `data.estree` absent, the JSX attribute compiles to a
 * `JSXEmptyExpression`, the prop arrives as `undefined`, and the
 * island SSR crashes.
 *
 * That failure shipped on Task 6 because no test layer existed
 * between "mdast asserted shape" and "Playwright e2e against the
 * built smoke HTML" — the entire MDX→Astro→React compile pipeline
 * was un-covered. Layer 2 is the canary, but Layer 2 runs against a
 * full Astro build and is slow + brittle as a unit-level signal.
 *
 * This file runs a tiny in-memory MDX fixture through `@mdx-js/mdx`'s
 * `compile()` with `pedagogyIndexRemarkPlugin` registered. It asserts
 * the compiled JS source contains the objectives array as real data
 * (literal `"o-state"` / `"State"` strings, with an array `[...]`
 * around them) — not the empty-expression shape `objectives={}` that
 * the bug produced.
 *
 * `@mdx-js/mdx` is declared as a direct devDep of `@sophie/astro` for
 * this test's `compile()` import. The runtime version is already
 * transitive via `@astrojs/mdx` at the same major; the direct devDep
 * makes the import honest and the version-coupling explicit.
 *
 * Assertion shape: the positive assertions (`toContain`, the
 * array-literal `toMatch`) carry the actual contract — if the array
 * doesn't survive into compiled JS, the test fails regardless of
 * what shape replaces it. The negative `not.toMatch` assertions belt
 * the two specific failure modes we've already seen (`objectives={}`
 * and `objectives: undefined`) so a regression to either shape gives
 * a more legible failure message.
 */

const mdxSource = [
  '<LearningObjectives course="c" chapter="ch" id="lo" heading="By the end:">',
  '  <Objective id="o-state" verb="State">the thesis</Objective>',
  '  <Objective id="o-explain" verb="Explain">the reason</Objective>',
  "</LearningObjectives>",
  "",
].join("\n");

describe("pedagogyIndexRemarkPlugin — MDX compile round-trip (Layer 1.6)", () => {
  test("compiled JS carries the objectives array as data, not JSXEmptyExpression", async () => {
    resetIndexAccumulator();

    // Pass an explicit `path` so the plugin's filePath guard
    // (`if (!filePath) return;`) does not short-circuit. The
    // getChapterSlug override below ignores the path and returns
    // "ch" unconditionally.
    const compiled = await compile(
      { path: "ch.mdx", value: mdxSource },
      {
        remarkPlugins: [
          [pedagogyIndexRemarkPlugin, { getChapterSlug: () => "ch" }],
        ],
        jsx: false,
      }
    );
    const source = String(compiled.value);

    // The bug's runtime shape: `objectives={}` lowers to an empty
    // JSX expression. We must never see that in compiled output for
    // an LO block that had real <Objective> children.
    expect(source).not.toMatch(/objectives:\s*\{\s*\}/);
    expect(source).not.toMatch(/objectives:\s*undefined/);

    // The fix's runtime shape: the objectives prop becomes an array
    // literal whose elements carry the id/verb/body strings as data.
    // The literal strings from the fixture must survive verbatim into
    // the compiled JS — that's only true if `data.estree` carried a
    // real Program/ArrayExpression through the lowering pass.
    expect(source).toContain('"o-state"');
    expect(source).toContain('"o-explain"');
    expect(source).toContain('"State"');
    expect(source).toContain('"Explain"');

    // Sanity: the objectives prop is passed positionally somewhere
    // in the compiled output. We don't pin down the exact MDX runtime
    // shape (which differs across @mdx-js/mdx versions), only that
    // an array literal containing the items appears in the source.
    expect(source).toMatch(/\[\s*\{[^}]*"id":\s*"o-state"/);
  });
});
