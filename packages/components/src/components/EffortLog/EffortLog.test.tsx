import { act, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { EffortLog } from "./EffortLog.tsx";

function withProfile(node: ReactNode) {
  return <ProfileProvider profile='student'>{node}</ProfileProvider>;
}

describe("<EffortLog>", () => {
  it("renders the prompt and 3 effort options (skimmed / read / studied)", () => {
    render(
      withProfile(
        <EffortLog
          course='c'
          unit='ch'
          id='el-default'
          prompt='How thoroughly did you engage with this section?'
        />
      )
    );
    expect(screen.getByText(/How thoroughly/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /skimmed/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^read/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /studied/i })).toBeInTheDocument();
  });

  it("starts with no option selected", async () => {
    render(
      withProfile(
        <EffortLog course='c' unit='ch' id='el-initial' prompt='How much?' />
      )
    );
    await waitFor(() => {
      for (const r of screen.getAllByRole("radio")) {
        expect(r).not.toBeChecked();
      }
    });
  });

  it("disables radios + sets aria-busy until hydration", () => {
    render(
      withProfile(
        <EffortLog course='c' unit='ch' id='el-loading' prompt='How much?' />
      )
    );
    for (const r of screen.getAllByRole("radio")) {
      expect(r).toBeDisabled();
      expect(r).toHaveAttribute("aria-busy", "true");
    }
  });

  it("persists chosen value across remount", async () => {
    const { unmount } = render(
      withProfile(
        <EffortLog course='c' unit='ch' id='el-persist' prompt='How much?' />
      )
    );
    const studied = await screen.findByRole("radio", { name: /studied/i });
    await waitFor(() => expect(studied).not.toBeDisabled());
    await act(async () => {
      studied.click();
    });
    expect(studied).toBeChecked();
    unmount();

    render(
      withProfile(
        <EffortLog course='c' unit='ch' id='el-persist' prompt='How much?' />
      )
    );
    await waitFor(async () =>
      expect(
        await screen.findByRole("radio", { name: /studied/i })
      ).toBeChecked()
    );
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      withProfile(
        <EffortLog course='c' unit='ch' id='el-axe' prompt='How much?' />
      )
    );
    await waitFor(() =>
      expect(screen.getAllByRole("radio")[0]).not.toBeDisabled()
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
