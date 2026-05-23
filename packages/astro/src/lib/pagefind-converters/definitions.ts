import type { DefinitionEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";
import { stripHtml } from "./strip-html.ts";

export const toDefinitionRecord: EntityToPagefindRecord<DefinitionEntry> = (
  entity,
  ctx
) => ({
  url: `/units/${entity.unit}/reading#${entity.anchor}`,
  content: stripHtml(entity.body),
  language: "en",
  meta: {
    title: entity.term,
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    slug: entity.slug,
  },
  filters: {
    type: ["term"],
    chapter: [entity.unit],
    module: [ctx.moduleSlug],
  },
});
