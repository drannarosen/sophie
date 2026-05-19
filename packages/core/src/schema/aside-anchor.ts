import { slugify } from "./slugify.ts";

/**
 * Aside kind union used by `deriveAsideAnchor`'s `kind` discriminator.
 * Mirrors `AsideKind` in `@sophie/components/src/components/Aside/Aside.schema.ts`
 * (which is also the Zod source of truth for runtime validation).
 * Kept as a structural union here to avoid a cross-package import
 * cycle (`@sophie/core` cannot depend on `@sophie/components`). When
 * the kind list grows, update both — guarded by the renderer's
 * exhaustiveness check.
 */
export type AsideAnchorKind =
  | "note"
  | "definition"
  | "digression"
  | "key-insight"
  | "misconception";

/**
 * Inputs to `deriveAsideAnchor`. All fields except `kind` are
 * optional — the function returns `undefined` when no anchor can
 * be derived and no fallback is supplied.
 *
 * `kind` selects the per-kind precedence rule. Today `misconception`
 * is the one kind that consults `name` as a separate identifier
 * source (per ADR 0044 misconception-graph). Other kinds skip `name`
 * even when supplied.
 */
export interface DeriveAsideAnchorInput {
  /** Aside kind (note / definition / digression / key-insight / misconception). */
  kind: AsideAnchorKind;
  /** Explicit `id` prop — wins over every other source when present. */
  id?: string;
  /**
   * Misconception-graph identifier (ADR 0044). Only consulted when
   * `kind === "misconception"`; ignored on other kinds. Authors write
   * this as `<Aside kind="misconception" name="big-bang-explosion">`
   * to express the canonical graph slug independent of the prose title.
   */
  name?: string;
  /** Author-written title; falls through to `slugify(title)`. */
  title?: string;
  /**
   * Caller-supplied fallback used when no other source produces an
   * anchor. The extractors pass a positional `ki-${n}` /
   * `misc-${n}` here; the renderer passes nothing (returns
   * `undefined`, no id emitted in DOM).
   */
  fallback?: string;
}

/**
 * Derive an `<Aside>` anchor — the single source of truth for the
 * renderer-extractor agreement (P1 unified-anchor PR, 2026-05-19).
 *
 * Precedence chain:
 *
 *   1. **explicit `id`** — author wrote `<Aside ... id="foo">`.
 *      Always wins; slugified for URL safety.
 *   2. **`name`** (misconception only) — author wrote
 *      `<Aside kind="misconception" name="graph-slug">`. Canonical
 *      ADR 0044 misconception-graph identifier; slugified.
 *   3. **`slug(title)`** — fall back to the title for any kind with
 *      a title. Stable across MDX reordering because it derives from
 *      content, not position.
 *   4. **caller-supplied `fallback`** — for extractors that need a
 *      positional fallback (`ki-3` / `misc-7`) when no other source
 *      produces an anchor.
 *   5. **`undefined`** — for the renderer path when none of the above
 *      apply. Renderer skips id emission; DOM has `data-aside-kind`
 *      but no `id`.
 *
 * This function is pure and side-effect-free. Both the renderer
 * (`packages/components/src/components/Aside/Aside.tsx`) and the
 * extractors
 * (`packages/astro/src/lib/pedagogy-index/extractors/{key-insights,misconceptions}.ts`)
 * import it. There is no second copy of this logic anywhere.
 */
export function deriveAsideAnchor(
  input: DeriveAsideAnchorInput
): string | undefined {
  const trim = (v: string | undefined): string | undefined => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };

  const explicitId = trim(input.id);
  if (explicitId) return slugify(explicitId);

  if (input.kind === "misconception") {
    const name = trim(input.name);
    if (name) return slugify(name);
  }

  const title = trim(input.title);
  if (title) return slugify(title);

  const fallback = trim(input.fallback);
  return fallback;
}
