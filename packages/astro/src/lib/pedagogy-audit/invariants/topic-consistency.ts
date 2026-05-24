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
 * concept to learn (per ADR 0079 §"PRA-2"). Both directions also
 * honor `TopicEntry.audit_overrides` per ADR 0053 (W4c D5:
 * per-card anchor only — no whole-topic wildcard).
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
    // W4c D5: per-card anchor only — see file header for the full rationale.
    const overrides = topic.audit_overrides ?? [];

    // PRA-2-grain (W4c I1): the override schema permits both Grain 1
    // (anchor omitted, whole-Unit wildcard) and Grain 2 (per-anchor)
    // shapes for any invariant, but W4c D5 locks PRA-2 to Grain 2
    // only. Without a signal, a Grain-1 PRA-2 override fails silently
    // (the suppression predicate below doesn't match it, so the
    // ERROR still fires with no clue why the override didn't take).
    // Emit a discoverability WARNING per offending entry naming the
    // grain mismatch + the two fix paths. Structural fix — making
    // AuditOverrideSchema reject the bad shape at parse time — is a
    // post-W4c follow-on (benefits from broader ADR 0053 amendment).
    for (const override of overrides) {
      if (override.invariant !== "PRA-2") continue;
      if (override.anchor !== undefined) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "PRA-2-grain",
        message: `PRA-2-grain: Topic "${topic.id}" declares an audit_overrides entry for PRA-2 with no anchor (Grain 1 / whole-topic wildcard). PRA-2 requires a per-card-id anchor per W4c D5; this override is IGNORED. Resolution: add anchor: "<card-id>" to the override entry naming the specific card whose frontmatter↔body mismatch should be suppressed, OR remove the override if it's no longer needed.`,
        location: { unit: topic.id },
      });
    }

    // Frontmatter declares card not present in body.
    for (const id of declared) {
      if (inBody.has(id)) continue;
      const suppressed = overrides.some(
        (o) => o.invariant === "PRA-2" && o.anchor === id
      );
      if (suppressed) continue;
      sink.errors.push({
        severity: "ERROR",
        code: "PRA-2",
        message: `PRA-2: Topic "${topic.id}" frontmatter declares card "${id}" but no <SkillReview.Card id="${id}"> block exists in the body. Resolution: add a <SkillReview.Card id="${id}"><SkillReview.Prompt>...</SkillReview.Prompt><SkillReview.Answer>...</SkillReview.Answer></SkillReview.Card> block, OR remove the orphan entry from the cards: list in frontmatter (per ADR 0079).`,
        location: { unit: topic.id, anchor: id },
      });
    }
  }
}
