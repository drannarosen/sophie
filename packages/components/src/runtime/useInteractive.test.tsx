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
  chapter = "test-chapter",
  keyName,
  initial,
}: {
  course?: string;
  chapter?: string;
  keyName: string;
  initial: boolean;
}) {
  const { value, setValue, status } = useInteractive(
    course,
    chapter,
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
        "hydration-chapter",
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

  it("persists value across remount within same course/profile/chapter", async () => {
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

  it("updates when a same-name BroadcastChannel from elsewhere posts a matching message", async () => {
    // Simulates a second tab: create our own BroadcastChannel with the
    // same chapter-channel name and post a message. The hook's
    // subscription should pick it up and update the local state.
    // Same-channel echo doesn't fire (browser BC API), so we don't try
    // to test that with two intra-tab instances — only cross-channel
    // (cross-tab equivalent).
    render(
      <ProfileWrapper>
        <Probe
          course='cross-tab'
          chapter='cross-chapter'
          keyName='probe:bc'
          initial={false}
        />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");

    const channelName = "sophie-cross-tab:cross-chapter";
    const compositeKey = "student:cross-chapter:probe:bc";
    const otherTab = new BroadcastChannel(channelName);
    await act(async () => {
      otherTab.postMessage({
        senderId: "another-tab-sender",
        key: compositeKey,
        value: true,
      });
      // Yield so the receiving channel's onmessage handler fires.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );
    otherTab.close();
  });
});
