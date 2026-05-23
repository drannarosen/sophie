import type {
  AuditFinding,
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
 * id="X">` blocks must match 1:1. When a body block's id is NOT
 * declared in frontmatter, the extractor:
 *   1. Refuses to materialize the orphan as a CardEntry (keeps
 *      downstream consumers honest about the registry shape).
 *   2. Emits a PRA-2 AuditFinding via the returned `findings` array
 *      so the audit surfaces the drift LOUDLY at build time. The
 *      inverse direction (frontmatter declares a card with no body
 *      block) is caught by `checkPRA2` in the audit phase, which
 *      sees the populated index after extraction completes.
 *
 * Both directions emit findings under the same `PRA-2` code so
 * authors learn a single concept.
 */
export function extractTopicAndCards(
  tree: Root,
  topic: TopicEntry
): { topic: TopicEntry; cards: CardEntry[]; findings: AuditFinding[] } {
  const declaredCardsById = new Map<string, TopicCardMetadata>(
    topic.cards.map((c) => [c.id, c])
  );
  const cards: CardEntry[] = [];
  const findings: AuditFinding[] = [];

  visit(tree, "mdxJsxFlowElement", (node) => {
    if (node.name !== "SkillReview.Card") return;
    const idAttr = node.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "id"
    );
    if (!idAttr || typeof idAttr.value !== "string") return;
    const declared = declaredCardsById.get(idAttr.value);
    if (!declared) {
      findings.push({
        severity: "ERROR",
        code: "PRA-2",
        message: `PRA-2: Topic "${topic.id}" body has <SkillReview.Card id="${idAttr.value}"> but card is not declared in frontmatter cards: [] list. Resolution: add { id: "${idAttr.value}", label: "..." } to the topic's frontmatter cards list, OR remove the orphan block from the body (per ADR 0079).`,
        location: { unit: topic.id, anchor: idAttr.value },
      });
      return;
    }
    cards.push({
      id: declared.id,
      topic_id: topic.id,
      label: declared.label,
      ...(declared.difficulty !== undefined && {
        difficulty: declared.difficulty,
      }),
    });
  });

  return { topic, cards, findings };
}
