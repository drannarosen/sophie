import type {
  ArtifactEntry,
  SectionEntry,
  UnitEntry,
} from "@sophie/core/schema";
import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __setArtifacts,
  artifactStore,
} from "../../runtime/artifacts-store.ts";
import { __setSections, sectionStore } from "../../runtime/sections-store.ts";
import { __setUnits, unitStore } from "../../runtime/units-store.ts";
import { ChapterRef } from "./ChapterRef.tsx";

/**
 * Unit tests for `<ChapterRef>` (W2/D3 graduation of PR-C4 spec).
 *
 * HoverCard's open-on-hover/focus interaction model isn't reliably
 * testable in JSDOM (Radix listens for pointer events that JSDOM
 * doesn't fully synthesize); the popover-open path is covered by
 * e2e in a real browser. Here we verify the trigger structure,
 * render-mode branching, fallback behavior, and accessibility on
 * both the closed-state DOM and (for U3/U4) the popover content.
 *
 * Per W2 design D3: ChapterRef now reads via
 * `artifactStore → unitStore → sectionStore`. Seed all three stores
 * via `__setArtifacts` / `__setUnits` / `__setSections` in `beforeEach`.
 */

const hydrostaticArtifact: ArtifactEntry = {
  id: "hydrostatic-equilibrium",
  type: "reading",
  scope: "unit",
  title: "Hydrostatic Equilibrium — reading",
  source_path:
    "src/content/sections/stellar-structure/units/hydrostatic-equilibrium/reading.mdx",
  references: {},
  section_id: "stellar-structure",
  unit_id: "hydrostatic-equilibrium",
};

const radiativeArtifact: ArtifactEntry = {
  id: "radiative-transfer",
  type: "reading",
  scope: "unit",
  title: "Radiative Transfer — reading",
  source_path:
    "src/content/sections/stellar-structure/units/radiative-transfer/reading.mdx",
  references: {},
  section_id: "stellar-structure",
  unit_id: "radiative-transfer",
};

const hydrostaticUnit: UnitEntry = {
  id: "hydrostatic-equilibrium",
  type: "lecture",
  title: "Hydrostatic Equilibrium",
  order: 1,
  prereqs: [],
  section_id: "stellar-structure",
  chapter: "hydrostatic-equilibrium",
  status: "stable",
  description: "How a star's pressure gradient balances gravity.",
};

const radiativeUnit: UnitEntry = {
  id: "radiative-transfer",
  type: "lecture",
  title: "Radiative Transfer",
  order: 2,
  prereqs: [],
  section_id: "stellar-structure",
  chapter: "radiative-transfer",
  status: "stable",
  // No description — exercises U4 (popover skips description line).
};

const stellarStructure: SectionEntry = {
  type: "module",
  slug: "stellar-structure",
  title: "Stellar Structure",
  order: 1,
  description: "Mechanical, energetic, and radiative balance inside stars.",
};

