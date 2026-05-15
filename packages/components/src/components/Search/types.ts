import type { EntityType } from "@sophie/core/schema";

export type SearchResult = {
  url: string;
  meta: {
    title: string;
    locator: string;
    tex?: string;
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
