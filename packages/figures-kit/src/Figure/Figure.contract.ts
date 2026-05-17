import { FigurePropsSchema } from "./Figure.schema.ts";

/**
 * Contract for `<Figure>`, the root chrome primitive.
 *
 * Captured here as documentation-as-code so that downstream tooling
 * — Storybook stories, the `sophie diff` curriculum CI (ADR 0045),
 * the pedagogy-index audit (ADR 0038), and future composition
 * lint rules — can read the contract programmatically without
 * scraping markdown.
 *
 * The contract is intentionally narrower than the
 * `ComponentContract<>` shape used by `@sophie/components` top-level
 * registered components. Chrome primitives are compositional, not
 * registered pedagogy nodes, so they don't ship `serialize` /
 * `audit` / `containedIn`. If a future requirement demands it (e.g.,
 * a Figure-level audit invariant beyond what its children already
 * carry), this contract can grow to match `ComponentContract<>`.
 */
export const figureContract = {
  /** Semantic HTML element rendered by the primitive. */
  semanticElement: "figure",

  /** Position in the chrome shell — root container. */
  position: "root",

  /**
   * Slot children, in strict source order. Per locked decision 5,
   * source order = reading order = DOM order = visual order. Author
   * scaffolds (human or AI) never have to think about layout — the
   * order in JSX is the order on screen.
   */
  allowedChildren: [
    "FigureTitle",
    "FigureControls",
    "FigureBody",
    "FigureFooter",
    "FigureCaption",
  ] as const,

  /**
   * Children may be any non-empty subset of `allowedChildren` but
   * MUST appear in the declared order. Validation lives in
   * pedagogy-audit (ADR 0038); the primitive itself does not
   * reorder.
   */
  composition: "strict-order",

  /**
   * Every `<Figure>` MUST be labelled — either by an
   * `aria-labelledby` prop pointing at a heading id inside the
   * figure (Phase B.1 interim), or automatically once
   * `<FigureTitle>` / `<FigureCaption>` land in B.2 / B.8 and
   * register themselves with the figure via React Context.
   *
   * Failure mode: `<figure>` without a label trips axe-core's
   * "figure-must-have-alt-or-aria-label" check and renders the
   * card semantically anonymous.
   */
  accessibility: {
    requires: "aria-labelledby OR child <FigureTitle> OR child <FigureCaption>",
    figureRole: "implicit (figure)",
  },

  /**
   * Zod schema for props. Re-exported here so a single import lands
   * the full contract.
   */
  schema: FigurePropsSchema,
} as const;
