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
 * Props for `<Aside>`. Both `kind` and `title` are optional:
 *   - `kind` defaults to "note" at render time.
 *   - `title` is shown as a leading bold label inside the aside
 *     summary; omit for unstructured digressions.
 *
 * `children` carries the aside body content (typically prose).
 * Authoring constraint per the design doc: `<Aside>` must be used
 * at MDX block-level (root scope), not inline within a paragraph.
 * The positioning script relies on the aside's previous element
 * sibling at document level to identify its anchor.
 */
export const AsidePropsSchema = z.object({
  kind: AsideKind.optional(),
  title: z.string().optional(),
  children: z.custom<ReactNode>(),
});
export type AsideProps = z.infer<typeof AsidePropsSchema>;
