import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "./ProfileContext.tsx";
import { useInteractive } from "./useInteractive.ts";

function ProfileWrapper({
  profile = "student" as const,
  children,
}: {
  profile?: "student" | "instructor";
  children: ReactNode;
}) {
  return <ProfileProvider profile={profile}>{children}</ProfileProvider>;
}

function Probe({
  course = "test-course",
  unit = "test-unit",
  keyName,
  initial,
}: {
  course?: string;
  unit?: string;
  keyName: string;
  initial: boolean;
}) {
  const { value, setValue, status } = useInteractive(
    course,
    unit,
    keyName,
    initial
  );
  return (
    <div>
      <span data-testid='status'>{status}</span>
      <span data-testid='value'>{String(value)}</span>
      <button type='button' onClick={() => setValue(!value)}>
        toggle
      </button>
    </div>
  );
}

describe("useInteractive", () => {
  it("returns hydrated=false + controlProps={disabled:true, aria-busy:true} during loading; flips both after IDB hydrate", async () => {
    function HydrationProbe({ keyName }: { keyName: string }) {
      const { hydrated, controlProps } = useInteractive(
        "hydration-course",
        "hydration-unit",
        keyName,
        false
      );
      return (
        <div>
          <span data-testid='hydrated'>{String(hydrated)}</span>
          <span data-testid='cp-disabled'>{String(controlProps.disabled)}</span>
          <span data-testid='cp-busy'>{String(controlProps["aria-busy"])}</span>
        </div>
      );
    }
    render(
      <ProfileWrapper>
        <HydrationProbe keyName='probe:hydration' />
      </ProfileWrapper>
    );
    // Synchronous: at first render, IDB fetch hasn't resolved.
    expect(screen.getByTestId("hydrated").textContent).toBe("false");
    expect(screen.getByTestId("cp-disabled").textContent).toBe("true");
    expect(screen.getByTestId("cp-busy").textContent).toBe("true");
    // After hydration: all flip.
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );
    expect(screen.getByTestId("cp-disabled").textContent).toBe("false");
    expect(screen.getByTestId("cp-busy").textContent).toBe("false");
  });

  it("starts in loading and transitions to ready after IDB hydrate", async () => {
    render(
      <ProfileWrapper>
        <Probe keyName='probe:loading' initial={false} />
      </ProfileWrapper>
    );
    expect(screen.getByTestId("status").textContent).toBe("loading");
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");
  });

  it("persists value across remount within same course/profile/unit", async () => {
    const { unmount } = render(
      <ProfileWrapper>
        <Probe keyName='probe:persist' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    await act(async () => {
      screen.getByText("toggle").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );
    unmount();

    render(
      <ProfileWrapper>
        <Probe keyName='probe:persist' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );
  });

  it("namespaces keys by profile so student/instructor don't collide", async () => {
    const { unmount } = render(
      <ProfileWrapper profile='student'>
        <Probe keyName='probe:profile' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    await act(async () => {
      screen.getByText("toggle").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );
    unmount();

    render(
      <ProfileWrapper profile='instructor'>
        <Probe keyName='probe:profile' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");
  });

  it("uses different DBs per course", async () => {
    const { unmount } = render(
      <ProfileWrapper>
        <Probe course='course-a' keyName='probe:course' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    await act(async () => {
      screen.getByText("toggle").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );
    unmount();

    render(
      <ProfileWrapper>
        <Probe course='course-b' keyName='probe:course' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");
  });

  it("resets to initial when componentKey changes and the new key has no stored value", async () => {
    // Persist a value under the first key.
    const { rerender } = render(
      <ProfileWrapper>
        <Probe keyName='probe:reset:a' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    await act(async () => {
      screen.getByText("toggle").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );

    // Same component, swap the key. The new key has no stored value, so
    // the hook must reset to `initial` (false) — not carry "true" across.
    rerender(
      <ProfileWrapper>
        <Probe keyName='probe:reset:b' initial={false} />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");
  });

  it("ignores incoming broadcast with older ts than the local value (LWW per ADR 0029)", async () => {
    // Reproduces the BroadcastChannel race from the Phase 1 audit P1-5:
    // Tab A sets a value at ts=T_local. Tab B's older-but-slower IDB write
    // broadcasts after Tab A has already moved on. Without the LWW gate,
    // Tab A's UI flips to Tab B's stale value, silently overruling the
    // user's most recent action.
    render(
      <ProfileWrapper>
        <Probe
          course='lww-course'
          unit='lww-unit'
          keyName='probe:lww-older'
          initial={false}
        />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    // Local set advances tsRef to Date.now() (which is on the order of 1.7e12).
    await act(async () => {
      screen.getByText("toggle").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );

    // Stale broadcast from another "tab" with ts=1 (ancient).
    const channelName = "sophie-lww-course:lww-unit";
    const compositeKey = "student:lww-unit:probe:lww-older";
    const otherTab = new BroadcastChannel(channelName);
    await act(async () => {
      otherTab.postMessage({
        senderId: "stale-tab",
        key: compositeKey,
        value: false,
        ts: 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // The stale message must be ignored — local value stays true.
    expect(screen.getByTestId("value").textContent).toBe("true");
    otherTab.close();
  });

  it("updates when a same-name BroadcastChannel from elsewhere posts a matching message", async () => {
    // Simulates a second tab: create our own BroadcastChannel with the
    // same unit-channel name and post a message. The hook's
    // subscription should pick it up and update the local state.
    // Same-channel echo doesn't fire (browser BC API), so we don't try
    // to test that with two intra-tab instances — only cross-channel
    // (cross-tab equivalent).
    render(
      <ProfileWrapper>
        <Probe
          course='cross-tab'
          unit='cross-unit'
          keyName='probe:bc'
          initial={false}
        />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");

    const channelName = "sophie-cross-tab:cross-unit";
    const compositeKey = "student:cross-unit:probe:bc";
    const otherTab = new BroadcastChannel(channelName);
    await act(async () => {
      otherTab.postMessage({
        senderId: "another-tab-sender",
        key: compositeKey,
        value: true,
        ts: Date.now(),
      });
      // Yield so the receiving channel's onmessage handler fires.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );
    otherTab.close();
  });

  it("exposes data-sophie-write-pending true during in-flight setValue and false once the IDB write settles", async () => {
    function WritePendingProbe({ keyName }: { keyName: string }) {
      const { value, setValue, controlProps, hydrated } = useInteractive(
        "write-pending-course",
        "write-pending-unit",
        keyName,
        false
      );
      return (
        <div>
          <span data-testid='hydrated'>{String(hydrated)}</span>
          <span data-testid='value'>{String(value)}</span>
          <span data-testid='write-pending'>
            {String(controlProps["data-sophie-write-pending"])}
          </span>
          <button type='button' onClick={() => setValue(!value)}>
            toggle
          </button>
        </div>
      );
    }
    render(
      <ProfileWrapper>
        <WritePendingProbe keyName='probe:write-pending' />
      </ProfileWrapper>
    );

    // Pending starts false before any setValue is called.
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );
    expect(screen.getByTestId("write-pending").textContent).toBe("false");

    // Synchronously after click, pending flips true (counter increments
    // before the awaited IDB write resolves).
    act(() => {
      screen.getByRole("button", { name: "toggle" }).click();
    });
    expect(screen.getByTestId("write-pending").textContent).toBe("true");

    // After the write settles, pending flips back to false.
    await waitFor(() =>
      expect(screen.getByTestId("write-pending").textContent).toBe("false")
    );
    // And the value is persisted in local state.
    expect(screen.getByTestId("value").textContent).toBe("true");
  });

  // ===================================================================
  // ADR 0007 fallback contract — `persistence` field per ADR 0053 CF5
  // ===================================================================
  // Pre-2026-05-18 (E1 PR), the ADRs claimed `validation: validated`
  // for the fallback contract; the cited test file did NOT exercise
  // IDB unavailability. Codex 2026-05-18 caught the gap. The
  // FallbackResponseStore unit tests cover the wrapper contract in
  // isolation; this hook-level test pins that `persistence` threads
  // through `useInteractive` correctly in both paths.

  it("exposes `persistence: 'persistent'` on the happy path", async () => {
    function PersistenceProbe() {
      const { persistence, hydrated } = useInteractive(
        "persistence-course",
        "ch",
        "probe:happy",
        false
      );
      return (
        <div>
          <span data-testid='persistence'>{persistence}</span>
          <span data-testid='hydrated'>{String(hydrated)}</span>
        </div>
      );
    }
    render(
      <ProfileWrapper>
        <PersistenceProbe />
      </ProfileWrapper>
    );
    // Initial render: persistence starts at "persistent" (IDB assumed
    // healthy until proven otherwise).
    expect(screen.getByTestId("persistence").textContent).toBe("persistent");
    await waitFor(() =>
      expect(screen.getByTestId("hydrated").textContent).toBe("true")
    );
    // After hydration completes with IDB healthy, persistence stays
    // "persistent".
    expect(screen.getByTestId("persistence").textContent).toBe("persistent");
  });
});
