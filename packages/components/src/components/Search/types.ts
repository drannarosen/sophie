import type { EntityType } from "@sophie/core/schema";

export type SearchResult = {
  url: string;
  meta: {
    title: string;
    locator: string;
    tex?: string;
    /** Build-time prerendered KaTeX html for equation results (ADR 0090). */
    html?: string;
    /** Build-time SRE ClearSpeak speech for equation results (ADR 0089). */
    speech?: string;
    slug?: string;
    number?: string;
    length?: "short" | "long";
    label?: string;
    verb?: string;
    thumbnail?: string;
    alt?: string;
    canonical?: string;
  };
  excerpt: string;
  filters: {
    type: [EntityType];
  };
};
