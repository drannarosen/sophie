import type { MisconceptionEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";

export const toMisconceptionRecord: EntityToPagefindRecord<
  MisconceptionEntry
> = (entity, ctx) => ({
  url: `/chapters/${entity.chapter}#${entity.anchor}`,
  content: entity.body,
  language: "en",
  meta: {
    title: entity.label ?? "Misconception",
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    length: entity.length,
    label: entity.label ?? "",
  },
  filters: {
    type: ["misconception"],
    chapter: [entity.chapter],
    module: [ctx.moduleSlug],
  },
});
