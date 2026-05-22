import * as Collapsible from "@radix-ui/react-collapsible";
import { type ReactNode, useCallback, useId, useState } from "react";
import styles from "./RetrievalCard.module.css.js";

export type RetrievalBandToken = "retrieval" | "spaced" | "skill";

export type SelfAssessment = "got" | "partial" | "missed";

export type CardState = "collapsed" | "expanded" | "revealed" | "assessed";

export interface RetrievalCardProps {
  /**
   * Selects the left-edge color band via the `--sophie-{token}-band`
   * CSS variable (Wedge B1 retrieval-family). Bound on the root as
   * `--card-band-color`; the CSS Module consumes it.
   */
  bandToken: RetrievalBandToken;
  /** Visible button text in the collapsed trigger row. */
  triggerLabel: string;
  /** Prompt prose (slot child from the public component). */
  prompt: ReactNode;
  /** Answer prose (slot child; hidden until reveal). */
  answer: ReactNode;
  /**
   * Initial card state. Defaults to `"collapsed"`. Pass `"expanded"`
   * for Storybook stories that need an open default, `"revealed"` for
   * post-reveal snapshots, etc.
   */
  initialState?: CardState;
  onExpand?: () => void;
  onReveal?: () => void;
  onResponseChange?: (response: string) => void;
  onSelfAssess?: (assessment: SelfAssessment) => void;
}

/**
 * `<RetrievalCard>` — internal primitive that powers `<RetrievalPrompt>`,
 * `<SpacedReview>`, and `<SkillReview>`. Owns the
 * collapsed → expanded → revealed → assessed state machine, the Radix
 * `<Collapsible>` disclosure (ADR 0019), the textarea, the reveal
 * button, and the self-assess button row.
 *
 * Not a public export. Public components compose it with the right
 * `bandToken`, `triggerLabel`, slot children, and event callbacks.
 * Persistence lives outside this primitive — consumers wire
 * `onResponseChange` + `onSelfAssess` into their `useRetrievalAttempt`
 * hook to actually log the attempt. Wedge B1 design doc §5.
 */
export function RetrievalCard(props: RetrievalCardProps) {
  const {
    bandToken,
    triggerLabel,
    prompt,
    answer,
    initialState = "collapsed",
    onExpand,
    onReveal,
    onResponseChange,
    onSelfAssess,
  } = props;

  const [state, setState] = useState<CardState>(initialState);
  const [response, setResponse] = useState<string>("");
  const promptId = useId();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && state === "collapsed") {
        setState("expanded");
        onExpand?.();
      } else if (!open && state === "expanded") {
        setState("collapsed");
      }
      // When already revealed/assessed, the Collapsible still toggles
      // visually but we keep the higher state so re-opens show the
      // revealed answer + buttons. Radix's `open` is bound below from
      // our derived `isOpen` so the trigger and content stay in sync.
    },
    [state, onExpand]
  );

  const handleReveal = useCallback(() => {
    setState("revealed");
    onReveal?.();
  }, [onReveal]);

  const handleResponseChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      setResponse(next);
      onResponseChange?.(next);
    },
    [onResponseChange]
  );

  const handleSelfAssess = useCallback(
    (assessment: SelfAssessment) => {
      setState("assessed");
      onSelfAssess?.(assessment);
    },
    [onSelfAssess]
  );

  const isOpen = state !== "collapsed";
  const showAnswer = state === "revealed" || state === "assessed";

  return (
    <Collapsible.Root
      className={`${styles.card} sophie-retrieval-card`}
      open={isOpen}
      onOpenChange={handleOpenChange}
      style={
        {
          "--card-band-color": `var(--sophie-${bandToken}-band)`,
        } as React.CSSProperties
      }
    >
      <Collapsible.Trigger className={styles.trigger}>
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        <span className={styles.chevron} aria-hidden='true'>
          {isOpen ? "▾" : "▸"}
        </span>
      </Collapsible.Trigger>
      <Collapsible.Content className={styles.content}>
        <div id={promptId} className={styles.prompt}>
          {prompt}
        </div>
        <textarea
          className={styles.textarea}
          value={response}
          onChange={handleResponseChange}
          aria-describedby={promptId}
          aria-label='Your response'
          placeholder='Type your answer...'
          rows={3}
        />
        {state === "expanded" ? (
          <button
            type='button'
            className={styles.revealButton}
            onClick={handleReveal}
          >
            Reveal answer ▾
          </button>
        ) : null}
        {showAnswer ? (
          <>
            <div className={styles.answer}>{answer}</div>
            <div className={styles.selfAssess}>
              <span className={styles.selfAssessPrompt}>How did you do?</span>
              {(["got", "partial", "missed"] as const).map((rating) => (
                <button
                  key={rating}
                  type='button'
                  className={styles.selfAssessButton}
                  onClick={() => handleSelfAssess(rating)}
                  aria-pressed={state === "assessed"}
                >
                  {rating === "got"
                    ? "Got it"
                    : rating === "partial"
                      ? "Partial"
                      : "Missed it"}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
