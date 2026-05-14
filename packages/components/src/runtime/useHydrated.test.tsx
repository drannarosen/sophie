import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHydrated } from "./useHydrated.ts";

function Probe() {
  const hydrated = useHydrated();
  return (
    <span data-testid='probe' data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? "yes" : "no"}
    </span>
  );
}

describe("useHydrated", () => {
  it("returns true after mount (useEffect flips state)", async () => {
    render(<Probe />);
    const probe = screen.getByTestId("probe");
    // After the effect runs, the probe flips to "true". @testing-
    // library/react renders synchronously and flushes effects, but
    // `waitFor` keeps the assertion robust to scheduler timing.
    await waitFor(() => {
      expect(probe).toHaveAttribute("data-hydrated", "true");
    });
    expect(probe).toHaveTextContent("yes");
  });
});
