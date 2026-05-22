import { Children, isValidElement, type ReactNode, useState } from "react";
import { RetrievalCard } from "../internal/RetrievalCard/RetrievalCard.tsx";
import { humanLabelFromTarget } from "../retrieval/humanLabel.ts";
import { useRetrievalAttempt } from "../retrieval/useRetrievalAttempt.ts";
import styles from "./SkillReview.module.css.js";
import type { SkillReviewProps } from "./SkillReview.schema.ts";

const PROMPT_SLOT = "SkillReview.Prompt";
const ANSWER_SLOT = "SkillReview.Answer";
const REVIEW_MORE_SLOT = "SkillReview.ReviewMore";

const LIBRARY_PLACEHOLDER =
  "Topic refresher available once the Library room ships — see ADR 0076.";

function PromptSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
PromptSlot.displayName = PROMPT_SLOT;

function AnswerSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
AnswerSlot.displayName = ANSWER_SLOT;

function ReviewMoreSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
ReviewMoreSlot.displayName = REVIEW_MORE_SLOT;

/**
 * `<SkillReview>` — inline prereq-bridge prompt (Wedge B1).
 *
 * @example
 * ```mdx
 * {/* Explicit form — works in Wedge B1 *\/}
 * <SkillReview
 *   client:load
 *   course="astr201"
 *   chapter="spoiler-alerts"
 *   target="topic:exponents"
 * >
 *   <SkillReview.Prompt>Quick check: what is 10³?</SkillReview.Prompt>
 *   <SkillReview.Answer>1000.</SkillReview.Answer>
 * </SkillReview>
 *
 * {/* Self-closing form — auto-resolves from topic registry (Wedge C) *\/}
 * <SkillReview course="astr201" chapter="ch1" target="topic:logarithms" />
 * ```
 *
 * Composes the internal <RetrievalCard> primitive with the violet
 * left-band; logs every self-assess to practice_attempt via
 * useRetrievalAttempt. When slot children are absent, renders a
 * placeholder pointing at the eventual Library room (Wedge C / ADR 0076).
 */
export function SkillReview({
  course,
  chapter,
  target,
  children,
}: SkillReviewProps) {
  const { record } = useRetrievalAttempt({
    course,
    chapter,
    target_id: target,
    component: "skill-review",
  });

  const [response, setResponse] = useState<string>("");
  const [expandedAt, setExpandedAt] = useState<number | null>(null);

  let promptChild: ReactNode = null;
  let answerChild: ReactNode = null;
  let reviewMoreChild: ReactNode = null;
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const displayName = (child.type as { displayName?: string }).displayName;
    if (displayName === PROMPT_SLOT) promptChild = child;
    else if (displayName === ANSWER_SLOT) answerChild = child;
    else if (displayName === REVIEW_MORE_SLOT) reviewMoreChild = child;
  }

  const hasExplicitContent = promptChild !== null && answerChild !== null;
  // Surface a dev-mode warning when an author supplies one of the two
  // explicit slots but not the other: the partial content would silently
  // disappear behind the placeholder render-path. Caught in the
  // 2026-05-22 quality audit. Production builds stay silent (the
  // curriculum-CI extractor flags missing required slots at build time).
  if (
    (promptChild !== null) !== (answerChild !== null) &&
    typeof process !== "undefined" &&
    process.env?.NODE_ENV !== "production"
  ) {
    console.warn(
      `[SkillReview] target="${target}" was authored with only one of <SkillReview.Prompt> / <SkillReview.Answer>; both are required for the explicit-content render path. The partial content has been replaced with the Library-room placeholder. Resolution: add the missing slot, or remove both for the placeholder-only form.`
    );
  }

  // B1 fallback: when neither explicit slots nor Library registry are
  // available (Wedge C unbuilt), surface a quiet placeholder + optional
  // author-supplied <ReviewMore> link. Don't render the full RetrievalCard
  // because there's nothing to prompt yet.
  if (!hasExplicitContent) {
    return (
      <aside
        className={`${styles.placeholder} sophie-skill-review-placeholder`}
        aria-label={`Skill review — ${humanLabelFromTarget(target)}`}
      >
        <p className={styles.placeholderText}>{LIBRARY_PLACEHOLDER}</p>
        {reviewMoreChild !== null ? (
          <div className={styles.reviewMore}>{reviewMoreChild}</div>
        ) : null}
      </aside>
    );
  }

  return (
    <RetrievalCard
      bandToken='skill'
      triggerLabel={`Refresher — ${humanLabelFromTarget(target)}`}
      prompt={promptChild}
      answer={
        <>
          {answerChild}
          {reviewMoreChild !== null ? (
            <div className={styles.reviewMore}>{reviewMoreChild}</div>
          ) : null}
        </>
      }
      onExpand={() => setExpandedAt(Date.now())}
      onResponseChange={setResponse}
      onSelfAssess={async (assessment) => {
        const latency = expandedAt !== null ? Date.now() - expandedAt : null;
        await record(response, assessment, latency);
      }}
    />
  );
}

SkillReview.Prompt = PromptSlot;
SkillReview.Answer = AnswerSlot;
SkillReview.ReviewMore = ReviewMoreSlot;
