import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * PRA-2 (ADR 0079) — Topic frontmatter ↔ body card consistency.
 *
 * Each topic file declares `cards: [{id, label, difficulty?}]` in
 * frontmatter and `<SkillReview.Card id="X">` JSX blocks in body.
 * The two lists must match 1:1. PRA-2 covers ONE direction:
 *
 *   (A) Frontmatter declares a card with no matching body block.
 *
 * The other direction — body block whose `id` is not declared in
 * frontmatter — is caught earlier by the topic extractor itself,
 * which emits a PRA-2 finding into `PedagogyIndex.extractorFindings`
 * and refuses to materialize the orphan as a `CardEntry`. PRA-2
 * here is therefore a stricter audit-time check that catches the
 * inverse mismatch the extractor can't structurally see (a
 * frontmatter entry has no body block to walk against, so the
 * extractor's visit-callback never fires for it). Both paths emit
 * findings under the same `PRA-2` code so authors get a single
 * concept to learn (per ADR 0079 §"PRA-2").
 *
 * Severity: ERROR (build-time fail). Authors fix by aligning the
 * two lists.
 */
export function checkPRA2(index: PedagogyIndex, sink: FindingSink): void {
  // Group cards (extractor output) by topic_id for the
  // frontmatter→body coverage check below.
  const cardsByTopic = new Map<string, Set<string>>();
  for (const card of index.cards) {
    let set = cardsByTopic.get(card.topic_id);
    if (!set) {
      set = new Set();
      cardsByTopic.set(card.topic_id, set);
    }
    set.add(card.id);
  }

  for (const topic of index.topics) {
    const declared = new Set(topic.cards.map((c) => c.id));
    const inBody = cardsByTopic.get(topic.id) ?? new Set<string>();

    // Frontmatter declares card not present in body.
    for (const id of declared) {
      if (!inBody.has(id)) {
        sink.errors.push({
          severity: "ERROR",
          code: "PRA-2",
          message: `PRA-2: Topic "${topic.id}" frontmatter declares card "${id}" but no <SkillReview.Card id="${id}"> block exists in the body. Resolution: add a <SkillReview.Card id="${id}"><SkillReview.Prompt>...</SkillReview.Prompt><SkillReview.Answer>...</SkillReview.Answer></SkillReview.Card> block, OR remove the orphan entry from the cards: list in frontmatter (per ADR 0079).`,
          location: { unit: topic.id, anchor: id },
        });
      }
    }
  }
}
