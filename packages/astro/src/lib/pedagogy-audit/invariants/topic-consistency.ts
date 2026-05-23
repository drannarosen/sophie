import type { AuditFinding, PedagogyIndex } from "@sophie/core/schema";

interface FindingSink {
  errors: AuditFinding[];
  warnings: AuditFinding[];
  infos: AuditFinding[];
}

/**
 * PRA-2 (ADR 0079) — Topic frontmatter ↔ body card consistency.
 *
 * Each topic file declares `cards: [{id, label, difficulty?}]` in
 * frontmatter and `<SkillReview.Card id="X">` JSX blocks in body.
 * The two lists must match 1:1: every frontmatter card has a
 * matching body block, and every body block's id appears in
 * frontmatter. Mismatches indicate authoring drift — frontmatter
 * carries metadata used by the resolver and Spec page; body
 * carries the actual prompt + answer content. Drift breaks the
 * registry-resolution contract.
 *
 * Severity: ERROR (build-time fail). Authors fix by aligning the
 * two lists.
 *
 * Implementation note: the topic extractor (Batch 3 Task 10)
 * already silently skips body blocks whose id is not declared in
 * frontmatter. PRA-2 makes that drift LOUD with a build error +
 * remediation guidance.
 */
export function checkPRA2(index: PedagogyIndex, sink: FindingSink): void {
  // Group cards by topic_id.
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

    // (A) Frontmatter declares card not present in body.
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

    // (B) Body has SkillReview.Card not declared in frontmatter.
    for (const id of inBody) {
      if (!declared.has(id)) {
        sink.errors.push({
          severity: "ERROR",
          code: "PRA-2",
          message: `PRA-2: Topic "${topic.id}" body has <SkillReview.Card id="${id}"> but card is not declared in frontmatter cards: [] list. Resolution: add { id: "${id}", label: "..." } to the topic's frontmatter cards list, OR remove the orphan block from the body (per ADR 0079).`,
          location: { unit: topic.id, anchor: id },
        });
      }
    }
  }
}
