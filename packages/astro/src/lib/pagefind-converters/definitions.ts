import type { DefinitionEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

export const toDefinitionRecord: EntityToPagefindRecord<DefinitionEntry> = (
  entity,
  ctx
) => ({
  url: `/chapters/${entity.chapter}#${entity.anchor}`,
  content: entity.body,
  language: "en",
  meta: {
    title: entity.term,
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    slug: entity.slug,
  },
  filters: {
    type: ["term"],
    chapter: [entity.chapter],
    module: [ctx.moduleSlug],
  },
});
