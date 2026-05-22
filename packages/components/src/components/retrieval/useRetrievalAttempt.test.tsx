import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { useRetrievalAttempt } from "./useRetrievalAttempt.ts";

function wrapper({ children }: { children: ReactNode }) {
  return <ProfileProvider profile='student'>{children}</ProfileProvider>;
}

describe("useRetrievalAttempt", () => {
  it("hydrates to empty attempts + attemptSeq=1 for a target with no prior records", async () => {
    const { result } = renderHook(
      () =>
        useRetrievalAttempt({
          course: "ura-test-1",
          chapter: "ch1",
          target_id: "eq:stefan-boltzmann",
          component: "retrieval-prompt",
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.attempts).toEqual([]);
    expect(result.current.attemptSeq).toBe(1);
  });

  it("records an attempt; attempts grows by one and attemptSeq advances", async () => {
    const { result } = renderHook(
      () =>
        useRetrievalAttempt({
          course: "ura-test-2",
          chapter: "ch1",
          target_id: "eq:stefan-boltzmann",
          component: "retrieval-prompt",
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.record("L goes up by 4x", "got", 12_400);
    });

    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    expect(result.current.attemptSeq).toBe(2);
  });

  it("accepts null self_assessment + null latency (student dismissed)", async () => {
    const { result } = renderHook(
      () =>
        useRetrievalAttempt({
          course: "ura-test-3",
          chapter: "ch1",
          target_id: "eq:stefan-boltzmann",
          component: "retrieval-prompt",
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => {
      await result.current.record("", null, null);
    });
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    const attempt = result.current.attempts[0];
    expect(attempt?.self_assessment).toBeNull();
    expect(attempt?.time_to_first_reveal_ms).toBeNull();
    expect(attempt?.response).toBe("");
  });

  it("scopes attemptSeq per (chapter, target_id) — different target = seq 1", async () => {
    const { result } = renderHook(
      () =>
        useRetrievalAttempt({
          course: "ura-test-4",
          chapter: "ch1",
          target_id: "eq:saha-equation",
          component: "retrieval-prompt",
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.attemptSeq).toBe(1);
  });

  it("persisted attempt carries the full BaseRecord envelope", async () => {
    const { result } = renderHook(
      () =>
        useRetrievalAttempt({
          course: "astr201-sp26",
          chapter: "spoiler-alerts",
          target_id: "eq:stefan-boltzmann",
          component: "retrieval-prompt",
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => {
      await result.current.record("test response", "got", 1000);
    });
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    const attempt = result.current.attempts[0];
    expect(attempt).toMatchObject({
      state_type: "practice_attempt",
      target_id: "eq:stefan-boltzmann",
      component: "retrieval-prompt",
      response: "test response",
      self_assessment: "got",
      time_to_first_reveal_ms: 1000,
      attempt_seq: 1,
      course_id: "astr201-sp26",
      schema_version: "1.0.0",
    });
    expect(typeof attempt?.user_id).toBe("string");
    expect((attempt?.user_id ?? "").length).toBeGreaterThan(0);
    expect(attempt?.created_at).toMatch(/^\d{4}-/);
    expect(attempt?.updated_at).toMatch(/^\d{4}-/);
  });

  it("attempt_seq increments correctly across multiple records", async () => {
    const { result } = renderHook(
      () =>
        useRetrievalAttempt({
          course: "ura-test-6",
          chapter: "ch1",
          target_id: "eq:multi",
          component: "skill-review",
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.record("first", "missed", 5000);
    });
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    expect(result.current.attempts[0]?.attempt_seq).toBe(1);

    await act(async () => {
      await result.current.record("second", "partial", 4000);
    });
    await waitFor(() => expect(result.current.attempts).toHaveLength(2));
    expect(result.current.attempts[1]?.attempt_seq).toBe(2);

    await act(async () => {
      await result.current.record("third", "got", 3000);
    });
    await waitFor(() => expect(result.current.attempts).toHaveLength(3));
    expect(result.current.attempts[2]?.attempt_seq).toBe(3);
  });
});
