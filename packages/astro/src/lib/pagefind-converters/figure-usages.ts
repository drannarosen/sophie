import type {
  FigureRegistryEntry,
  FigureUsageEntry,
} from "@sophie/core/schema";
import type { EntityWithLookupToPagefindRecord } from "./index.ts";

export const toFigureUsageRecord: EntityWithLookupToPagefindRecord<
  FigureUsageEntry,
  FigureRegistryEntry
> = (usage, registry, ctx) => ({
  url: `/chapters/${usage.chapter}#${usage.anchor}`,
  content: [registry.alt, usage.captionOverride ?? registry.caption ?? ""]
    .filter(Boolean)
    .join(" — "),
  language: "en",
  meta: {
    title: usage.name,
    locator: `${ctx.chapterTitle} · ${ctx.moduleTitle}`,
    thumbnail: registry.src,
    alt: registry.alt,
    number: String(usage.number),
    canonical: usage.canonical ? "true" : "false",
  },
  filters: {
    type: ["figure"],
    chapter: [usage.chapter],
    module: [ctx.moduleSlug],
  },
});
