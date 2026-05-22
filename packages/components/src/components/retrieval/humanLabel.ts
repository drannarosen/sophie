/**
 * `humanLabelFromTarget` — convert a pedagogy-graph target ref like
 * `"eq:stefan-boltzmann"` into a reader-facing label like
 * `"equation: stefan-boltzmann"`. Used by the retrieval-family
 * components' trigger labels (Wedge B1 design doc §1).
 *
 * Known prefixes map to expanded names; unknown prefixes return the
 * raw target string unchanged so authors get visible feedback if they
 * mistype (the curriculum-CI extractor catches malformed targets, but
 * the runtime renders the literal value).
 */
const PREFIX_LABELS: Record<string, string> = {
  eq: "equation",
  gl: "glossary",
  misc: "misconception",
  lo: "learning objective",
  ki: "key insight",
  topic: "topic",
};

export function humanLabelFromTarget(target: string): string {
  const idx = target.indexOf(":");
  if (idx < 0) return target;
  const prefix = target.slice(0, idx);
  const slug = target.slice(idx + 1);
  const typeLabel = PREFIX_LABELS[prefix];
  if (typeLabel === undefined || slug.length === 0) return target;
  return `${typeLabel}: ${slug}`;
}
