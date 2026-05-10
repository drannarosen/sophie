import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "./ProfileContext.tsx";
import { SophieConfigProvider } from "./SophieConfig.tsx";
import { useInteractive } from "./useInteractive.ts";

function Wrapper({
  course = "test-course",
  chapter = "test-chapter",
  profile = "student" as const,
  children,
}: {
  course?: string;
  chapter?: string;
  profile?: "student" | "instructor";
  children: ReactNode;
}) {
  return (
    <SophieConfigProvider course={course} chapter={chapter}>
      <ProfileProvider profile={profile}>{children}</ProfileProvider>
    </SophieConfigProvider>
  );
}

function Probe({ keyName, initial }: { keyName: string; initial: boolean }) {
  const { value, setValue, status } = useInteractive(keyName, initial);
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
  it("starts in loading and transitions to ready after IDB hydrate", async () => {
    render(
      <Wrapper>
        <Probe keyName='probe:loading' initial={false} />
      </Wrapper>
    );
    expect(screen.getByTestId("status").textContent).toBe("loading");
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");
  });

  it("persists value across remount within same course/profile/chapter", async () => {
    const { unmount } = render(
      <Wrapper>
        <Probe keyName='probe:persist' initial={false} />
      </Wrapper>
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
      <Wrapper>
        <Probe keyName='probe:persist' initial={false} />
      </Wrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("true")
    );
  });

  it("namespaces keys by profile so student/instructor don't collide", async () => {
    const { unmount } = render(
      <Wrapper profile='student'>
        <Probe keyName='probe:profile' initial={false} />
      </Wrapper>
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
      <Wrapper profile='instructor'>
        <Probe keyName='probe:profile' initial={false} />
      </Wrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");
  });

  it("uses different DBs per course", async () => {
    const { unmount } = render(
      <Wrapper course='course-a'>
        <Probe keyName='probe:course' initial={false} />
      </Wrapper>
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
      <Wrapper course='course-b'>
        <Probe keyName='probe:course' initial={false} />
      </Wrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("false");
  });
});
