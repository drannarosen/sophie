// @vitest-environment node
/**
 * axe-core a11y test for `<TopicSpecContent>` (W4c Batch 8 Task 8.4;
 * closes W4b R+CR finding N5; ADR 0004 mandate).
 *
 * ## Why the component split (option (a) — mirrors Batch 7 rationale)
 *
 * The smoke route at
 * `examples/smoke/src/pages/library/topics/[topicId].astro` is a full
 * Astro page (layout + `getStaticPaths` + integration globals).
 * Container API doesn't drive full-page Spec routes (see
 * `container-axe.ts` JSDoc §"What this helper does NOT cover").
 *
 * The inner `<TopicSpecContent topic cardSlots>` component is
 * axe-testable via Container API (Batch 3b infra); the route file is
 * a thin layout-wiring shell. Full-page coverage lands via Batch 3c's
 * Playwright harness.
 *
 * ## Scenarios
 *
 *   1. complete topic (cards + cross-refs + prompt/answer body) —
 *      zero violations,
 *   2. topic with no cards / no cross-refs (frontmatter-only shape) —
 *      zero violations,
 *   3. composed-into-`<main>` regression guard.
 */

import type { TopicEntry } from "@sophie/core/schema";
import { afterEach, describe, expect, test } from "vitest";
import { renderAstroToBody, setupAxeDom } from "../test-utils/container-axe.ts";
import TopicSpecContent from "./TopicSpecContent.astro";

const { axe, toHaveNoViolations } = setupAxeDom();
expect.extend(toHaveNoViolations as never);

afterEach(() => {
  document.body.innerHTML = "";
});

const completeTopic: TopicEntry = {
  id: "logarithms",
  label: "Logarithms",
  summary: "Functions that invert exponentiation.",
  prereq_topic_ids: ["exponents"],
  linked_equation_ids: ["stefan-boltzmann-luminosity"],
  linked_misconception_ids: [],
  cards: [
    { id: "product-rule", label: "Product rule", difficulty: "easy" },
    { id: "power-rule", label: "Power rule", difficulty: "medium" },
  ],
};

const completeSlots = new Map<
  string,
  { promptHtml: string; answerHtml: string }
>([
  [
    "product-rule",
    {
      promptHtml: "<p>What does log_b(xy) equal?</p>",
      answerHtml: "<p>log_b(x) + log_b(y).</p>",
    },
  ],
  [
    "power-rule",
    {
      promptHtml: "<p>What does log_b(x^n) equal?</p>",
      answerHtml: "<p>n · log_b(x).</p>",
    },
  ],
]);

const bareTopic: TopicEntry = {
  id: "empty-topic",
  label: "Empty topic",
  summary: "A topic with no cards and no cross-references (frontmatter-only).",
  prereq_topic_ids: [],
  linked_equation_ids: [],
  linked_misconception_ids: [],
  cards: [],
};

describe("TopicSpecContent — axe-core a11y", () => {
  test("renders complete topic (cards + slot bodies + cross-refs) — zero violations", async () => {
    await renderAstroToBody(TopicSpecContent, {
      props: { topic: completeTopic, cardSlots: completeSlots },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("renders bare topic (no cards, no cross-refs) — zero violations", async () => {
    await renderAstroToBody(TopicSpecContent, {
      props: { topic: bareTopic, cardSlots: new Map() },
    });
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test("composed inside page <main> — no landmark-no-duplicate-main violation", async () => {
    await renderAstroToBody(TopicSpecContent, {
      props: { topic: completeTopic, cardSlots: completeSlots },
      wrap: (html) => `<main class="sophie-content">${html}</main>`,
    });
    const results = (await axe(document.body)) as {
      violations: Array<{ id: string }>;
    };
    expect(results).toHaveNoViolations();
    const duplicateMainViolation = results.violations.find(
      (v) => v.id === "landmark-no-duplicate-main"
    );
    expect(duplicateMainViolation).toBeUndefined();
  });
});
