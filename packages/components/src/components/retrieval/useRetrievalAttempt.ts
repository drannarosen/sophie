import { createPedagogyRecord } from "@sophie/core/runtime";
import type { PracticeAttempt } from "@sophie/core/schema";
import { useCallback } from "react";
import { getUserId } from "../../runtime/getUserId.ts";
import {
  type InteractiveControlProps,
  useInteractive,
} from "../../runtime/useInteractive.ts";

const SCHEMA_VERSION = "1.0.0";

export interface UseRetrievalAttemptArgs {
  course: string;
  unit: string;
  target_id: string;
  component: PracticeAttempt["component"];
}

export interface UseRetrievalAttemptReturn {
  /** Persist a new attempt; resolves once IDB confirms the write. */
  record: (
    response: string,
    self_assessment: PracticeAttempt["self_assessment"],
    latency_ms: number | null
  ) => Promise<void>;
  /** Snapshot of prior attempts on this (course, chapter, target). */
  attempts: readonly PracticeAttempt[];
  /** 1-indexed counter for the *next* attempt (attempts.length + 1). */
  attemptSeq: number;
  /** True once the underlying useInteractive has hydrated from IDB. */
  hydrated: boolean;
  /** Spread on persistence-bearing controls to gate UI on hydration. */
  controlProps: InteractiveControlProps;
}

/**
 * `useRetrievalAttempt` — shared persistence hook for the retrieval
 * family (`<RetrievalPrompt>`, `<SpacedReview>`, `<SkillReview>`).
 *
 * Wraps `useInteractive` to persist `PracticeAttempt[]` records keyed
 * by `practice-attempt:${target_id}` within the (course, chapter)
 * IndexedDB scope (per ADR 0007). Cross-tab consistency via
 * BroadcastChannel LWW (per ADR 0029). Each persisted attempt carries
 * the full `BaseRecordSchema` envelope (per ADR 0066) — `user_id` from
 * `getUserId`, `course_id` from the hook arg, timestamps via
 * `createPedagogyRecord`.
 *
 * Per the Wedge B1 design doc §4. Mutations are append-only; the array
 * grows by one record per `record(...)` call. Read-only aggregation
 * across the chapter is via the sibling `useInteractiveRange` hook
 * (consumed by `<SpacedReview>`).
 */
export function useRetrievalAttempt(
  args: UseRetrievalAttemptArgs
): UseRetrievalAttemptReturn {
  const { course, unit, target_id, component } = args;
  const componentKey = `practice-attempt:${target_id}`;

  const { value, setValue, hydrated, controlProps } = useInteractive<
    readonly PracticeAttempt[]
  >(course, unit, componentKey, []);

  const attempts = value;
  const attemptSeq = attempts.length + 1;

  const record = useCallback(
    async (
      response: string,
      self_assessment: PracticeAttempt["self_assessment"],
      latency_ms: number | null
    ) => {
      const newAttempt = createPedagogyRecord({
        user_id: getUserId(),
        course_id: course,
        state_type: "practice_attempt",
        schema_version: SCHEMA_VERSION,
        payload: {
          target_id,
          component,
          response,
          self_assessment,
          time_to_first_reveal_ms: latency_ms,
          attempt_seq: attemptSeq,
        },
      }) as PracticeAttempt;
      setValue([...attempts, newAttempt]);
    },
    [attempts, setValue, course, target_id, component, attemptSeq]
  );

  return { record, attempts, attemptSeq, hydrated, controlProps };
}
