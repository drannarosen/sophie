import {
  type InterventionDepth,
  type InterventionEntry,
  slugify,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import {
  type MdxJsxFlowElement,
  readStringAttr,
  readStringListAttr,
  renderChildrenToHtml,
} from "../jsx-utils.ts";

/**
 * Read `<Intervention addresses=…>` — accepts either a plain string
 * (`addresses="universe-with-a-center"`) or an array expression
 * (`addresses={["a", "b"]}`). Returns the normalized array form, or
 * `undefined` when missing. Empty arrays return `undefined` (caller
 * treats as missing).
 */
function readInterventionAddressesAttr(
  node: MdxJsxFlowElement
): string[] | undefined {
  const single = readStringAttr(node, "addresses");
  if (single) return [single];
  const list = readStringListAttr(node, "addresses");
  if (list && list.length > 0) return list;
  return undefined;
}

/**
 * Pure extractor for `<Intervention>` JSX callsites per ADR 0044 +
 * 2026-05-17 design hardening §D4–§D5. Walks the tree manually
 * (rather than `visit()`) because resolving `addresses="this"`
 * requires the enclosing `<Aside kind="misconception" name="X">`'s
 * name — we track that as we recurse.
 *
 * Anchor numbering: sequential `intervention-${type-or-name-slug}-${idx}`
 * across the chapter in JSX-DFS order. The `transformIntervention`
 * pass below uses the IDENTICAL numbering so `id={anchor}` on the
 * rendered `<aside>` agrees with the pedagogy-index entry's `anchor`
 * field for hash-link navigation.
 *
 * `addresses="this"` resolution: rewritten to the enclosing
 * misconception's `name`. If `"this"` appears outside any misconception
 * Aside, it's left verbatim in the entry; the audit's I1 invariant
 * (PR-δ) catches that as a WARNING.
 *
 * Empty body throws — an intervention without prose is a content bug
 * (the structural pairing is unsupported without remediation content).
 *
 * Hard errors:
 *   - missing `type` attr
 *   - `type="custom"` without `name` (mirrors `.superRefine` on
 *     `InterventionPropsSchema` + `InterventionEntrySchema`)
 *   - missing `addresses` attr
 *   - empty body
 */
export function extractInterventions(
  tree: Root,
  unitId: string
): InterventionEntry[] {
  const out: InterventionEntry[] = [];
  let idx = 0;

  function visitNode(
    node: unknown,
    enclosingMisconception: string | null,
    insideIntervention: boolean
  ): void {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      name?: string | null;
      children?: ReadonlyArray<unknown>;
    };

    // Track enclosing misconception Aside as we descend so nested
    // `<Intervention addresses="this">` resolves correctly. We only
    // shadow `enclosingMisconception` for the children of *this*
    // Aside — siblings and ancestors are unaffected because we
    // pass `nextEnclosing` only into the recursive call below.
    let nextEnclosing = enclosingMisconception;
    if (n.type === "mdxJsxFlowElement" && n.name === "Aside") {
      const kind = readStringAttr(n as MdxJsxFlowElement, "kind");
      if (kind === "misconception") {
        const miscName = readStringAttr(n as MdxJsxFlowElement, "name");
        // If `name` is missing, leave enclosingMisconception as-is —
        // the misconception extractor handles its own naming, and any
        // nested Intervention's `"this"` will fall through to the
        // outer enclosing (or stay as "this" if none).
        //
        // Slugify here to align with the misconception extractor's
        // anchor derivation, which stores `slugify(name)` as the
        // MisconceptionEntry.anchor (PR-δ extractor fix). Without
        // this slugify, an author writing `name="Universe With A
        // Center"` would produce a misconception anchor of
        // `universe-with-a-center` but an Intervention
        // `addresses="this"` resolution of `Universe With A Center`
        // (raw), and the audit's I1 + MG3 would fire false-positive
        // pairs on every nested intervention.
        if (miscName) nextEnclosing = slugify(miscName);
      }
    }

    if (n.type === "mdxJsxFlowElement" && n.name === "Intervention") {
      // Defense-in-depth: extractor sees Intervention nested inside
      // another Intervention's prose body. Extract would normally skip
      // recursion into Intervention children, but the transform pass
      // uses `visit()` which DOES recurse — letting the nested case
      // through would desynchronize anchor numbering between the two
      // passes. Throw here so the chapter author surfaces the bug
      // upfront rather than discovering a 404 hash anchor later.
      if (insideIntervention) {
        throw new Error(
          `<Intervention> inside another <Intervention>'s body in chapter "${unitId}" — nested intervention blocks are not allowed (the structural pairing only makes sense at one level). Resolution: hoist the inner intervention to a sibling of the outer.`
        );
      }
      const el = n as MdxJsxFlowElement;
      // Reject an author-supplied explicit `id`. The PR-γ design has
      // the extractor as the SOLE source of intervention anchors so
      // the rendered DOM id and the pedagogy-index `anchor` field
      // never disagree. Letting the author author an `id` would split
      // the contract and silently break cross-chapter index links.
      const authorId = readStringAttr(el, "id");
      if (authorId) {
        throw new Error(
          `<Intervention id="${authorId}"> in chapter "${unitId}" — the \`id\` attr is extractor-derived (PR-γ), not authorable. Resolution: drop the \`id\` prop; the auto-derived \`intervention-<type|name>-<idx>\` anchor is the source of truth for both the DOM and the pedagogy index.`
        );
      }
      const type = readStringAttr(el, "type");
      if (!type) {
        throw new Error(
          `<Intervention> in chapter "${unitId}" is missing a non-empty \`type\` attr.`
        );
      }
      const name = readStringAttr(el, "name");
      if (type === "custom" && !name) {
        throw new Error(
          `<Intervention type="custom"> in chapter "${unitId}" is missing a non-empty \`name\` attr (required when type="custom"; mirrors the .superRefine on InterventionPropsSchema).`
        );
      }
      const rawAddresses = readInterventionAddressesAttr(el);
      if (!rawAddresses) {
        throw new Error(
          `<Intervention type="${type}"> in chapter "${unitId}" is missing a non-empty \`addresses\` attr.`
        );
      }
      // Resolve "this" against the enclosing misconception. When no
      // enclosure exists, leave "this" verbatim so the audit's I1
      // can flag it; do NOT throw here (lets the audit produce a
      // multi-finding report instead of a single hard error).
      const addresses = rawAddresses.map((a) =>
        a === "this" ? (enclosingMisconception ?? "this") : a
      );

      const limits = readStringAttr(el, "limits") ?? undefined;
      const depthRaw = readStringAttr(el, "depth");
      // Strict-enum check: silent coercion of `depth="deep"` →
      // `"light"` would diverge from the component schema's runtime
      // validation. Match the schema's posture here at extract time
      // so the build fails fast.
      if (
        depthRaw !== undefined &&
        depthRaw !== "light" &&
        depthRaw !== "substantial"
      ) {
        throw new Error(
          `<Intervention type="${type}"> in chapter "${unitId}" has invalid \`depth="${depthRaw}"\`. Allowed values: "light", "substantial".`
        );
      }
      const depth: InterventionDepth =
        depthRaw === "substantial" ? "substantial" : "light";

      const body = renderChildrenToHtml(el.children);
      if (body.trim().length === 0) {
        throw new Error(
          `<Intervention type="${type}"> in chapter "${unitId}" has an empty body. Resolution: add the remediation prose between the opening and closing tags.`
        );
      }

      idx += 1;
      const typeOrNameSlug =
        type === "custom" && name ? slugify(name) : slugify(type);
      const anchor = `intervention-${typeOrNameSlug}-${idx}`;

      const entry: InterventionEntry = {
        type,
        ...(name ? { name } : {}),
        addresses,
        body,
        ...(limits ? { limits } : {}),
        depth,
        unit: unitId,
        anchor,
      };
      out.push(entry);
      // Recurse into the body to enforce the no-nested-Intervention
      // rule (insideIntervention=true). We don't expect any pedagogy
      // children in the body (it's prose), but the recursion is cheap
      // and catches the structural-misuse case the M2 review flagged.
      if (n.children && Array.isArray(n.children)) {
        for (const child of n.children) {
          visitNode(child, nextEnclosing, true);
        }
      }
      return;
    }

    if (n.children && Array.isArray(n.children)) {
      for (const child of n.children) {
        visitNode(child, nextEnclosing, insideIntervention);
      }
    }
  }

  visitNode(tree, null, false);
  return out;
}
