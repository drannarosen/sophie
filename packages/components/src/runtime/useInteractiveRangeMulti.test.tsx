import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "./ProfileContext.tsx";
import { useInteractive } from "./useInteractive.ts";
import { useInteractiveRangeMulti } from "./useInteractiveRangeMulti.ts";

function ProfileWrapper({ children }: { children: ReactNode }) {
  return <ProfileProvider profile='student'>{children}</ProfileProvider>;
}

function MultiProbe({
  course,
  units,
  keyPrefix,
}: {
  course: string;
  units: readonly string[];
  keyPrefix?: string;
}) {
  const { values, status, hydrated } = useInteractiveRangeMulti<number>(
    course,
    units,
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
      <span data-testid={`writer-${unit}-${keyName}-value`}>
        {String(value)}
      </span>
      <span data-testid={`writer-${unit}-${keyName}-hydrated`}>
        {String(hydrated)}
      </span>
      <button type='button' onClick={() => setValue(value + 1)}>
        bump-{unit}-{keyName}
      </button>
    </div>
  );
}

describe("useInteractiveRangeMulti", () => {
  it("hydrates to {} for an empty units array (no I/O)", async () => {
    render(
      <ProfileWrapper>
        <MultiProbe course='multi-empty-list' units={[]} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("values").textContent).toBe("{}");
  });

  it("merges records across multiple units into one values map", async () => {
    function SeededScene() {
      return (
        <>
          <WriterProbe
            course='multi-merge'
            unit='ch-a'
            keyName='practice-attempt:logs'
            initial={1}
          />
          <WriterProbe
            course='multi-merge'
            unit='ch-b'
            keyName='practice-attempt:trig'
            initial={2}
          />
          <MultiProbe
            course='multi-merge'
            units={["ch-a", "ch-b"]}
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
        screen.getByTestId("writer-ch-a-practice-attempt:logs-hydrated")
          .textContent
      ).toBe("true")
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("writer-ch-b-practice-attempt:trig-hydrated")
          .textContent
      ).toBe("true")
    );
    await act(async () => {
      screen.getByText("bump-ch-a-practice-attempt:logs").click();
      screen.getByText("bump-ch-b-practice-attempt:trig").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
    const values = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(values["practice-attempt:logs"]).toBe(2);
    expect(values["practice-attempt:trig"]).toBe(3);
  });

  it("excludes units not in the list", async () => {
    function SeededScene() {
      return (
        <>
          <WriterProbe
            course='multi-exclude'
            unit='ch-a'
            keyName='k'
            initial={1}
          />
          <WriterProbe
            course='multi-exclude'
            unit='ch-c'
            keyName='k'
            initial={99}
          />
          <MultiProbe course='multi-exclude' units={["ch-a"]} />
        </>
      );
    }
    render(
      <ProfileWrapper>
        <SeededScene />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("writer-ch-a-k-hydrated").textContent).toBe(
        "true"
      )
    );
    await act(async () => {
      screen.getByText("bump-ch-a-k").click();
      screen.getByText("bump-ch-c-k").click();
    });
    // The multi probe sees ch-a's key only; ch-c excluded.
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1")
    );
    const values = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(values.k).toBe(2);
  });

  it("subscribes to broadcast updates from every listed unit", async () => {
    function Scene() {
      return (
        <>
          <MultiProbe
            course='multi-broadcast'
            units={["ch-a", "ch-b"]}
            keyPrefix='k:'
          />
          <WriterProbe
            course='multi-broadcast'
            unit='ch-b'
            keyName='k:x'
            initial={100}
          />
        </>
      );
    }
    render(
      <ProfileWrapper>
        <Scene />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("writer-ch-b-k:x-hydrated").textContent).toBe(
        "true"
      )
    );
    // Multi probe hydrated empty (no records seeded at mount time).
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );
    // Writer's bump triggers a broadcast on ch-b's channel.
    await act(async () => {
      screen.getByText("bump-ch-b-k:x").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1")
    );
    const values = JSON.parse(
      screen.getByTestId("values").textContent ?? "{}"
    ) as Record<string, number>;
    expect(values["k:x"]).toBe(101);
  });
});
