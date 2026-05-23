import type { ObjectiveEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";
import { stripHtml } from "./strip-html.ts";

export const toObjectiveRecord: EntityToPagefindRecord<ObjectiveEntry> = (
  entity,
  ctx
) => {
  const title = `${entity.verb} ${stripHtml(entity.body)}`.trim();
  return {
    url: `/units/${entity.unit}/reading#${entity.anchor}`,
    content: title,
    language: "en",
    meta: {
      title,
      locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
      verb: entity.verb,
    },
    filters: {
      type: ["objective"],
      chapter: [entity.unit],
      module: [ctx.moduleSlug],
    },
  };
};
