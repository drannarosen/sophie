import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `AsideKind` — the visual + pedagogical category of an aside.
 *
 *   - `note`        General digressive note (default).
 *   - `definition`  Term + meaning, often anchored to a parenthetical
 *                   first-use of the term in the prose.
 *   - `digression`  Historical / anecdotal aside; orthogonal to the
 *                   main thread.
 *   - `key-insight` A claim the reader should remember; the aside
 *                   restates it in compact form.
 *
 * Per the PR 6 design doc (2026-05-13), full 4-variant set chosen
 * over a smaller initial variant set to give chapter authors and AI
 * authors (ADR 0030) the full pedagogical vocabulary up-front.
 */
export const AsideKind = z.enum([
  "note",
  "definition",
  "digression",
  "key-insight",
]);
export type AsideKind = z.infer<typeof AsideKind>;

/**
 * Props for `<Aside>`. Most fields are optional:
 *   - `kind` defaults to "note" at render time.
 *   - `title` is shown as a leading bold label inside the aside
 *     summary. **Required (non-empty) when `kind === "definition"`**
 *     — enforced by the refinement below — because the title is
 *     canonical for term identity in the pedagogy index
 *     (ADR 0038). Optional otherwise.
 *   - `id` overrides the auto-generated anchor slug (defaults to
 *     `slugify(title)` at render time when `kind === "definition"`).
 *     PR-C1 introduces this for collision-resolution + migration.
 *
 * `children` carries the aside body content (typically prose).
 * Authoring constraint per the design doc: `<Aside>` must be used
 * at MDX block-level (root scope), not inline within a paragraph.
 * The positioning script relies on the aside's previous element
 * sibling at document level to identify its anchor.
 */
export const AsidePropsSchema = z
  .object({
    kind: AsideKind.optional(),
    title: z.string().optional(),
    id: z.string().optional(),
    children: z.custom<ReactNode>(),
  })
  .refine(
    (props) =>
      props.kind !== "definition" ||
      (typeof props.title === "string" && props.title.trim().length > 0),
    {
      message: 'title is required (non-empty) when kind is "definition"',
      path: ["title"],
    }
  );
export type AsideProps = z.infer<typeof AsidePropsSchema>;
