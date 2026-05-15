import type { EquationEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";
import { stripHtml } from "./strip-html.ts";

export const toEquationRecord: EntityToPagefindRecord<EquationEntry> = (
  entity,
  ctx
) => ({
  url: `/chapters/${entity.chapter}#${entity.anchor}`,
  content: [entity.title, entity.tex, stripHtml(entity.body)]
    .filter(Boolean)
    .join(" — "),
  language: "en",
  meta: {
    title: entity.title,
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    tex: entity.tex,
    slug: entity.slug,
    number: String(entity.number),
  },
  filters: {
    type: ["equation"],
    chapter: [entity.chapter],
    module: [ctx.moduleSlug],
  },
});
