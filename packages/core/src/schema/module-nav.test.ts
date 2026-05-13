import { describe, expect, it } from "vitest";
import { chaptersForModule } from "./module-nav.ts";

type C = { slug: string; title: string; module: string; order?: number };

const chapters: C[] = [
  {
    slug: "stellar-evolution",
    title: "Stellar Evolution",
    module: "stars",
    order: 1,
  },
  {
    slug: "spoiler-alerts",
    title: "Spoiler Alerts",
    module: "foundations",
    order: 1,
  },
  {
    slug: "measuring-the-sky",
    title: "Measuring the Sky",
    module: "foundations",
    order: 2,
  },
  {
    slug: "another-stars",
    title: "Another Stars Topic",
    module: "stars",
    order: 2,
  },
];

describe("chaptersForModule", () => {
  it("returns only chapters whose module matches", () => {
    const result = chaptersForModule("foundations", chapters);
    expect(result.map((c) => c.slug)).toEqual([
      "spoiler-alerts",
      "measuring-the-sky",
    ]);
  });

  it("sorts by order ascending", () => {
    const result = chaptersForModule("stars", [
      { slug: "b", title: "B", module: "stars", order: 5 },
      { slug: "a", title: "A", module: "stars", order: 1 },
      { slug: "c", title: "C", module: "stars", order: 3 },
    ]);
    expect(result.map((c) => c.slug)).toEqual(["a", "c", "b"]);
  });

  it("falls back to title.localeCompare when no chapter has an order", () => {
    const result = chaptersForModule("stars", [
      { slug: "zebra", title: "Zebra", module: "stars" },
      { slug: "apple", title: "Apple", module: "stars" },
      { slug: "mango", title: "Mango", module: "stars" },
    ]);
    expect(result.map((c) => c.slug)).toEqual(["apple", "mango", "zebra"]);
  });

  it("orders chapters with `order` before those without", () => {
    const result = chaptersForModule("stars", [
      { slug: "no-order-z", title: "Z Topic", module: "stars" },
      { slug: "ordered-2", title: "Whatever 2", module: "stars", order: 2 },
      { slug: "no-order-a", title: "A Topic", module: "stars" },
      { slug: "ordered-1", title: "Whatever 1", module: "stars", order: 1 },
    ]);
    expect(result.map((c) => c.slug)).toEqual([
      "ordered-1",
      "ordered-2",
      "no-order-a",
      "no-order-z",
    ]);
  });

  it("returns an empty array when no chapters match", () => {
    expect(chaptersForModule("does-not-exist", chapters)).toEqual([]);
  });

  it("returns an empty array for an empty input", () => {
    expect(chaptersForModule("foundations", [])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input = [...chapters];
    const snapshot = [...input];
    chaptersForModule("foundations", input);
    expect(input).toEqual(snapshot);
  });
});
