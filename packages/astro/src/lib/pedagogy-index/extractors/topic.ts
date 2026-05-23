import type {
  CardEntry,
  TopicCardMetadata,
  TopicEntry,
} from "@sophie/core/schema";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Topic extractor — emits one `TopicEntry` per topic content file
 * + one `CardEntry` per `<SkillReview.Card id="X">` JSX block in the
 * file's body, per ADR 0079 (Design F).
 *
 * Card body slots (`<SkillReview.Prompt>` + `<SkillReview.Answer>`)
 * are NOT stored on the entry — the SkillReview self-closing
 * resolver re-fetches them from the topic MDX AST at compile time.
 * Storing pre-rendered HTML on the entry would violate ADR 0038's
 * "data, not HTML" principle.
 *
 * The frontmatter `cards: [{...}]` array is the source of truth for
 * card metadata (label, difficulty). The body's `<SkillReview.Card
 * id="X">` blocks must match 1:1 — PRA-2 audit invariant enforces
 * consistency at build time. The extractor skips body blocks whose
 * id is not declared in frontmatter (PRA-2 surfaces those as ERROR).
 */
export function extractTopicAndCards(
  tree: Root,
  topic: TopicEntry,
): { topic: TopicEntry; cards: CardEntry[] } {
  const declaredCardsById = new Map<string, TopicCardMetadata>(
    topic.cards.map((c) => [c.id, c]),
  );
  const cards: CardEntry[] = [];

  visit(tree, "mdxJsxFlowElement", (node) => {
    if (node.name !== "SkillReview.Card") return;
    const idAttr = node.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "id",
    );
    if (!idAttr || typeof idAttr.value !== "string") return;
    const declared = declaredCardsById.get(idAttr.value);
    if (!declared) return; // PRA-2 catches the orphan block
    cards.push({
      id: declared.id,
      topic_id: topic.id,
      label: declared.label,
      ...(declared.difficulty !== undefined && {
        difficulty: declared.difficulty,
      }),
    });
  });

  return { topic, cards };
}
