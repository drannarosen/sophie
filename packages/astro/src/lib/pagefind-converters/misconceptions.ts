import type { MisconceptionEntry } from "@sophie/core/schema";
import type { EntityToPagefindRecord } from "./index.ts";
import { stripHtml } from "./strip-html.ts";

export const toMisconceptionRecord: EntityToPagefindRecord<
  MisconceptionEntry
> = (entity, ctx) => ({
  url: `/units/${entity.chapter}/reading#${entity.anchor}`,
  content: stripHtml(entity.body),
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
