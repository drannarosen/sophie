import type { KeyInsightEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";
import { stripHtml } from "./strip-html.ts";

const TITLE_MAX = 80;

export const toKeyInsightRecord: EntityToPagefindRecord<KeyInsightEntry> = (
  entity,
  ctx
) => {
  const stripped = stripHtml(entity.body);
  const title =
    stripped.length <= TITLE_MAX
      ? stripped
      : `${stripped.slice(0, TITLE_MAX)}…`;
  return {
    url: `/units/${entity.unit}/reading#${entity.anchor}`,
    content: stripped,
    language: "en",
    meta: {
      title,
      locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    },
    filters: {
      type: ["keyInsight"],
      chapter: [entity.unit],
      module: [ctx.moduleSlug],
    },
  };
};
