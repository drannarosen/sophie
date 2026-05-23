import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "./ProfileContext.tsx";
import { useInteractive } from "./useInteractive.ts";
import { useInteractiveRange } from "./useInteractiveRange.ts";

function ProfileWrapper({ children }: { children: ReactNode }) {
  return <ProfileProvider profile='student'>{children}</ProfileProvider>;
}

function RangeProbe({
  course,
  unit,
  keyPrefix,
}: {
  course: string;
  unit: string;
  keyPrefix?: string;
}) {
  const { values, status, hydrated } = useInteractiveRange<number>(
    course,
    unit,
    keyPrefix
  );
  return (
    <div>
      <span data-testid='status'>{status}</span>
      <span data-testid='hydrated'>{String(hydrated)}</span>
      <span data-testid='count'>{Object.keys(values).length}</span>
      <span data-testid='values'>{JSON.stringify(values)}</span>
    </div>
  );
}

/** Writer probe that uses useInteractive to seed values into the store. */
function WriterProbe({
  course,
  unit,
  keyName,
  initial,
}: {
  course: string;
  unit: string;
  keyName: string;
  initial: number;
}) {
  const { value, setValue, hydrated } = useInteractive<number>(
    course,
    unit,
    keyName,
    initial
  );
  return (
    <div>
      <span data-testid={`writer-${keyName}-value`}>{String(value)}</span>
      <span data-testid={`writer-${keyName}-hydrated`}>{String(hydrated)}</span>
      <button type='button' onClick={() => setValue(value + 1)}>
        bump-{keyName}
      </button>
    </div>
  );
}

describe("useInteractiveRange", () => {
  it("hydrates to {} for a unit with no records", async () => {
    render(
      <ProfileWrapper>
        <RangeProbe course='range-empty' unit='ch1' />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("values").textContent).toBe("{}");
  });

  it("hydrates with all matching records for the unit (no keyPrefix)", async () => {
    // Seed via two writer probes that share the same (course, unit)
    // — they'll write through useInteractive, which uses the same store
    // cache as useInteractiveRange.
    function SeededScene() {
      return (
        <>
          <WriterProbe
            course='range-seeded'
            unit='ch1'
            keyName='k1'
            initial={10}
          />
          <WriterProbe
            course='range-seeded'
            unit='ch1'
            keyName='k2'
            initial={20}
          />
          <RangeProbe course='range-seeded' unit='ch1' />
        </>
      );
    }
    render(
      <ProfileWrapper>
        <SeededScene />
      </ProfileWrapper>
    );
    // Wait for the writers to hydrate (which means the store knows the
    // initial values via in-flight defaults; but useInteractive doesn't
    // *write* on hydrate — it only sets local state from disk).
    // To force a real write, bump each once.
    await waitFor(() =>
      expect(screen.getByTestId("writer-k1-hydrated").textContent).toBe("true")
    );
    await waitFor(() =>
      expect(screen.getByTestId("writer-k2-hydrated").textContent).toBe("true")
    );
    await act(async () => {
      screen.getByText("bump-k1").click();
      screen.getByText("bump-k2").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("writer-k1-value").textContent).toBe("11")
    );
    await waitFor(() =>
      expect(screen.getByTestId("writer-k2-value").textContent).toBe("21")
    );
    // The Range probe hydrates *first*, before the writes — but the
    // broadcast subscription should pick up the post-bump values.
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
    const values = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(values.k1).toBe(11);
    expect(values.k2).toBe(21);
  });

  it("filters by keyPrefix", async () => {
    function SeededScene() {
      return (
        <>
          <WriterProbe
            course='range-prefix'
            unit='ch1'
            keyName='practice-attempt:eq:sb'
            initial={1}
          />
          <WriterProbe
            course='range-prefix'
            unit='ch1'
            keyName='practice-attempt:eq:saha'
            initial={2}
          />
          <WriterProbe
            course='range-prefix'
            unit='ch1'
            keyName='predict:p1:answer'
            initial={99}
          />
          <RangeProbe
            course='range-prefix'
            unit='ch1'
            keyPrefix='practice-attempt:'
          />
        </>
      );
    }
    render(
      <ProfileWrapper>
        <SeededScene />
      </ProfileWrapper>
    );
    // Bump each writer to actually persist a value with a real ts.
    await waitFor(() =>
      expect(
        screen.getByTestId("writer-practice-attempt:eq:sb-hydrated").textContent
      ).toBe("true")
    );
    await act(async () => {
      screen.getByText("bump-practice-attempt:eq:sb").click();
      screen.getByText("bump-practice-attempt:eq:saha").click();
      screen.getByText("bump-predict:p1:answer").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
    const values = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(values["practice-attempt:eq:sb"]).toBe(2);
    expect(values["practice-attempt:eq:saha"]).toBe(3);
    expect(values["predict:p1:answer"]).toBeUndefined();
  });

  it("updates on incoming broadcast for a matching key (cross-tab simulation)", async () => {
    render(
      <ProfileWrapper>
        <RangeProbe
          course='range-bc'
          unit='ch1'
          keyPrefix='practice-attempt:'
        />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );

    const channelName = "sophie-range-bc:ch1";
    const compositeKey = "student:ch1:practice-attempt:eq:sb";
    const otherTab = new BroadcastChannel(channelName);
    await act(async () => {
      otherTab.postMessage({
        senderId: "other-tab-1",
        key: compositeKey,
        value: 42,
        ts: Date.now(),
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1")
    );
    const values = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(values["practice-attempt:eq:sb"]).toBe(42);
    otherTab.close();
  });

  it("ignores broadcasts whose key falls outside the prefix scope", async () => {
    render(
      <ProfileWrapper>
        <RangeProbe
          course='range-bc-scope'
          unit='ch1'
          keyPrefix='practice-attempt:'
        />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );

    const channelName = "sophie-range-bc-scope:ch1";
    const compositeKey = "student:ch1:predict:p1:answer";
    const otherTab = new BroadcastChannel(channelName);
    await act(async () => {
      otherTab.postMessage({
        senderId: "other-tab-2",
        key: compositeKey,
        value: 999,
        ts: Date.now(),
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    // No match → count stays 0.
    expect(screen.getByTestId("count").textContent).toBe("0");
    otherTab.close();
  });

  it("LWW gate: ignores broadcast whose ts is older than the per-key prior ts", async () => {
    function SeededScene() {
      return (
        <>
          <WriterProbe
            course='range-lww'
            unit='ch1'
            keyName='practice-attempt:eq:sb'
            initial={5}
          />
          <RangeProbe
            course='range-lww'
            unit='ch1'
            keyPrefix='practice-attempt:'
          />
        </>
      );
    }
    render(
      <ProfileWrapper>
        <SeededScene />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("writer-practice-attempt:eq:sb-hydrated").textContent
      ).toBe("true")
    );
    await act(async () => {
      screen.getByText("bump-practice-attempt:eq:sb").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1")
    );
    const currentValues = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(currentValues["practice-attempt:eq:sb"]).toBe(6);

    // Ancient broadcast with ts=1 → must be ignored.
    const channelName = "sophie-range-lww:ch1";
    const compositeKey = "student:ch1:practice-attempt:eq:sb";
    const otherTab = new BroadcastChannel(channelName);
    await act(async () => {
      otherTab.postMessage({
        senderId: "stale-tab",
        key: compositeKey,
        value: 0,
        ts: 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const stillValues = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(stillValues["practice-attempt:eq:sb"]).toBe(6);
    otherTab.close();
  });
});
