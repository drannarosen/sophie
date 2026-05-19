import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `AsideKind` — the visual + pedagogical category of an aside.
 *
 *   - `note`           General digressive note (default).
 *   - `definition`     Term + meaning, often anchored to a
 *                      parenthetical first-use of the term in the
 *                      prose.
 *   - `digression`     Historical / anecdotal aside; orthogonal to
 *                      the main thread.
 *   - `key-insight`    A claim the reader should remember; the aside
 *                      restates it in compact form.
 *   - `misconception`  A short-form misconception alert. The long-
 *                      form variant is `<Callout variant="misconception">`
 *                      (PR-C3 decision #8). Title is OPTIONAL,
 *                      matching the key-insight precedent.
 *
 * Per the PR 6 design doc (2026-05-13), full variant set chosen over
 * a smaller initial variant set to give chapter authors and AI
 * authors (ADR 0030) the full pedagogical vocabulary up-front. PR-C3
 * adds "misconception" alongside "key-insight" as the second
 * title-optional pedagogical kind.
 */
export const AsideKind = z.enum([
  "note",
  "definition",
  "digression",
  "key-insight",
  "misconception",
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
    /**
     * Misconception-graph identifier (ADR 0044). Only meaningful
     * when `kind === "misconception"`; ignored on other kinds. The
     * extractor's anchor-precedence is `id > name > slug(title)`, so
     * authors who want stable misconception URLs across title edits
     * write `<Aside kind="misconception" name="big-bang-explosion"
     * title="A common confusion: …">`. The unified renderer (since
     * the 2026-05-19 anchor PR) also emits this as the DOM `id` for
     * misconception kind, so the index and the rendered chapter
     * agree.
     */
    name: z.string().optional(),
    children: z.custom<ReactNode>(),
    /**
     * ADR 0044 misconception-graph fields. Only meaningful when
     * `kind === "misconception"`; ignored on other kinds. All four
     * are optional — a misconception with no declared relationships
     * is a valid v1 entry. The extractor (`extractMisconceptions`)
     * reads these as JSX expression-valued props and threads them
     * into the pedagogy index; the build-time audit pass enforces
     * MG1 (cycle) + MG2 (earlier-chapter ordering / dangling refs).
     */
    prerequisite_misconceptions: z.array(z.string().min(1)).optional(),
    related_misconceptions: z.array(z.string().min(1)).optional(),
    concept_refs: z.array(z.string().min(1)).optional(),
    discipline_scope: z.array(z.string().min(1)).optional(),
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
