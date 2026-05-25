import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Canonical test shape for a store-backed component.
 *
 * **This file is a starter template.** Copy alongside `Template.tsx`,
 * rename `Template` → `<ComponentName>`, swap the mocked module to
 * your real store, and write the RED test FIRST (TDD per the
 * superpowers `test-driven-development` skill).
 *
 * The two gate tests below are non-negotiable for every store-backed
 * component — they encode ADR 0038 Amendment 2's structural fix:
 *
 *   1. **SSR snapshot is bare children.** `renderToString(...)` must
 *      NOT contain post-hydration tree shapes (`<a>`, Radix wiring,
 *      etc.). Without this assertion, a regression on the
 *      `useHydrated` gate slips through the unit suite and surfaces
 *      as a React #418 hydration mismatch in packed-copy CI runs
 *      (the failure mode that motivated PR #172).
 *
 *   2. **Post-mount tree includes the full UI.** After `useEffect`
 *      flips the gate, the trigger anchor + popover / KaTeX block /
 *      etc. appear. This is the "lit" path the user actually
 *      interacts with.
 *
 * The vitest run-time mocks `./template-store.ts` before importing
 * the component so the lookup returns a fixture entry deterministically.
 */

// vi.mock auto-hoists ABOVE the `import { Template }` below.
vi.mock("./template-store.ts", () => ({
  lookupX: (name: string) => {
    if (name === "Known term") {
      return {
        name: "Known term",
        href: "/units/example-chapter/reading#known-term",
      };
    }
    return undefined;
  },
}));

import { Template } from "./Template.tsx";

describe("<Template> (store-backed component skeleton)", () => {
  it("renders bare children at SSR even when the entry resolves (useHydrated gate)", () => {
    // ADR 0038 § A2.2 — the gate forces SSR and first client render
    // to emit identical bare-children output regardless of store
    // state. Asserting on the SSR string proves the gate is wired:
    // no <a>, no popover, no Radix wiring.
    const html = renderToString(
      <Template name='Known term'>known term</Template>
    );
    expect(html).not.toMatch(/<a\b/i);
    expect(html).not.toMatch(/data-radix/i);
    expect(html).toContain("known term");
  });

  it("renders the full post-mount tree after useEffect flips the gate", async () => {
    // Post-mount: the trigger anchor appears. Real components add
    // role="link" wrapping prose + popover content; the skeleton
    // ships a minimal <a> so the gate test is the meaningful surface.
    render(<Template name='Known term'>known term</Template>);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /known term/i });
      expect(link).toHaveAttribute(
        "href",
        "/units/example-chapter/reading#known-term"
      );
      expect(link).toHaveAttribute("data-react-hydrated", "true");
    });
  });
});
