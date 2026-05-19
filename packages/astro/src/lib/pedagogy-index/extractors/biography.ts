import type {
  AssumptionEntry,
  Biography,
  BreaksWhenEntry,
  CommonMisuseEntry,
  DerivationStepEntry,
  ObservableEntry,
  UnitsEntry,
} from "@sophie/core/schema";
import {
  isWhitespaceTextNode,
  type MdxJsxFlowElement,
  readStringAttr,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

/**
 * Walks any mdast container's children and extracts biography entries
 * (Observable / Assumption / Units / BreaksWhen / CommonMisuse /
 * DerivationStep). Used by the registry walker
 * (`extractEquationRegistryDeclaration`) which walks `Root.children`
 * of `src/content/equations/<id>.mdx` files.
 *
 * Returns `undefined` when zero biography children are present (per-
 * equation opt-in per ADR 0046 §R8). Whitespace text nodes between
 * JSX siblings are skipped. Non-biography children (paragraphs, math
 * blocks, raw HTML, other JSX) are ALSO skipped — registry MDX files
 * may include framing prose between biography children.
 *
 * Observable + BreaksWhen are singletons; multiple of either is an
 * authoring error (throws). Assumption / Units / CommonMisuse /
 * DerivationStep are lists (any non-negative count is valid).
 *
 * Each role-bearing entry receives its hardcoded `epistemicRole`
 * literal per ADR 0058 §2 pattern 3 — the schema-side
 * `EpistemicRoleSchema.extract` locks the value, and the component-
 * side `<NAME>_EPISTEMIC_ROLE` const must agree (compile-time
 * guarantee via `as const satisfies EpistemicRole`).
 */
export function buildBiographyFromChildren(
  parent: { children: ReadonlyArray<unknown> },
  contextLabel: string
): Biography | undefined {
  let observable: ObservableEntry | undefined;
  const assumptions: AssumptionEntry[] = [];
  const units: UnitsEntry[] = [];
  let breaksWhen: BreaksWhenEntry | undefined;
  const commonMisuses: CommonMisuseEntry[] = [];
  const derivationSteps: DerivationStepEntry[] = [];

  for (const child of parent.children) {
    if (isWhitespaceTextNode(child)) continue;
    if (!child || typeof child !== "object") continue;
    const el = child as MdxJsxFlowElement;
    if (el.type !== "mdxJsxFlowElement") continue;

    if (el.name === "Observable") {
      if (observable !== undefined) {
        throw new Error(
          `transform: ${contextLabel} contains more than one <Observable> child. Per ADR 0046, Observable is an optional singleton — combine into one block or split into separate <KeyEquation>s.`
        );
      }
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <Observable> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      observable = { body, epistemicRole: "observable" };
      continue;
    }

    if (el.name === "Assumption") {
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <Assumption> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      const type = readStringAttr(el, "type");
      assumptions.push({
        body,
        ...(type ? { type } : {}),
        epistemicRole: "assumption",
      });
      continue;
    }

    if (el.name === "Units") {
      const symbol = readStringAttr(el, "symbol");
      const unit = readStringAttr(el, "unit");
      if (!symbol) {
        throw new Error(
          `transform: <Units> in ${contextLabel} is missing a non-empty \`symbol\` attr.`
        );
      }
      if (!unit) {
        throw new Error(
          `transform: <Units symbol="${symbol}"> in ${contextLabel} is missing a non-empty \`unit\` attr.`
        );
      }
      units.push({ symbol, unit });
      continue;
    }

    if (el.name === "BreaksWhen") {
      if (breaksWhen !== undefined) {
        throw new Error(
          `transform: ${contextLabel} contains more than one <BreaksWhen> child. Per ADR 0046, BreaksWhen is an optional singleton.`
        );
      }
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <BreaksWhen> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      breaksWhen = { body, epistemicRole: "approximation" };
      continue;
    }

    if (el.name === "CommonMisuse") {
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <CommonMisuse> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      const misconception = readStringAttr(el, "misconception");
      commonMisuses.push({
        body,
        ...(misconception ? { misconception } : {}),
      });
      continue;
    }

    if (el.name === "DerivationStep") {
      // Added per ADR 0046 §R9 (ADR 0060 brainstorm, 2026-05-18).
      // List shape — equations typically have multiple steps; each is
      // an entry with prose `body`, optional short `label`, and the
      // locked `"model"` epistemic role per ADR 0058's role contract.
      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `transform: <DerivationStep> in ${contextLabel} has an empty body. Resolution: add prose between the opening and closing tags.`
        );
      }
      const label = readStringAttr(el, "label");
      derivationSteps.push({
        body,
        ...(label ? { label } : {}),
        epistemicRole: "model",
      });
    }

    // Non-biography JSX (anything other than the six biography children
    // above) is silently skipped — <KeyEquation> legitimately contains
    // other JSX in framing prose (e.g., <EquationRef>, <GlossaryTerm>). The
    // audit (E7/E8/E9 in PR-δ) consumes the populated biography only;
    // if v2 grows a biography-allowlist invariant, it lives in
    // pedagogy-audit.ts, not here.
  }

  const hasAnyBiography =
    observable !== undefined ||
    assumptions.length > 0 ||
    units.length > 0 ||
    breaksWhen !== undefined ||
    commonMisuses.length > 0 ||
    derivationSteps.length > 0;

  if (!hasAnyBiography) return undefined;

  return {
    ...(observable ? { observable } : {}),
    assumptions,
    units,
    ...(breaksWhen ? { breaks_when: breaksWhen } : {}),
    common_misuses: commonMisuses,
    derivation_steps: derivationSteps,
  };
}
