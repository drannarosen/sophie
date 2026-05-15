import type { KeyInsightEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

const TITLE_MAX = 80;

export const toKeyInsightRecord: EntityToPagefindRecord<KeyInsightEntry> = (
  entity,
  ctx
) => {
  const title =
    entity.body.length <= TITLE_MAX
      ? entity.body
      : `${entity.body.slice(0, TITLE_MAX)}…`;
  return {
    url: `/chapters/${entity.chapter}#${entity.anchor}`,
    content: entity.body,
    language: "en",
    meta: {
      title,
      locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    },
    filters: {
      type: ["keyInsight"],
      chapter: [entity.chapter],
      module: [ctx.moduleSlug],
    },
  };
};
