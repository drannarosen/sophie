import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "./ProfileContext.tsx";
import {
  type SelfAssessmentWidget,
  useSelfAssessment,
} from "./useSelfAssessment.ts";

function ProfileWrapper({ children }: { children: ReactNode }) {
  return <ProfileProvider profile='student'>{children}</ProfileProvider>;
}

function Probe({
  course = "sa-course",
  chapter = "sa-chapter",
  widget,
  id,
  initial,
}: {
  course?: string;
  chapter?: string;
  widget: SelfAssessmentWidget;
  id: string;
  initial: string | number;
}) {
  const { value, setValue, status } = useSelfAssessment(
    course,
    chapter,
    widget,
    id,
    initial
  );
  return (
    <div>
      <span data-testid='status'>{status}</span>
      <span data-testid='value'>{String(value)}</span>
      <button type='button' onClick={() => setValue("studied")}>
        toggle
      </button>
    </div>
  );
}

describe("useSelfAssessment", () => {
  it("uses a per-widget persistence key (different widgets do NOT share state under the same id)", async () => {
    // Two probes with the SAME id but different widgets must not share state.
    const { unmount } = render(
      <ProfileWrapper>
        <Probe widget='effort' id='shared' initial='' />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    await act(async () => {
      screen.getByText("toggle").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("studied")
    );
    unmount();

    // Different widget, same id — should NOT see the previous value.
    render(
      <ProfileWrapper>
        <Probe widget='comprehension' id='shared' initial='' />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    expect(screen.getByTestId("value").textContent).toBe("");
  });

  it("persists per (widget, id) across remount", async () => {
    const { unmount } = render(
      <ProfileWrapper>
        <Probe widget='effort' id='persist-1' initial='' />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("ready")
    );
    await act(async () => {
      screen.getByText("toggle").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("studied")
    );
    unmount();

    render(
      <ProfileWrapper>
        <Probe widget='effort' id='persist-1' initial='' />
      </ProfileWrapper>
    );
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("studied")
    );
  });
});
