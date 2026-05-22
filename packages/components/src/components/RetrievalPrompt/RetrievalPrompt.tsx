import { Children, isValidElement, type ReactNode, useState } from "react";
import { RetrievalCard } from "../internal/RetrievalCard/RetrievalCard.tsx";
import { humanLabelFromTarget } from "../retrieval/humanLabel.ts";
import { useRetrievalAttempt } from "../retrieval/useRetrievalAttempt.ts";
import type { RetrievalPromptProps } from "./RetrievalPrompt.schema.ts";

const PROMPT_SLOT = "RetrievalPrompt.Prompt";
const ANSWER_SLOT = "RetrievalPrompt.Answer";

function PromptSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
PromptSlot.displayName = PROMPT_SLOT;

function AnswerSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
AnswerSlot.displayName = ANSWER_SLOT;

/**
 * `<RetrievalPrompt>` — primary in-flow recall prompt (Wedge B1).
 *
 * @example
 * ```mdx
 * <RetrievalPrompt
 *   client:load
 *   course="astr201"
 *   chapter="spoiler-alerts"
 *   target="eq:stefan-boltzmann"
 * >
 *   <RetrievalPrompt.Prompt>
 *     A star doubles its radius at fixed temperature. How does its
 *     luminosity change?
 *   </RetrievalPrompt.Prompt>
 *   <RetrievalPrompt.Answer>
 *     L goes up by 4x, since L = 4πR²σT⁴.
 *   </RetrievalPrompt.Answer>
 * </RetrievalPrompt>
 * ```
 *
 * Compound-component slots: `<RetrievalPrompt.Prompt>` (required) +
 * `<RetrievalPrompt.Answer>` (required). Compose the internal
 * `<RetrievalCard>` primitive with the amber band; logs every
 * self-assess via `useRetrievalAttempt`. Per Wedge B1 design doc §1.
 */
export function RetrievalPrompt({
  course,
  chapter,
  target,
  children,
}: RetrievalPromptProps) {
  const { record } = useRetrievalAttempt({
    course,
    chapter,
    target_id: target,
    component: "retrieval-prompt",
  });

  const [response, setResponse] = useState<string>("");
  const [expandedAt, setExpandedAt] = useState<number | null>(null);

  let promptChild: ReactNode = null;
  let answerChild: ReactNode = null;
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const displayName = (child.type as { displayName?: string }).displayName;
    if (displayName === PROMPT_SLOT) promptChild = child;
    else if (displayName === ANSWER_SLOT) answerChild = child;
  }

  // Dev-mode warning when an author omits a required slot. The
  // component still renders (the underlying <RetrievalCard> degrades
  // gracefully) so a missing slot doesn't blank the page; curriculum-CI
  // catches the authoring defect at build time. Caught in the
  // 2026-05-22 quality audit.
  if (
    (promptChild === null || answerChild === null) &&
    typeof process !== "undefined" &&
    process.env?.NODE_ENV !== "production"
  ) {
    const missing = [
      promptChild === null ? "<RetrievalPrompt.Prompt>" : null,
      answerChild === null ? "<RetrievalPrompt.Answer>" : null,
    ]
      .filter((s): s is string => s !== null)
      .join(" + ");
    console.warn(
      `[RetrievalPrompt] target="${target}" is missing required slot child(ren): ${missing}. The card renders but the experience is degraded. Resolution: add the missing slot(s) inside <RetrievalPrompt>...</RetrievalPrompt>.`
    );
  }

  return (
    <RetrievalCard
      bandToken='retrieval'
      triggerLabel={`Retrieval — ${humanLabelFromTarget(target)}`}
      prompt={promptChild}
      answer={answerChild}
      onExpand={() => setExpandedAt(Date.now())}
      onResponseChange={setResponse}
      onSelfAssess={async (assessment) => {
        const latency = expandedAt !== null ? Date.now() - expandedAt : null;
        await record(response, assessment, latency);
      }}
    />
  );
}

RetrievalPrompt.Prompt = PromptSlot;
RetrievalPrompt.Answer = AnswerSlot;
