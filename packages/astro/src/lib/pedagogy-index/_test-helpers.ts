/**
 * Shared test fixtures for the pedagogy-index/* test files.
 *
 * Each test file builds synthetic mdast trees + invokes one extractor
 * (or transform). The helpers below are the minimum AST shape
 * vocabulary across all test files — extracting them out of the
 * former 2,540-LOC umbrella test file (C3 split per ADR 0061 Rule 6)
 * keeps each new test file focused on what it tests.
 *
 * Underscore prefix marks the module as test-only so it's never
 * confused for a runtime export.
 */

/** Build a synthetic mdast `root` node wrapping the given children. */
export const root = (children: ReadonlyArray<Record<string, unknown>>) => ({
  type: "root",
  children,
});

/** Build a synthetic mdast `paragraph` node holding a single text. */
export const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

/**
 * Build a synthetic `mdxJsxFlowElement` for `<Aside ...>`. Used by
 * tests that exercise the Aside-driven extractors (definitions,
 * key-insights, misconceptions).
 */
export const mdxAside = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Aside",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

/**
 * Build a synthetic `<KeyEquation refId="…" client:load />` citation
 * node — the post-ADR-0060 chapter-walker shape. Includes `client:load`
 * by default because CL1 (ADR 0038 § A2.6) requires every store-backed
 * KeyEquation callsite to declare a `client:*` directive; tests that
 * exercise CL1 itself pass `clientDirective: false` to omit it.
 */
export const mdxKeyEquationCitation = (
  refId: string,
  children: ReadonlyArray<Record<string, unknown>> = [],
  { clientDirective = true }: { clientDirective?: boolean } = {}
) => ({
  type: "mdxJsxFlowElement",
  name: "KeyEquation",
  attributes: [
    { type: "mdxJsxAttribute", name: "refId", value: refId },
    ...(clientDirective
      ? [{ type: "mdxJsxAttribute", name: "client:load", value: null }]
      : []),
  ],
  children,
});

/**
 * Build a synthetic `<Figure ...>` flow element. Supports both
 * string-valued and boolean-presence (value === null) attributes —
 * the `canonical` JSX prop on `<Figure>` is a boolean-presence prop
 * (value: null when authored as `<Figure name="X" canonical />`).
 */
export const mdxFigure = (
  attrs: Record<string, string | null | true>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Figure",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

/**
 * Build a synthetic `<Callout ...>` flow element. Misconceptions are
 * extracted from both `<Aside kind="misconception">` (length="short")
 * and `<Callout variant="misconception">` (length="long").
 */
export const mdxCallout = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Callout",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

/**
 * Build the mdast shape for a JSX expression-valued attribute (the
 * `={[...]}` form authors use for ADR-0044 misconception-graph
 * fields). The unified pipeline normally emits this with `data.estree`
 * populated; the extractor only reads the raw `value` string so we
 * synthesize the minimum shape here.
 */
export const mdxExprAttr = (name: string, exprSource: string) => ({
  type: "mdxJsxAttribute" as const,
  name,
  value: { type: "mdxJsxAttributeValueExpression" as const, value: exprSource },
});

/**
 * Build an Aside / Callout flow element with a MIX of plain-string
 * attrs and JSX expression-valued attrs. Used for ADR-0044
 * misconception-graph-fields tests.
 */
export const mdxFlowEl = (
  name: string,
  stringAttrs: Record<string, string>,
  exprAttrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: [
    ...Object.entries(stringAttrs).map(([k, v]) => ({
      type: "mdxJsxAttribute",
      name: k,
      value: v,
    })),
    ...Object.entries(exprAttrs).map(([k, v]) => mdxExprAttr(k, v)),
  ],
  children,
});

/**
 * Build a synthetic JSX flow element by name with string + JSX-
 * expression attrs and arbitrary children. Used by retrieval-family
 * extractor tests (Wedge B1).
 */
export const mdxNamedFlow = (
  name: string,
  attrs: Record<string, string | number> = {},
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: Object.entries(attrs).map(([attrName, value]) => {
    if (typeof value === "number") {
      return {
        type: "mdxJsxAttribute",
        name: attrName,
        value: {
          type: "mdxJsxAttributeValueExpression",
          value: String(value),
        },
      };
    }
    return { type: "mdxJsxAttribute", name: attrName, value };
  }),
  children,
});

/** Build a synthetic `<LearningObjectives ...>` flow element. */
export const mdxLearningObjectives = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "LearningObjectives",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

/** Build a synthetic `<Objective ...>` flow element. */
export const mdxObjective = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Objective",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

/**
 * Inline-ref usage fixture. Inline cross-refs (<GlossaryTerm>,
 * <EquationRef>, <FigureRef>, <ChapterRef>) appear both as block
 * elements (mdxJsxFlowElement) and inline within prose
 * (mdxJsxTextElement). The extractor walks BOTH node types.
 */
export const mdxInlineJsx = (
  name: string,
  attrs: Record<string, string>,
  type: "mdxJsxFlowElement" | "mdxJsxTextElement" = "mdxJsxTextElement"
) => ({
  type,
  name,
  attributes: Object.entries(attrs).map(([n, value]) => ({
    type: "mdxJsxAttribute",
    name: n,
    value,
  })),
  children: [],
});
