import type { EquationEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";
import { stripHtml } from "./strip-html.ts";

// Post-ADR-0060: equations are registry-sourced. Each entry lives at
// `/equations/<id>` (not `/chapters/X#anchor`). Searchable content
// aggregates title + tex + biography prose (Observable / Assumption /
// BreaksWhen / CommonMisuse / DerivationStep bodies, pre-rendered HTML
// stripped to text). The `chapter` filter dimension is no longer
// applicable — declarations are global to the registry; chapter-side
// citations index separately via EquationCitationEntry (future PR).
export const toEquationRecord: EntityToPagefindRecord<EquationEntry> = (
  entity,
  ctx
) => {
  const biographyHtml: string[] = [];
  if (entity.biography) {
    if (entity.biography.observable) {
      biographyHtml.push(entity.biography.observable.body);
    }
    for (const a of entity.biography.assumptions) biographyHtml.push(a.body);
    if (entity.biography.breaks_when) {
      biographyHtml.push(entity.biography.breaks_when.body);
    }
    for (const m of entity.biography.common_misuses) biographyHtml.push(m.body);
    for (const d of entity.biography.derivation_steps) {
      biographyHtml.push(d.body);
    }
  }
  return {
    url: `/equations/${entity.id}`,
    content: [entity.title, entity.tex, ...biographyHtml.map(stripHtml)]
      .filter(Boolean)
      .join(" — "),
    language: "en",
    meta: {
      title: entity.title,
      locator: `Equations · ${ctx.moduleTitle}`,
      tex: entity.tex,
      slug: entity.id,
    },
    filters: {
      type: ["equation"],
      module: [ctx.moduleSlug],
    },
  };
};