describe("<ChapterRef>", () => {
  beforeEach(() => {
    __setArtifacts([hydrostaticArtifact, radiativeArtifact]);
    __setUnits([hydrostaticUnit, radiativeUnit]);
    __setSections([stellarStructure]);
  });

  // U1 — self-closing form renders unit title as link text.
  it("renders <a href='/units/X/reading'> with the unit title as link text (self-closing)", () => {
    render(<ChapterRef chapter='hydrostatic-equilibrium' />);
    const link = screen.getByRole("link", { name: /hydrostatic equilibrium/i });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(
      "/units/hydrostatic-equilibrium/reading"
    );
    expect(link).toHaveTextContent("Hydrostatic Equilibrium");
  });

  // U2 — children-form renders children verbatim.
  it("renders children verbatim when provided (children mode)", () => {
    render(
      <ChapterRef chapter='hydrostatic-equilibrium'>
        the pressure-gravity balance
      </ChapterRef>
    );
    const link = screen.getByRole("link", {
      name: /the pressure-gravity balance/i,
    });
    expect(link).toHaveTextContent("the pressure-gravity balance");
    expect(link).not.toHaveTextContent("Hydrostatic Equilibrium");
  });

  // U3 — popover wire-through (section breadcrumb + unit title + description).
  it("looks up the artifact → unit → section chain for the popover (wire-through)", () => {
    render(<ChapterRef chapter='hydrostatic-equilibrium' />);
    const artifact = artifactStore.lookup("hydrostatic-equilibrium");
    const unitId =
      artifact && artifact.scope === "unit" ? artifact.unit_id : "";
    const unit = unitStore.lookup(unitId);
    const section = sectionStore.lookup(unit?.section_id ?? "");
    expect(artifact?.scope).toBe("unit");
    expect(unit?.title).toBe("Hydrostatic Equilibrium");
    expect(unit?.description).toBe(
      "How a star's pressure gradient balances gravity."
    );
    expect(section?.title).toBe("Stellar Structure");
  });

  // U4 — unit without a description: the popover should not emit an
  // empty description paragraph.
  it("treats absent unit description as 'skip the description line'", () => {
    const unit = unitStore.lookup("radiative-transfer");
    expect(unit?.description).toBeUndefined();
    render(<ChapterRef chapter='radiative-transfer' />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  // U5 — missing artifact: bare-render children (or chapter) + dev warn.
  describe("miss fallback (unknown chapter)", () => {
    it("renders bare children when artifact not in index", () => {
      render(<ChapterRef chapter='does-not-exist'>fallback prose</ChapterRef>);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("fallback prose")).toBeInTheDocument();
    });

    it("renders the chapter prop itself when no children are provided", () => {
      render(<ChapterRef chapter='does-not-exist' />);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("does-not-exist")).toBeInTheDocument();
    });

    it("warns in dev when the artifact is missing", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<ChapterRef chapter='does-not-exist'>fake</ChapterRef>);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/chapterref.*does-not-exist.*bare prose/i)
      );
      warn.mockRestore();
    });
  });

  // Phase 1.5 class fix (2026-05-25). Same SSR-store-empty mismatch
  // as the other store-gated inline refs: packed-copy consumers
  // populate artifact/unit/section stores AFTER island SSR. Without a
  // gate, SSR emits bare children while client renders the full
  // <a class="trigger"> → React #418. Gating render on `useHydrated()`
  // defends the class.
  describe("hydration gate", () => {
    it("renders only the fallback at SSR even when chapter resolves", () => {
      const html = renderToString(
        <ChapterRef chapter='hydrostatic-equilibrium'>
          the pressure-gravity balance
        </ChapterRef>
      );
      expect(html).not.toMatch(/<a\b/i);
      expect(html).not.toMatch(/data-radix/i);
      expect(html).toContain("the pressure-gravity balance");
    });

    it("self-closing form: SSR emits the chapter slug as bare text", () => {
      const html = renderToString(
        <ChapterRef chapter='hydrostatic-equilibrium' />
      );
      expect(html).not.toMatch(/<a\b/i);
      expect(html).toContain("hydrostatic-equilibrium");
    });
  });

  // U6 — hydration signal.
  describe("hydration signal (item #10 lock-in)", () => {
    it("sets data-react-hydrated=true on the trigger after mount", async () => {
      render(<ChapterRef chapter='hydrostatic-equilibrium' />);
      const link = screen.getByRole("link");
      await waitFor(() => {
        expect(link).toHaveAttribute("data-react-hydrated", "true");
      });
    });
  });

  // U7 — axe-clean (closed state).
  describe("accessibility (closed state)", () => {
    it("is axe-clean for the self-closing form", async () => {
      const { container } = render(
        <ChapterRef chapter='hydrostatic-equilibrium' />
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it("is axe-clean for the children form", async () => {
      const { container } = render(
        <ChapterRef chapter='hydrostatic-equilibrium'>
          the pressure-gravity balance
        </ChapterRef>
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it("is axe-clean for the miss-fallback bare-prose form", async () => {
      const { container } = render(
        <ChapterRef chapter='does-not-exist'>fallback</ChapterRef>
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });
});
